import { NextRequest } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=30;

// Films courts via file d’attente : POST lance le tournage, GET suit son avancement.
// Le nom du modèle n’est jamais renvoyé à la borne.
const ENDPOINT=process.env.FAL_VIDEO_MODEL||"minimax/h3-max/image-to-video";
const QUEUE="https://queue.fal.run/";
const AGL_FILM_STYLE="Cinematic corporate film for Africa Global Logistics. Colour grading with deep navy-blue shadows and warm soft-gold highlights, realistic West African logistics context, smooth stabilised camera movement. No on-screen text, no letters, no logos, no watermark. Keep the lower third calm.";
const unavailable={ok:false,message:"Film momentanément indisponible."};
function key(){return (process.env.FAL_KEY||"").trim();}

export async function POST(req:NextRequest){
  const k=key();if(!k)return Response.json(unavailable,{status:503});
  let prompt="";try{const b=await req.json();prompt=String(b.prompt??"").trim().slice(0,1500);}catch{}
  if(!prompt)return Response.json({ok:false,message:"Demande invalide"},{status:400});
  try{
    const r=await fetch(QUEUE+ENDPOINT,{method:"POST",headers:{Authorization:`Key ${k}`,"Content-Type":"application/json"},body:JSON.stringify({prompt:`${prompt}\n\n${AGL_FILM_STYLE}`,duration:5,resolution:"768P",prompt_expansion_mode:"balanced",enable_safety_checker:true}),signal:AbortSignal.timeout(15000)});
    const j=await r.json().catch(()=>({}));
    if(!r.ok||!j.status_url||!j.response_url){console.warn("Lara video unavailable",r.status,JSON.stringify(j).slice(0,200));return Response.json(unavailable,{status:503});}
    return Response.json({ok:true,job:Buffer.from(JSON.stringify({s:j.status_url,r:j.response_url})).toString("base64url")},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.warn("Lara video unavailable",e instanceof Error?e.message:"unknown");return Response.json(unavailable,{status:503});}
}

export async function GET(req:NextRequest){
  const k=key();if(!k)return Response.json(unavailable,{status:503});
  let job:{s?:string;r?:string}={};
  try{job=JSON.parse(Buffer.from(req.nextUrl.searchParams.get("job")??"","base64url").toString());}catch{}
  // Seules les URL de la file d’attente sont suivies (pas de requête arbitraire avec la clé serveur).
  if(!job.s?.startsWith(QUEUE)||!job.r?.startsWith(QUEUE))return Response.json({ok:false,message:"Demande invalide"},{status:400});
  try{
    const st=await fetch(job.s,{headers:{Authorization:`Key ${k}`},signal:AbortSignal.timeout(10000)}).then(r=>r.json());
    if(st.status==="IN_QUEUE"||st.status==="IN_PROGRESS")return Response.json({ok:true,status:st.status==="IN_QUEUE"?"queued":"filming"},{headers:{"Cache-Control":"no-store"}});
    if(st.status!=="COMPLETED")return Response.json(unavailable,{status:503});
    const res=await fetch(job.r,{headers:{Authorization:`Key ${k}`},signal:AbortSignal.timeout(10000)}).then(r=>r.json());
    const url=res?.video?.url;
    if(typeof url!=="string")return Response.json(unavailable,{status:503});
    return Response.json({ok:true,status:"done",url},{headers:{"Cache-Control":"no-store"}});
  }catch(e){console.warn("Lara video status unavailable",e instanceof Error?e.message:"unknown");return Response.json(unavailable,{status:503});}
}
