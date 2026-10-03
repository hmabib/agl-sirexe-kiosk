import { NextRequest } from "next/server";
import { elevenMusic, elevenSound, elevenSpeech } from "@/lib/eleven";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
// Voix off, ambiance sonore ou musique ; aucun nom de fournisseur renvoyé à la borne.
export async function POST(req:NextRequest){
  let b:{kind?:string;text?:string;seconds?:number;lang?:string}={};try{b=await req.json();}catch{}
  const text=String(b.text??"").trim();
  if(!text||text.length>2500)return Response.json({ok:false,message:"Demande invalide"},{status:400});
  const seconds=Number(b.seconds)||undefined;
  const audio=b.kind==="music"?await elevenMusic(text,seconds):b.kind==="sound"?await elevenSound(text,seconds):await elevenSpeech(text,b.lang);
  if(!audio)return Response.json({ok:false,message:"Audio momentanément indisponible."},{status:503});
  return Response.json({ok:true,audio},{headers:{"Cache-Control":"no-store"}});
}
