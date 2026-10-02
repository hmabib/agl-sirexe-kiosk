import { promises as fs } from "fs";
import path from "path";
import { GoogleGenAI, Modality, type Content, type Part } from "@google/genai";
import { AGL_SYSTEM_PROMPT, VISION_VOICE_PROMPT } from "./prompt";
import { KNOWLEDGE_FACTS } from "./content";
import { AGL_TOOLS } from "./ai-tools";
import { parseToolAction, type MaterialAction } from "./actions";

export const GEMINI_TEXT_DEFAULT=process.env.GEMINI_MODEL||"gemini-3.8-flash";
export const GEMINI_FALLBACKS=[GEMINI_TEXT_DEFAULT,"gemini-flash-latest"];
export const GEMINI_LIVE_MODEL=process.env.GEMINI_LIVE_MODEL||"gemini-3.8-live";
export const GEMINI_TTS_MODEL=process.env.GEMINI_TTS_MODEL||"gemini-3.8-flash-tts";
export const GEMINI_IMAGE_MODEL=process.env.GEMINI_IMAGE_MODEL||"gemini-2.5-flash-image";
export function resolveKey(){const key=(process.env.GEMINI_API_KEY||"").trim();return {key,provider:key?"gemini":"none"};}
let knowledgeCache:string|null=null;
export async function getKnowledge(){if(knowledgeCache!==null)return knowledgeCache;let docs="";try{const dir=path.join(process.cwd(),"knowledge");for(const f of (await fs.readdir(dir)).filter(f=>f.endsWith(".md")).slice(0,12))docs+=`\n--- ${f} ---\n${(await fs.readFile(path.join(dir,f),"utf8")).slice(0,6000)}`;}catch{}knowledgeCache=KNOWLEDGE_FACTS+docs.slice(0,16000);return knowledgeCache;}

export interface ChatTurn {role:"user"|"ai";text:string}
export interface ReplyOptions {message:string;context?:unknown;image?:string;lang?:string;modelOverride?:string;voice?:boolean;history?:ChatTurn[];deepThink?:boolean}
export interface ReplyResult {reply:string;provider:string;model:string;actions:MaterialAction[];degraded?:boolean}
function unavailable(lang?:string):ReplyResult{return {reply:lang==="en"?"Lara is temporarily unavailable. You can still explore Mining, display a corridor or prepare an appointment using the kiosk.":"Lara est momentanément indisponible. Vous pouvez continuer à explorer le Mining, afficher un corridor ou préparer un rendez-vous depuis la borne.",provider:"offline",model:"offline",actions:[],degraded:true};}

