import { NextRequest } from "next/server";
import { getImage } from "@/lib/ai-server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
export async function POST(req:NextRequest){
  let body;try{body=await req.json();if(typeof body.prompt!=="string"||!body.prompt.trim()||body.prompt.length>800)throw new Error();}catch{return Response.json({ok:false,message:"Demande invalide"},{status:400});}
  const result=await getImage(body.prompt,body.lang==="en"?"en":"fr");
  if(!result.ok)return Response.json({ok:false,message:result.message},{status:503});
  return Response.json({ok:true,image:result.image,text:result.text??""},{headers:{"Cache-Control":"no-store"}});
}
