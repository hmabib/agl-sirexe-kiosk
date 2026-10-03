import { NextRequest } from "next/server";
import { readPage } from "@/lib/page";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=20;
export async function POST(req:NextRequest){
  let b:{url?:string}={};try{b=await req.json();}catch{}
  const page=typeof b.url==="string"?await readPage(b.url.trim().slice(0,2000)):null;
  if(!page)return Response.json({ok:false,message:"Page inaccessible depuis la borne."},{status:422});
  return Response.json({ok:true,page},{headers:{"Cache-Control":"no-store"}});
}
