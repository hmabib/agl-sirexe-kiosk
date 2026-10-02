import { GoogleGenAI, Modality, type LiveConnectConfig } from "@google/genai";
import { GEMINI_LIVE_MODEL, resolveKey, getKnowledge } from "@/lib/ai-server";
import { AGL_SYSTEM_PROMPT, VISION_VOICE_PROMPT } from "@/lib/prompt";
import { AGL_TOOLS } from "@/lib/ai-tools";
export const runtime="nodejs";
export const maxDuration=30;
export async function POST(req:Request){
  try {
    const body=await req.json(); const {key,provider}=resolveKey();
    if(!key||provider!=="gemini")return Response.json({message:"Conversation vocale indisponible. Utilisez le mode texte."},{status:503});
    const ai=new GoogleGenAI({apiKey:key,httpOptions:{apiVersion:"v1alpha",timeout:20000}});
    const config:LiveConnectConfig={responseModalities:[Modality.AUDIO],inputAudioTranscription:{},outputAudioTranscription:{},speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:"Kore"}}},systemInstruction:`${AGL_SYSTEM_PROMPT}\n${VISION_VOICE_PROMPT}\nLangue de l’écran : ${body.lang==="en"?"anglais":"français"}. Détecte celle du visiteur.\nContexte écran initial : ${JSON.stringify(body.context??{}).slice(0,8000)}\nDocumentation AGL : ${(await getKnowledge()).slice(0,18000)}`,tools:[{functionDeclarations:AGL_TOOLS}]};
    const token=await ai.authTokens.create({config:{uses:1,expireTime:new Date(Date.now()+10*60*1000).toISOString(),newSessionExpireTime:new Date(Date.now()+60000).toISOString(),liveConnectConstraints:{model:GEMINI_LIVE_MODEL,config}}});
    if(!token.name)throw new Error("Missing token");
    return Response.json({token:token.name,model:GEMINI_LIVE_MODEL,config},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.warn("AGL Live token unavailable",e instanceof Error?e.name:"unknown");return Response.json({message:"La conversation Live est momentanément indisponible. Le mode texte et l’analyse d’image restent disponibles."},{status:503});}
}
