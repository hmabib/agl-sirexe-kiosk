import { promises as fs } from "fs";
import path from "path";
import { GoogleGenAI, Modality, type Content, type Part } from "@google/genai";
import { AGL_SYSTEM_PROMPT, VISION_VOICE_PROMPT } from "./prompt";
import { KNOWLEDGE_FACTS } from "./content";
import { AGL_TOOLS, OPENAI_TOOLS } from "./ai-tools";
import { parseToolAction, type MaterialAction } from "./actions";

export const GEMINI_TEXT_DEFAULT=process.env.GEMINI_MODEL||"gemini-3.8-flash";
export const GEMINI_FALLBACKS=[GEMINI_TEXT_DEFAULT,"gemini-flash-latest"];
export const GEMINI_LIVE_MODEL=process.env.GEMINI_LIVE_MODEL||"gemini-3.8-live";
export const GEMINI_TTS_MODEL=process.env.GEMINI_TTS_MODEL||"gemini-3.8-flash-tts";
export const OPENAI_TEXT_MODEL=process.env.OPENAI_TEXT_MODEL||"gpt-5.4-mini";
export const OPENAI_REALTIME_MODEL=process.env.OPENAI_REALTIME_MODEL||"gpt-realtime-2.1-mini";
export const GEMINI_IMAGE_MODEL=process.env.GEMINI_IMAGE_MODEL||"gemini-2.5-flash-image";
export function resolveKey(){const key=(process.env.GEMINI_API_KEY||"").trim();return {key,provider:key?"gemini":"none"};}
let knowledgeCache:string|null=null;
export async function getKnowledge(){if(knowledgeCache!==null)return knowledgeCache;let docs="";try{const dir=path.join(process.cwd(),"knowledge");for(const f of (await fs.readdir(dir)).filter(f=>f.endsWith(".md")).slice(0,12))docs+=`\n--- ${f} ---\n${(await fs.readFile(path.join(dir,f),"utf8")).slice(0,6000)}`;}catch{}knowledgeCache=KNOWLEDGE_FACTS+docs.slice(0,16000);return knowledgeCache;}

export interface ChatTurn {role:"user"|"ai";text:string}
export interface ReplyOptions {message:string;context?:unknown;image?:string;lang?:string;modelOverride?:string;voice?:boolean;history?:ChatTurn[];deepThink?:boolean}
export interface ReplyResult {reply:string;provider:string;model:string;actions:MaterialAction[];degraded?:boolean}
function unavailable(lang?:string):ReplyResult{return {reply:lang==="en"?"Lara is temporarily unavailable. You can still explore Mining, display a corridor or prepare an appointment using the kiosk.":"Lara est momentanément indisponible. Vous pouvez continuer à explorer le Mining, afficher un corridor ou préparer un rendez-vous depuis la borne.",provider:"offline",model:"offline",actions:[],degraded:true};}

