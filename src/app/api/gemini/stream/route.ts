import { NextRequest } from "next/server";
import { getReply } from "@/lib/ai-server";
export const runtime="nodejs";
export const maxDuration=60;
export async function POST(req:NextRequest){
  let body;try{body=await req.json();if(typeof body.message!=="string"||!body.message.trim()||body.message.length>6000)throw new Error();}catch{return Response.json({message:"Demande invalide"},{status:400});}
  const enc=new TextEncoder();
  const stream=new ReadableStream({async start(controller){let closed=false;const send=(data:unknown)=>{if(!closed)try{controller.enqueue(enc.encode(`data: ${JSON.stringify(data)}\n\n`));}catch{closed=true;}};const timer=setInterval(()=>send({heartbeat:true}),10000);try{const result=await getReply({...body,modelOverride:body.model},text=>send({t:text}));send({done:true,...result});}catch{send({done:true,reply:"AGL AI momentanément indisponible.",provider:"offline",model:"offline",actions:[],degraded:true});}finally{clearInterval(timer);if(!closed)try{controller.close();}catch{}}}});
  return new Response(stream,{headers:{"Content-Type":"text/event-stream","Cache-Control":"no-cache, no-transform"}});
}