export async function getReply(opts:ReplyOptions,onToken?:(text:string)=>void):Promise<ReplyResult>{
  const {key}=resolveKey();if(!key){const result=unavailable(opts.lang);onToken?.(result.reply);return result;}
  const history:Content[]=(Array.isArray(opts.history)?opts.history:[]).slice(-12).filter(t=>(t.role==="user"||t.role==="ai")&&typeof t.text==="string").map(t=>({role:t.role==="ai"?"model":"user",parts:[{text:t.text.slice(0,2500)}]}));
  const parts:Part[]=[{text:`Langue de l’écran : ${opts.lang??"fr"}\nContexte écran : ${JSON.stringify(opts.context??{}).slice(0,9000)}\nDemande du visiteur : ${opts.message.slice(0,4000)}`}];
  if(opts.image&&/^data:image\/(jpeg|png);base64,/.test(opts.image)&&opts.image.length<2000000){const [prefix,data]=opts.image.split(",");parts.push({inlineData:{mimeType:prefix.includes("png")?"image/png":"image/jpeg",data}});}
  const system=AGL_SYSTEM_PROMPT+(opts.voice?"\n"+VISION_VOICE_PROMPT:"")+"\n\nDOCUMENTATION AFRICA GLOBAL LOGISTICS :\n"+await getKnowledge();

  const ai=new GoogleGenAI({apiKey:key});
  const requested=opts.modelOverride&&/^gemini-[a-z0-9.\-]+$/.test(opts.modelOverride)&&!opts.modelOverride.includes("live")&&!opts.modelOverride.includes("tts")?opts.modelOverride:undefined;
  for(const model of [...new Set([requested,...GEMINI_FALLBACKS].filter(Boolean) as string[])]){
    let emitted=false;
    try {
      const config={systemInstruction:system,maxOutputTokens:opts.deepThink?4000:1800,tools:[{functionDeclarations:AGL_TOOLS}],httpOptions:{timeout:25000},...(opts.deepThink?{thinkingConfig:{thinkingBudget:2048}}:{})};
      let reply="";const actions:MaterialAction[]=[];
      const stream=await ai.models.generateContentStream({model,contents:[...history,{role:"user",parts}],config});
      for await(const chunk of stream){const text=chunk.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join("")??"";if(text){reply+=text;onToken?.(text);emitted=true;}for(const call of chunk.functionCalls??[]){if(call.name==="generate_image"&&call.args&&typeof call.args.prompt==="string"&&call.args.prompt.trim()){const img=await getImage(call.args.prompt,opts.lang);if(img.ok&&img.image)actions.push({type:"show_image",title:typeof call.args.style==="string"?`Illustration · ${call.args.style}`:"Illustration",image:img.image,text:img.text??""});else actions.push({type:"open_studio",tab:"image",title:"Studio créatif",body:call.args.prompt.slice(0,800)});continue;}const action=parseToolAction(call.name,call.args);if(action)actions.push(action);}}
      if(!reply&&actions.length){reply=opts.lang==="en"?"I’m opening the requested view for you.":"J’ouvre la vue demandée pour vous.";onToken?.(reply);}
      if(reply)return {reply,provider:"gemini",model,actions};
    } catch(e){console.warn("Lara upstream unavailable",model,e instanceof Error?e.name:"unknown");if(emitted)return {reply:opts.lang==="en"?"The connection was interrupted. Please try again.":"La connexion a été interrompue. Réessayez dans un instant.",provider:"gemini",model,actions:[],degraded:true};}
  }
  const result=unavailable(opts.lang);onToken?.(result.reply);return result;
}
export async function getModelInfo(){const {provider}=resolveKey();return {provider,configured:provider!=="none",textModel:GEMINI_TEXT_DEFAULT,liveModel:GEMINI_LIVE_MODEL,ttsModel:GEMINI_TTS_MODEL,imageModel:GEMINI_IMAGE_MODEL,knowledge:(await getKnowledge()).length};}
export interface ImageResult {ok:boolean;image?:string;text?:string;model?:string;message?:string}
export async function getImage(prompt:string,lang?:string):Promise<ImageResult>{
  const unavailable=lang==="en"?"Image generation temporarily unavailable.":"Génération d’image momentanément indisponible.";
  const {key,provider}=resolveKey();if(!key||provider!=="gemini")return {ok:false,message:unavailable};
  const ai=new GoogleGenAI({apiKey:key});
  for(const model of [...new Set([GEMINI_IMAGE_MODEL,"gemini-2.0-flash-preview-image-generation"])]){
    try{
      const r=await ai.models.generateContent({model,contents:`${prompt.slice(0,800)}${lang?` (texte éventuel en ${lang==="en"?"anglais":"français"})`:""}`,config:{responseModalities:[Modality.TEXT,Modality.IMAGE],httpOptions:{timeout:60000}}});
      let image="";let text="";
      for(const p of r.candidates?.[0]?.content?.parts??[]){if(p.inlineData?.data)image=`data:${p.inlineData.mimeType||"image/png"};base64,${p.inlineData.data}`;else if(p.text)text+=p.text;}
      if(image)return {ok:true,image,text:text.slice(0,600),model};
    }catch(e){console.warn("Lara image unavailable",model,e instanceof Error?e.name:"unknown");}
  }
  return {ok:false,message:unavailable};
}