export async function getReply(opts:ReplyOptions,onToken?:(text:string)=>void,onAction?:(action:MaterialAction)=>void):Promise<ReplyResult>{
  const {key}=resolveKey();
  const history:Content[]=(Array.isArray(opts.history)?opts.history:[]).slice(-12).filter(t=>(t.role==="user"||t.role==="ai")&&typeof t.text==="string").map(t=>({role:t.role==="ai"?"model":"user",parts:[{text:t.text.slice(0,2500)}]}));
  const parts:Part[]=[{text:`Langue de l’écran : ${opts.lang??"fr"}\nContexte écran : ${JSON.stringify(opts.context??{}).slice(0,9000)}\nDemande du visiteur : ${opts.message.slice(0,4000)}`}];
  if(opts.image&&/^data:image\/(jpeg|png);base64,/.test(opts.image)&&opts.image.length<2000000){const [prefix,data]=opts.image.split(",");parts.push({inlineData:{mimeType:prefix.includes("png")?"image/png":"image/jpeg",data}});}
  const system=AGL_SYSTEM_PROMPT+(opts.voice?"\n"+VISION_VOICE_PROMPT:"")+"\n\nDOCUMENTATION AFRICA GLOBAL LOGISTICS :\n"+await getKnowledge();

  // Gemini d’abord ; sans quota il est mis de côté et le secours OpenAI répond directement.
  if(key&&!cooling("gemini-text")){
  let quota=0,tried=0;
  const ai=new GoogleGenAI({apiKey:key});
  const requested=opts.modelOverride&&/^gemini-[a-z0-9.\-]+$/.test(opts.modelOverride)&&!opts.modelOverride.includes("live")&&!opts.modelOverride.includes("tts")?opts.modelOverride:undefined;
  for(const model of [...new Set([requested,...GEMINI_FALLBACKS].filter(Boolean) as string[])]){
    let emitted=false;tried++;
    try {
      const config={systemInstruction:system,maxOutputTokens:opts.deepThink?4000:1800,tools:[{functionDeclarations:AGL_TOOLS}],httpOptions:{timeout:25000},...(opts.deepThink?{thinkingConfig:{thinkingBudget:2048}}:{})};
      let reply="";const actions:MaterialAction[]=[];
      const stream=await ai.models.generateContentStream({model,contents:[...history,{role:"user",parts}],config});
      for await(const chunk of stream){const text=chunk.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join("")??"";if(text){reply+=text;onToken?.(text);emitted=true;}for(const call of chunk.functionCalls??[]){const action=parseToolAction(call.name,call.args);if(action){actions.push(action);onAction?.(action);}}}
      if(!reply&&actions.length){reply=opts.lang==="en"?"I’m opening the requested view for you.":"J’ouvre la vue demandée pour vous.";onToken?.(reply);}
      if(reply)return {reply,provider:"gemini",model,actions};
    } catch(e){const msg=e instanceof Error?e.message:"";if(isQuota(0,msg))quota++;console.warn("Lara upstream unavailable",model,e instanceof Error?`${e.name} ${msg.slice(0,200)}`:"unknown");if(emitted)return {reply:opts.lang==="en"?"The connection was interrupted. Please try again.":"La connexion a été interrompue. Réessayez dans un instant.",provider:"gemini",model,actions:[],degraded:true};}
  }
  if(quota&&quota===tried)cooldown.set("gemini-text",Date.now()+COOLDOWN_MS);
  }
  const backup=await openaiReply(opts,system,onToken,onAction);
  if(backup)return backup;
  const result=unavailable(opts.lang);onToken?.(result.reply);return result;
}

