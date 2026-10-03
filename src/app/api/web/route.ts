import { NextRequest } from "next/server";
import { newsFeed, webSearch } from "@/lib/web";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;
export async function POST(req:NextRequest){
  let b:{kind?:string;query?:string;lang?:string}={};try{b=await req.json();}catch{}
  const query=String(b.query??"").trim().slice(0,300);
  if(!query)return Response.json({ok:false,message:"Demande invalide"},{status:400});
  const result=b.kind==="news"?await newsFeed(query,b.lang):await webSearch(query,b.lang);
  return Response.json(result,{headers:{"Cache-Control":"no-store"}});
}
