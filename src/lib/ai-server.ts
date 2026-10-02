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

export async function getReply(opts:ReplyOptions,onToken?:(text:string)=>void,onAction?:(action:MaterialAction)=>void):Promise<ReplyResult>{
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
      for await(const chunk of stream){const text=chunk.candidates?.[0]?.content?.parts?.filter(p=>p.text&&!p.thought).map(p=>p.text).join("")??"";if(text){reply+=text;onToken?.(text);emitted=true;}for(const call of chunk.functionCalls??[]){const action=parseToolAction(call.name,call.args);if(action){actions.push(action);onAction?.(action);}}}
      if(!reply&&actions.length){reply=opts.lang==="en"?"I’m opening the requested view for you.":"J’ouvre la vue demandée pour vous.";onToken?.(reply);}
      if(reply)return {reply,provider:"gemini",model,actions};
    } catch(e){console.warn("Lara upstream unavailable",model,e instanceof Error?e.name:"unknown");if(emitted)return {reply:opts.lang==="en"?"The connection was interrupted. Please try again.":"La connexion a été interrompue. Réessayez dans un instant.",provider:"gemini",model,actions:[],degraded:true};}
  }
  const result=unavailable(opts.lang);onToken?.(result.reply);return result;
}
export async function getModelInfo(){const {provider}=resolveKey();return {provider,configured:provider!=="none",textModel:GEMINI_TEXT_DEFAULT,liveModel:GEMINI_LIVE_MODEL,ttsModel:GEMINI_TTS_MODEL,imageModel:GEMINI_IMAGE_MODEL,knowledge:(await getKnowledge()).length};}
export interface ImageResult {ok:boolean;image?:string;text?:string;model?:string;message?:string}
// Charte Africa Global Logistics appliquée à chaque visuel ; le logo officiel est composé ensuite
// sur la borne (un modèle d’image ne reproduit pas fidèlement un logo).
const AGL_IMAGE_STYLE="Art direction: premium corporate visual for Africa Global Logistics. Colour palette dominated by deep navy blue (#1B365F) with refined soft gold accents (#EED58E), natural daylight or golden hour, clean modern composition, realistic African logistics context. No text, no letters, no logos, no watermark. Keep the bottom band and bottom-right corner calm and uncluttered.";
const IMAGE_DEADLINE_MS=55000;
// Modèles d’image réellement ouverts à la clé, découverts une fois par instance :
// la génération bascule seule si le modèle configuré est retiré ou non autorisé.
let discoveredImageModels:Promise<string[]>|null=null;
function discoverImageModels(ai:GoogleGenAI){
  discoveredImageModels??=(async()=>{
    const found:string[]=[];
    try{const pager=await ai.models.list({config:{pageSize:200}});for await(const m of pager){const name=(m.name??"").replace(/^models\//,"");if(/image/.test(name)&&!/imagen|tts|live/.test(name)&&(m.supportedActions??["generateContent"]).includes("generateContent"))found.push(name);}}
    catch(e){console.warn("Lara image models unavailable",e instanceof Error?e.message.slice(0,160):"unknown");}
    // Les plus récents d’abord (versions plus élevées), les « preview » après les stables.
    return found.sort((a,b)=>Number(a.includes("preview"))-Number(b.includes("preview"))||b.localeCompare(a,undefined,{numeric:true}));
  })();
  return discoveredImageModels;
}
let workingImageModel:string|null=null;
export async function getImage(prompt:string,lang?:string):Promise<ImageResult>{
  const unavailable=lang==="en"?"Image generation temporarily unavailable.":"Génération d’image momentanément indisponible.";
  const {key,provider}=resolveKey();if(!key||provider!=="gemini")return {ok:false,message:unavailable};
  const ai=new GoogleGenAI({apiKey:key});const started=Date.now();
  const discovery=discoverImageModels(ai);
  const models=[...new Set([workingImageModel,GEMINI_IMAGE_MODEL,...await discovery,"gemini-2.5-flash-image"].filter(Boolean) as string[])].slice(0,4);
  for(const [i,model] of models.entries()){
    // Le modèle principal garde l’essentiel du budget ; le secours utilise le temps restant (maxDuration 60 s).
    const left=IMAGE_DEADLINE_MS-(Date.now()-started);if(left<8000)break;
    const timeout=i===models.length-1?left:Math.min(40000,left-8000);
    try{
      const r=await ai.models.generateContent({model,contents:`${prompt.slice(0,800)}\n\n${AGL_IMAGE_STYLE}`,config:{responseModalities:[Modality.TEXT,Modality.IMAGE],httpOptions:{timeout}}});
      let image="";let text="";
      for(const p of r.candidates?.[0]?.content?.parts??[]){if(p.inlineData?.data)image=`data:${p.inlineData.mimeType||"image/png"};base64,${p.inlineData.data}`;else if(p.text)text+=p.text;}
      if(image){workingImageModel=model;return {ok:true,image,text:text.slice(0,600),model};}
    }catch(e){if(workingImageModel===model)workingImageModel=null;console.warn("Lara image unavailable",model,e instanceof Error?e.message.slice(0,200):"unknown");}
  }
  return {ok:false,message:unavailable};
}