// Secours OpenAI (même outils, même consignes, réponse en flux) quand Gemini est indisponible.
async function openaiReply(opts:ReplyOptions,system:string,onToken?:(text:string)=>void,onAction?:(action:MaterialAction)=>void):Promise<ReplyResult|null>{
  const k=(process.env.OPENAI_API_KEY||"").trim();if(!k||cooling("openai-text"))return null;
  const text=`Langue de l’écran : ${opts.lang??"fr"}\nContexte écran : ${JSON.stringify(opts.context??{}).slice(0,9000)}\nDemande du visiteur : ${opts.message.slice(0,4000)}`;
  const image=opts.image&&/^data:image\/(jpeg|png);base64,/.test(opts.image)&&opts.image.length<2000000?opts.image:undefined;
  const messages=[{role:"system",content:system},...(Array.isArray(opts.history)?opts.history:[]).slice(-12).filter(t=>typeof t.text==="string").map(t=>({role:t.role==="ai"?"assistant":"user",content:t.text.slice(0,2500)})),{role:"user",content:image?[{type:"text",text},{type:"image_url",image_url:{url:image}}]:text}];
  let emitted=false;
  try{
    const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${k}`,"Content-Type":"application/json"},body:JSON.stringify({model:OPENAI_TEXT_MODEL,messages,tools:OPENAI_TOOLS,stream:true,max_completion_tokens:opts.deepThink?4000:1800,...(opts.deepThink?{reasoning_effort:"medium"}:{})}),signal:AbortSignal.timeout(30000)});
    if(!r.ok||!r.body){const j=await r.json().catch(()=>({}));const msg=j?.error?.message??"";if(isQuota(r.status,msg))cooldown.set("openai-text",Date.now()+COOLDOWN_MS);console.warn("Lara backup unavailable",r.status,msg.slice(0,200));return null;}
    const reader=r.body.getReader();const dec=new TextDecoder();let buf="";let reply="";
    const calls:Record<number,{name:string;args:string}>={};
    for(;;){
      const {done,value}=await reader.read();if(done)break;
      buf+=dec.decode(value,{stream:true});const lines=buf.split("\n");buf=lines.pop()??"";
      for(const line of lines){
        const data=line.replace(/^data:\s*/,"").trim();if(!data||data==="[DONE]"||!line.startsWith("data:"))continue;
        try{const d=JSON.parse(data).choices?.[0]?.delta;if(!d)continue;
          if(d.content){reply+=d.content;onToken?.(d.content);emitted=true;}
          for(const c of d.tool_calls??[]){const slot=calls[c.index]??={name:"",args:""};if(c.function?.name)slot.name+=c.function.name;if(c.function?.arguments)slot.args+=c.function.arguments;}
        }catch{/* fragment incomplet */}
      }
    }
    const actions:MaterialAction[]=[];
    for(const c of Object.values(calls)){try{const action=parseToolAction(c.name,JSON.parse(c.args||"{}"));if(action){actions.push(action);onAction?.(action);}}catch{/* arguments invalides */}}
    if(!reply&&actions.length){reply=opts.lang==="en"?"I’m opening the requested view for you.":"J’ouvre la vue demandée pour vous.";onToken?.(reply);}
    return reply?{reply,provider:"openai",model:OPENAI_TEXT_MODEL,actions}:null;
  }catch(e){console.warn("Lara backup unavailable",e instanceof Error?e.message.slice(0,200):"unknown");return emitted?{reply:opts.lang==="en"?"The connection was interrupted. Please try again.":"La connexion a été interrompue. Réessayez dans un instant.",provider:"openai",model:OPENAI_TEXT_MODEL,actions:[],degraded:true}:null;}
}
export async function getModelInfo(){const {provider}=resolveKey();return {provider,configured:provider!=="none",textModel:GEMINI_TEXT_DEFAULT,liveModel:GEMINI_LIVE_MODEL,ttsModel:GEMINI_TTS_MODEL,imageModel:GEMINI_IMAGE_MODEL,knowledge:(await getKnowledge()).length};}
export interface ImageResult {ok:boolean;image?:string;text?:string;model?:string;message?:string}
// Charte Africa Global Logistics appliquée à chaque visuel (formulée en étalonnage photo pour
// éviter cadres et textes) ; le logo officiel est composé ensuite sur la borne.
const AGL_IMAGE_STYLE="Full-bleed edge-to-edge cinematic photograph. Colour grading: deep navy-blue shadows and sky tones (#1B365F) with warm soft-gold highlights (#EED58E), premium corporate mood, realistic West African logistics context. No border, no frame, no text, no letters, no logo, no watermark. Calm, uncluttered lower third.";
const IMAGE_DEADLINE_MS=55000;
const OPENAI_IMAGE_MODEL=process.env.OPENAI_IMAGE_MODEL||"gpt-image-2.5-flare";
const FAL_IMAGE_MODEL=process.env.FAL_IMAGE_MODEL||"fal-ai/flux-2/flash";

// Modèles d’image Gemini réellement ouverts à la clé, découverts une fois par instance.
let discoveredImageModels:Promise<string[]>|null=null;
function discoverImageModels(ai:GoogleGenAI){
  discoveredImageModels??=(async()=>{
    const found:string[]=[];
    try{const pager=await ai.models.list({config:{pageSize:200}});for await(const m of pager){const name=(m.name??"").replace(/^models\//,"");if(/image/.test(name)&&!/imagen|tts|live/.test(name)&&(m.supportedActions??["generateContent"]).includes("generateContent"))found.push(name);}}
    catch(e){console.warn("Lara image models unavailable",e instanceof Error?e.message.slice(0,160):"unknown");}
    return found.sort((a,b)=>Number(a.includes("preview"))-Number(b.includes("preview"))||b.localeCompare(a,undefined,{numeric:true}));
  })();
  return discoveredImageModels;
}

// Orchestration : fournisseurs essayés dans l’ordre ; un fournisseur à court de quota ou de crédit
// est mis de côté 10 minutes pour ne pas faire attendre le visiteur.
const cooldown=new Map<string,number>();
const COOLDOWN_MS=10*60*1000;
const cooling=(id:string)=>(cooldown.get(id)??0)>Date.now();
class QuotaError extends Error{}
const isQuota=(status:number,msg:string)=>status===429||status===402||/quota|credit|billing|insufficient/i.test(msg);
type Provider={id:string;run:(prompt:string,timeout:number)=>Promise<string>};
async function toDataUrl(url:string,timeout:number){const r=await fetch(url,{signal:AbortSignal.timeout(timeout)});if(!r.ok)throw new Error(`download ${r.status}`);return `data:${r.headers.get("content-type")||"image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;}
function providers():Provider[]{
  const list:Provider[]=[];
  const openai=(process.env.OPENAI_API_KEY||"").trim();
  if(openai)list.push({id:"openai",run:async(prompt,timeout)=>{
    const r=await fetch("https://api.openai.com/v1/images/generations",{method:"POST",headers:{Authorization:`Bearer ${openai}`,"Content-Type":"application/json"},body:JSON.stringify({model:OPENAI_IMAGE_MODEL,prompt,size:"1536x1024",quality:"medium",output_format:"jpeg",output_compression:88,n:1}),signal:AbortSignal.timeout(timeout)});
    const j=await r.json().catch(()=>({}));const msg=j?.error?.message??"";
    if(!r.ok){if(isQuota(r.status,msg))throw new QuotaError(msg);throw new Error(msg||`openai ${r.status}`);}
    const b64=j?.data?.[0]?.b64_json;if(!b64)throw new Error("openai empty");return `data:image/jpeg;base64,${b64}`;
  }});
  const {key}=resolveKey();
  if(key)list.push({id:"gemini",run:async(prompt,timeout)=>{
    const ai=new GoogleGenAI({apiKey:key});const started=Date.now();
    const models=[...new Set([GEMINI_IMAGE_MODEL,...await discoverImageModels(ai)])].slice(0,3);let quota=0;
    for(const model of models){
      const left=timeout-(Date.now()-started);if(left<5000)break;
      try{const r=await ai.models.generateContent({model,contents:prompt,config:{responseModalities:[Modality.TEXT,Modality.IMAGE],httpOptions:{timeout:left}}});
        for(const p of r.candidates?.[0]?.content?.parts??[])if(p.inlineData?.data)return `data:${p.inlineData.mimeType||"image/png"};base64,${p.inlineData.data}`;}
      catch(e){const msg=e instanceof Error?e.message:"";if(isQuota(0,msg))quota++;console.warn("Lara image unavailable",model,msg.slice(0,160));}
    }
    if(quota&&quota===models.length)throw new QuotaError("gemini quota");throw new Error("gemini image failed");
  }});
  const fal=(process.env.FAL_KEY||"").trim();
  if(fal)list.push({id:"fal",run:async(prompt,timeout)=>{
    const r=await fetch(`https://fal.run/${FAL_IMAGE_MODEL}`,{method:"POST",headers:{Authorization:`Key ${fal}`,"Content-Type":"application/json"},body:JSON.stringify({prompt,image_size:"landscape_16_9",num_images:1,enable_safety_checker:true}),signal:AbortSignal.timeout(timeout)});
    const j=await r.json().catch(()=>({}));const msg=typeof j?.detail==="string"?j.detail:JSON.stringify(j?.detail??"");
    if(!r.ok){if(isQuota(r.status,msg))throw new QuotaError(msg);throw new Error(msg||`fal ${r.status}`);}
    const url=j?.images?.[0]?.url;if(!url)throw new Error("fal empty");
    // Converti en data URL côté serveur : la borne peut y composer le logo sans restriction CORS.
    return toDataUrl(url,Math.min(15000,timeout));
  }});
  return list;
}
export async function getImage(prompt:string,lang?:string):Promise<ImageResult>{
  const unavailable=lang==="en"?"Image generation temporarily unavailable.":"Génération d’image momentanément indisponible.";
  const started=Date.now();const full=`${prompt.slice(0,800)}\n\n${AGL_IMAGE_STYLE}`;
  const all=providers();
  const ready=all.filter(p=>(cooldown.get(p.id)??0)<Date.now());
  for(const [i,p] of (ready.length?ready:all).entries()){
    const left=IMAGE_DEADLINE_MS-(Date.now()-started);if(left<6000)break;
    const isLast=i===(ready.length?ready:all).length-1;
    try{const image=await p.run(full,isLast?left:Math.min(35000,left-6000));return {ok:true,image,text:"",model:p.id};}
    catch(e){if(e instanceof QuotaError)cooldown.set(p.id,Date.now()+COOLDOWN_MS);console.warn("Lara image provider unavailable",p.id,e instanceof Error?e.message.slice(0,200):"unknown");}
  }
  return {ok:false,message:unavailable};
}
