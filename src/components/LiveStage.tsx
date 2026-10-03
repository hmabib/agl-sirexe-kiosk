"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, ArrowRight, ArrowUpRight, Network, RefreshCw, TriangleAlert, Truck, TrainFront, Ship, Plane, Anchor, Warehouse, ShieldCheck, Construction, Pickaxe, Satellite, Users, Sparkles } from "lucide-react";
import { useKiosk, logEvent, type Screen } from "@/lib/store";
import { publishAction, type MaterialAction, type RouteId, type StepMode } from "@/lib/actions";
import { brandImage, generateStudioImage, generateStudioVideo, STUDIO_LINKS } from "@/lib/studio";
import type { AudioKind, Chart, PageData, WebView } from "@/lib/actions";
import { downloadFile } from "@/lib/requests";
import { Orb } from "./Orb";
import { FlowDiagram } from "./FlowDiagram";
import { sfx } from "@/lib/sound";

const Exploded3D=dynamic(()=>import("./Exploded3D").then(m=>m.Exploded3D),{ssr:false,loading:()=> <div className="live-skeleton" style={{height:460}}>Préparation de la vue 3D…</div>});
const CinematicMap=dynamic(()=>import("./CinematicMap").then(m=>m.CinematicMap),{ssr:false,loading:()=> <div className="live-skeleton" style={{height:440}}>Envol vers la Côte d’Ivoire…</div>});

type StageAction=Extract<MaterialAction,{type:"solution"|"show_route"|"sheet"|"show_image"|"render_image"|"render_video"|"chart"|"flow"|"web"|"page"|"render_audio"|"model3d"}>;
interface View { id:number; action:StageAction }
interface ImageState { status:"loading"|"ready"|"error"; src?:string; text?:string }
const MAX_VIEWS=6;
const MODE_ICON:Record<StepMode,typeof Truck>={road:Truck,rail:TrainFront,sea:Ship,air:Plane,port:Anchor,warehouse:Warehouse,customs:ShieldCheck,heavy_lift:Construction,mining:Pickaxe,digital:Satellite,people:Users};
const MODE_LABEL:Record<StepMode,{fr:string;en:string}>={road:{fr:"Route",en:"Road"},rail:{fr:"Rail",en:"Rail"},sea:{fr:"Maritime",en:"Sea"},air:{fr:"Aérien",en:"Air"},port:{fr:"Port",en:"Port"},warehouse:{fr:"Entreposage",en:"Warehousing"},customs:{fr:"Douane",en:"Customs"},heavy_lift:{fr:"Heavy lift",en:"Heavy lift"},mining:{fr:"Mine",en:"Mine"},digital:{fr:"Visibilité",en:"Visibility"},people:{fr:"Équipe",en:"Team"}};
const isStage=(a:MaterialAction):a is StageAction=>["solution","show_route","sheet","show_image","render_image","render_video","chart","flow","web","page","render_audio","model3d"].includes(a.type);
function titleOf(a:StageAction){return a.type==="solution"?a.solution.title:a.type==="chart"?a.chart.title:a.type==="flow"?a.flow.title:a.type==="web"?`${a.web.kind==="news"?"Actualités":"Recherche"} · ${a.title}`:a.type==="page"?a.page.title:a.type==="show_route"?`Corridor ${a.route.replace("route-","")} · Côte d’Ivoire`:a.title;}
function imagePrompt(a:StageAction){return a.type==="render_image"?a.prompt:a.type==="solution"?a.solution.imagePrompt:undefined;}
function screenLabel(s:Screen,en:boolean){const l=STUDIO_LINKS.find(x=>x.screen===s);if(l)return en?l.en:l.fr;const fr:Partial<Record<Screen,string>>={home:"Accueil",games:"Expériences",corporate:"Présentation",careers:"Emploi",satisfaction:"Avis",market:"Performance",canvas:"Canvas Lara"};return fr[s]??s;}

// Vue Live : chaque instruction donnée à Lara (voix ou texte) se matérialise ici, à côté de la conversation.
export function LiveStage(){
  const k=useKiosk();const en=k.lang==="en";
  const [views,setViews]=useState<View[]>([]);const [active,setActive]=useState<number|null>(null);const [images,setImages]=useState<Record<number,ImageState>>({});const [videos,setVideos]=useState<Record<number,string>>({});const [audios,setAudios]=useState<Record<number,string>>({});
  const nextId=useRef(1);const started=useRef(new Set<number>());
  const go=k.go,setRoute=k.setRoute,lang=k.lang;

  const renderImage=useCallback((id:number,prompt:string)=>{
    started.current.add(id);setImages(m=>({...m,[id]:{status:"loading"}}));
    generateStudioImage(prompt,lang).then(r=>{setImages(m=>({...m,[id]:{status:"ready",src:r.image,text:r.text}}));sfx("success");logEvent("image_generated",{source:"live-stage"});}).catch(()=>setImages(m=>({...m,[id]:{status:"error"}})));
  },[lang]);

  useEffect(()=>{
    const handle=(e:Event)=>{
      const a=(e as CustomEvent<MaterialAction>).detail;
      if(a.type==="go"){go(a.screen);return;}
      if(a.type==="show_mining"){sessionStorage.setItem("agl-mining-stage",a.stage);go("mining");window.dispatchEvent(new CustomEvent("agl-mining-stage",{detail:a.stage}));return;}
      if(!isStage(a))return;
      if(a.type==="show_route")setRoute(a.route);
      if(a.type==="solution"&&a.solution.route)setRoute(a.solution.route);
      const id=nextId.current++;const title=titleOf(a);
      // Même titre = Lara affine la solution : la vue est remplacée au lieu d’être empilée.
      setViews(vs=>[...vs.filter(v=>titleOf(v.action)!==title),{id,action:a}].slice(-MAX_VIEWS));setActive(id);
      if(a.type==="show_image"){setImages(m=>({...m,[id]:{status:"ready",src:a.image,text:a.text}}));void brandImage(a.image).then(src=>setImages(m=>({...m,[id]:{status:"ready",src,text:a.text}})));}
      sfx("materialize");logEvent("live_view",{kind:a.type});
    };
    window.addEventListener("agl-action",handle);return()=>window.removeEventListener("agl-action",handle);
  },[go,setRoute]);

  // Les visuels se génèrent dès l’apparition de la vue ; la vue est lisible pendant ce temps.
  useEffect(()=>{for(const v of views){const p=imagePrompt(v.action);if(p&&!started.current.has(v.id))renderImage(v.id,p);}},[views,renderImage]);

  const view=views.find(v=>v.id===active)??null;
  const close=useCallback(()=>{setActive(null);},[]);
  useEffect(()=>{if(!view)return;const key=(e:KeyboardEvent)=>{if(e.key==="Escape")close();};window.addEventListener("keydown",key);return()=>window.removeEventListener("keydown",key);},[view,close]);
  if(!view)return null;
  const a=view.action;const title=titleOf(a);const img=images[view.id];const prompt=imagePrompt(a);
  const nextScreens:Screen[]=a.type==="solution"&&a.solution.next.length?a.solution.next:a.type==="show_route"?["mission"]:["appointment"];

  function download(){
    if(a.type==="render_video"){if(videoUrl){const link=document.createElement("a");link.href=videoUrl;link.download="AGL-film.mp4";link.target="_blank";link.click();}return;}
    if(a.type==="render_audio"){const u=audioUrl;if(u){const link=document.createElement("a");link.href=u;link.download=`AGL-${a.kind}.mp3`;link.click();}return;}
    if(a.type==="page"){downloadFile("Africa Global Logistics-page.txt",[a.page.title,a.page.url,"",...a.page.paragraphs].join("\n\n"));return;}
    if(a.type==="model3d"){downloadFile("Africa Global Logistics-vue-3d.txt",[title,a.intro??"",...a.parts.map((p,i)=>`${i+1}. ${p.name} — ${p.explanation}`)].join("\n"));return;}
    if(a.type==="web"){downloadFile("Africa Global Logistics-sources.txt",[title,"",a.web.summary??"","",...a.web.items.map(i=>`• ${i.title}${i.source?` — ${i.source}`:""}${i.date?` (${new Date(i.date).toLocaleDateString("fr-FR")})`:""}\n  ${i.url}`)].join("\n"));return;}
    if(a.type==="flow"){const svg=document.querySelector(".flow-diagram svg");if(svg){const clone=svg.cloneNode(true) as SVGElement;clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("style","background:#0b2147");downloadFile("Africa Global Logistics-schema.svg",`<?xml version="1.0" encoding="UTF-8"?>\n${clone.outerHTML}`,"image/svg+xml");}return;}
    if(a.type==="chart"){const c=a.chart;downloadFile("Africa Global Logistics-analyse.csv",["libellé;valeur"+(c.unit?` (${c.unit})`:""),...c.labels.map((l,i)=>`${l};${c.values[i]}`),"",`Source : ${c.source||"illustratif"}`].join("\n"),"text/csv");return;}
    if(a.type==="show_image"||(a.type==="render_image"&&img?.src)){const link=document.createElement("a");link.href=img?.src??"";link.download="Lara-image.png";link.click();return;}
    if(a.type==="solution"){const s=a.solution;downloadFile("Africa Global Logistics-solution.txt",[s.title,"",s.summary,"",en?"STEPS":"ÉTAPES",...s.steps.map((st,i)=>`${i+1}. ${st.label}${st.mode?` [${MODE_LABEL[st.mode][en?"en":"fr"]}]`:""} — ${st.detail}`),"",...(s.considerations.length?[en?"TO VALIDATE":"À VALIDER",...s.considerations.map(c=>`• ${c.label} : ${c.text}`),""]:[]),en?"Working solution prepared by Lara — to be validated with Africa Global Logistics teams.":"Solution de travail préparée par Lara — à valider avec les équipes Africa Global Logistics."].join("\n"));return;}
    downloadFile("Africa Global Logistics-fiche.txt",title+"\n\n"+(a.type==="sheet"?a.body:"Corridor illustratif — étude de route nécessaire."));
  }
  const isImage=a.type==="show_image"||a.type==="render_image";
  const videoUrl=videos[view.id];const audioUrl=audios[view.id];

  return <motion.div className={`live-stage ${k.aiOpen?"docked":""}`} role="dialog" aria-modal="false" aria-label={title} initial={{opacity:0,x:-40}} animate={{opacity:1,x:0}} transition={{duration:.35}}>
    <header className="live-stage-head">
      <div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}>
        <Orb size={22} state={k.aiState}/>
        <div style={{minWidth:0}}><span className="eyebrow">Lara · {en?"LIVE VIEW":"VUE LIVE"}</span><h3 className="live-stage-title">{title}</h3></div>
      </div>
      <button className="ai-icon-btn" aria-label="Fermer la fiche" onClick={close}><X/></button>
    </header>
    {views.length>1&&<nav className="live-stage-history" aria-label={en?"Previous views":"Vues précédentes"}>{views.map(v=><button key={v.id} className={v.id===view.id?"active":""} aria-pressed={v.id===view.id} onClick={()=>{setActive(v.id);k.touch();}}>{titleOf(v.action)}</button>)}</nav>}
    <div className="live-stage-body">
      <AnimatePresence mode="wait">
        <motion.div key={view.id} initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.3}}>
          {a.type==="solution"&&<>
            <p className="live-summary">{a.solution.summary}</p>
            {a.solution.steps.length>0&&<ol className="live-steps">{a.solution.steps.map((s,i)=>{const Icon=s.mode?MODE_ICON[s.mode]:Network;return <motion.li key={i} initial={{opacity:0,y:18}} animate={{opacity:1,y:0}} transition={{delay:.12+i*.12}}>
              <div className="live-step-icon"><Icon size={22}/></div>
              <span className="live-step-num">{String(i+1).padStart(2,"0")}{s.mode&&` · ${MODE_LABEL[s.mode][en?"en":"fr"]}`}</span>
              <strong>{s.label}</strong>{s.detail&&<p>{s.detail}</p>}
            </motion.li>;})}</ol>}
            {a.solution.considerations.length>0&&<section style={{marginTop:22}}><span className="eyebrow">{en?"TO VALIDATE":"À VALIDER"}</span><div className="live-points">{a.solution.considerations.map((c,i)=><motion.div key={i} initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.4+i*.08}}><TriangleAlert size={16}/><div><strong>{c.label}</strong><p>{c.text}</p></div></motion.div>)}</div></section>}
            {a.solution.route&&<section style={{marginTop:22}}><span className="eyebrow">{en?"ILLUSTRATIVE CORRIDOR":"CORRIDOR ILLUSTRATIF"}</span><div style={{marginTop:10}}><CinematicMap route={a.solution.route}/></div></section>}
          </>}
          {a.type==="show_route"&&<><CinematicMap route={a.route} onSelectRoute={r=>{setRoute(r);setViews(vs=>vs.map(v=>v.id===view.id?{...v,action:{type:"show_route",route:r as RouteId}}:v));}}/><p className="ai-status">{en?"Principle link between real cities. Route and feasibility to be validated by a route survey.":"Liaison de principe entre des villes réelles. Itinéraire et faisabilité à valider par une étude de route."}</p></>}
          {a.type==="render_video"&&<BrandFilm key={view.id} prompt={a.prompt} narration={a.narration} soundscape={a.soundscape} en={en} onReady={url=>setVideos(m=>({...m,[view.id]:url}))}/>}
          {a.type==="chart"&&<ChartView chart={a.chart} en={en}/>}
          {a.type==="web"&&<WebResults web={a.web} en={en}/>}
          {a.type==="page"&&<PageReader page={a.page} en={en}/>}
          {a.type==="render_audio"&&<AudioView key={view.id} kind={a.kind} text={a.text} seconds={a.seconds} en={en} onReady={u=>setAudios(m=>({...m,[view.id]:u}))}/>}
          {a.type==="model3d"&&<Exploded3D key={view.id} object={a.object} parts={a.parts} intro={a.intro} en={en}/>}
          {a.type==="flow"&&<FlowDiagram key={view.id} flow={a.flow} en={en}/>}
          {a.type==="sheet"&&<p className="live-summary" style={{whiteSpace:"pre-wrap"}}>{a.body}</p>}
          {prompt||isImage?<section style={{marginTop:a.type==="solution"?22:0}}>
            {(!img||img.status==="loading")&&<div className="live-skeleton" role="status"><Sparkles size={20}/><ImageProgress en={en}/></div>}
            {img?.status==="ready"&&img.src&&<motion.img className="live-reveal" initial={{opacity:0,scale:1.04,filter:"blur(18px)"}} animate={{opacity:1,scale:1,filter:"blur(0px)"}} transition={{duration:.9,ease:[0.22,1,0.36,1]}} src={img.src} alt="Visuel généré" style={{width:"100%",borderRadius:16,display:"block"}}/>}
            {img?.status==="error"&&<div className="live-skeleton error" role="alert">{en?"Visual unavailable right now.":"Visuel momentanément indisponible."}{prompt&&<button className="text-action" onClick={()=>renderImage(view.id,prompt)}><RefreshCw size={16}/>{en?"Retry":"Réessayer"}</button>}</div>}
            {img?.text&&<p className="ai-status" style={{marginTop:8}}>{img.text}</p>}
            <p className="ai-status">{en?"Illustration generated on demand by Lara — indicative visual, not a contractual photo.":"Illustration générée à la demande par Lara — visuel indicatif, pas une photo contractuelle."}</p>
          </section>:null}
          {a.type==="solution"&&<p className="ai-status" style={{marginTop:14}}>{en?"Working solution — no price or lead time committed; to be validated with Africa Global Logistics teams.":"Solution de travail — aucun prix ni délai engagé ; à valider avec les équipes Africa Global Logistics."}</p>}
        </motion.div>
      </AnimatePresence>
    </div>
    <footer className="live-stage-foot">
      {a.type==="solution"&&(a.solution.next.length>0||a.solution.miningStage)&&<div className="pill-row" style={{marginBottom:12}}>
        {a.solution.miningStage&&<button className="pill" style={{cursor:"pointer"}} onClick={()=>{close();publishAction({type:"show_mining",stage:a.solution.miningStage!});}}>Mining · {a.solution.miningStage} <ArrowUpRight size={14}/></button>}
        {a.solution.next.map(s=><button key={s} className="pill" style={{cursor:"pointer"}} onClick={()=>{close();k.go(s);}}>{screenLabel(s,en)} <ArrowUpRight size={14}/></button>)}
      </div>}
      <div className="button-row" style={{marginTop:0}}>
        <button className="outline-btn" disabled={(isImage&&img?.status!=="ready")||(a.type==="render_video"&&!videoUrl)||(a.type==="render_audio"&&!audios[view.id])} onClick={()=>{download();k.touch();}}><Download size={18}/>{isImage?"Télécharger l’image":a.type==="render_video"?(en?"Download film":"Télécharger le film"):a.type==="chart"?(en?"Download data":"Télécharger les données"):a.type==="flow"?(en?"Download diagram":"Télécharger le schéma"):a.type==="web"?(en?"Download sources":"Télécharger les sources"):a.type==="render_audio"?(en?"Download audio":"Télécharger l’audio"):a.type==="page"?(en?"Download text":"Télécharger le texte"):a.type==="model3d"?(en?"Download explanations":"Télécharger les explications"):"Télécharger la fiche"}</button>
        {a.type==="solution"&&a.solution.steps.length>0&&<button className="outline-btn" onClick={()=>{close();publishAction({type:"open_studio",tab:"schema",title:a.solution.title,body:a.solution.steps.map(s=>s.label).join(" → ")});}}><Network size={18}/>{en?"Edit as diagram":"Modifier en schéma"}</button>}
        <button className="brand-btn" onClick={()=>{close();k.go(nextScreens[0]);}}>Continuer<ArrowRight size={18}/></button>
      </div>
    </footer>
  </motion.div>;
}

// Étapes affichées pendant la génération : la vue reste vivante jusqu’au retour de l’API.
function ImageProgress({en}:{en:boolean}){
  const steps=en?["Composing the scene…","Applying the AGL brand palette…","Adding the Africa Global Logistics logo…","Final touches…"]:["Composition de la scène…","Application de la charte AGL…","Intégration du logo Africa Global Logistics…","Derniers détails…"];
  const [i,setI]=useState(0);
  useEffect(()=>{const id=setInterval(()=>setI(v=>Math.min(v+1,steps.length-1)),3500);return()=>clearInterval(id);},[steps.length]);
  return <span>{steps[i]}</span>;
}

// Film : tournage suivi pas à pas, puis lecture en boucle avec le logo et la charte AGL incrustés.
async function studioAudio(kind:"voiceover"|"sound"|"music",text:string,lang:string,seconds?:number):Promise<string>{
  const r=await fetch("/api/studio/audio",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:kind==="voiceover"?"voice":kind,text,lang,seconds})});
  const j=await r.json().catch(()=>({}));if(!r.ok||!j.audio)throw new Error(j.message||"audio failed");return j.audio;
}
function BrandFilm({prompt,narration,soundscape,en,onReady}:{prompt:string;narration?:string;soundscape?:string;en:boolean;onReady:(url:string)=>void}){
  // Narration et ambiance préparées pendant le tournage, jouées avec le film.
  const [voice,setVoice]=useState("");const [ambience,setAmbience]=useState("");
  useEffect(()=>{let stop=false;if(narration)studioAudio("voiceover",narration,en?"en":"fr").then(u=>{if(!stop)setVoice(u);}).catch(()=>{});if(soundscape)studioAudio("sound",soundscape,"fr",12).then(u=>{if(!stop)setAmbience(u);}).catch(()=>{});return()=>{stop=true;};},[narration,soundscape,en]);
  const [url,setUrl]=useState("");const [phase,setPhase]=useState(0);const [error,setError]=useState(false);const [attempt,setAttempt]=useState(0);
  const ready=useRef(onReady);useEffect(()=>{ready.current=onReady;});
  const steps=en?["Writing the shot…","Filming the scene…","Grading in AGL colours…","Adding the Africa Global Logistics logo…"]:["Écriture du plan…","Tournage de la scène…","Étalonnage aux couleurs AGL…","Intégration du logo Africa Global Logistics…"];
  useEffect(()=>{
    const abort=new AbortController();
    const tick=setInterval(()=>setPhase(p=>Math.min(p+1,steps.length-1)),5000);
    generateStudioVideo(prompt,s=>{if(s==="filming")setPhase(p=>Math.max(p,1));},abort.signal).then(u=>{setUrl(u);ready.current(u);sfx("success");logEvent("video_generated",{});}).catch(()=>{if(!abort.signal.aborted)setError(true);}).finally(()=>clearInterval(tick));
    return()=>{abort.abort();clearInterval(tick);};
  },[prompt,attempt,steps.length]);
  if(error)return <div className="live-skeleton error" role="alert">{en?"Film unavailable right now.":"Film momentanément indisponible."}<button className="text-action" onClick={()=>{setError(false);setPhase(0);setAttempt(n=>n+1);}}><RefreshCw size={16}/>{en?"Retry":"Réessayer"}</button></div>;
  if(!url)return <div className="live-skeleton film" role="status"><Sparkles size={20}/><span>{steps[phase]}</span><div className="film-progress"><i style={{width:`${(phase+1)/steps.length*100}%`}}/></div></div>;
  return <motion.div className="brand-film" initial={{opacity:0,scale:1.03,filter:"blur(14px)"}} animate={{opacity:1,scale:1,filter:"blur(0px)"}} transition={{duration:.9,ease:[0.22,1,0.36,1]}}>
    <video src={url} autoPlay loop muted playsInline aria-label={en?"Generated film":"Film généré"}/>
    {ambience&&<audio src={ambience} autoPlay loop/>}
    {voice&&<audio src={voice} autoPlay/>}
    <div className="brand-film-band"><span>AFRICA GLOBAL LOGISTICS · {en?"INDICATIVE FILM":"FILM INDICATIF"}</span><img src="/assets/template/image6.svg" alt="Africa Global Logistics"/></div>
  </motion.div>;
}

// Graphique analytique aux couleurs AGL, animé à l’apparition ; jamais sans mention de source.
function ChartView({chart,en}:{chart:Chart;en:boolean}){
  const max=Math.max(...chart.values.map(Math.abs),1);const total=chart.values.reduce((a,b)=>a+Math.max(0,b),0)||1;
  const fmt=(v:number)=>`${v.toLocaleString(en?"en-US":"fr-FR",{maximumFractionDigits:1})}${chart.unit?` ${chart.unit}`:""}`;
  const W=760,H=320,P=48;const n=chart.values.length;
  const palette=["#EED58E","#7fb3e8","#c9a85a","#3a6ea5","#f4e6bd","#5b8fd0","#a88a46","#9dc0e8"];
  return <section>
    {chart.kind==="donut"?<div className="chart-donut">
      <svg viewBox="0 0 220 220" width={260} height={260} role="img" aria-label={chart.title}>{(()=>{let acc=0;return chart.values.map((v,i)=>{const frac=Math.max(0,v)/total;const len=frac*565.5;const el=<motion.circle key={i} cx={110} cy={110} r={90} fill="none" stroke={palette[i%palette.length]} strokeWidth={28} strokeDasharray={`${len} ${565.5-len}`} strokeDashoffset={-acc} transform="rotate(-90 110 110)" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.1+i*.12}}/>;acc+=len;return el;});})()}<text x={110} y={116} textAnchor="middle" fill="#fff" fontSize={18} fontWeight={800}>{chart.unit??""}</text></svg>
      <ul className="chart-legend">{chart.labels.map((l,i)=><li key={l}><i style={{background:palette[i%palette.length]}}/>{l}<strong>{fmt(chart.values[i])}</strong></li>)}</ul>
    </div>:<svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={chart.title} className="chart-svg">
      {[0,.25,.5,.75,1].map(t=><line key={t} x1={P} x2={W-12} y1={H-P-(H-2*P)*t} y2={H-P-(H-2*P)*t} stroke="#ffffff14"/>)}
      {chart.kind==="bar"?chart.values.map((v,i)=>{const bw=(W-P-12)/n*.62;const x=P+(W-P-12)/n*(i+.19);const h=(H-2*P)*Math.abs(v)/max;return <g key={i}><motion.rect x={x} width={bw} rx={8} fill={i===chart.values.indexOf(Math.max(...chart.values))?"#EED58E":"#3a6ea5"} initial={{y:H-P,height:0}} animate={{y:H-P-h,height:h}} transition={{delay:.1+i*.08,duration:.7,ease:[0.22,1,0.36,1]}}/><text x={x+bw/2} y={H-P-h-8} textAnchor="middle" fill="#fff" fontSize={13} fontWeight={700}>{fmt(v)}</text><text x={x+bw/2} y={H-P+20} textAnchor="middle" fill="#9dc0e8" fontSize={12}>{chart.labels[i]}</text></g>;})
      :(()=>{const pts=chart.values.map((v,i)=>[P+(W-P-24)*(n===1?0:i/(n-1)),H-P-(H-2*P)*v/max] as const);const d=pts.map((p,i)=>`${i?"L":"M"}${p[0]},${p[1]}`).join(" ");return <g><motion.path d={`${d} L${pts[n-1][0]},${H-P} L${pts[0][0]},${H-P} Z`} fill="#eed58e1f" initial={{opacity:0}} animate={{opacity:1}} transition={{delay:.6}}/><motion.path d={d} fill="none" stroke="#EED58E" strokeWidth={3.5} strokeLinecap="round" initial={{pathLength:0}} animate={{pathLength:1}} transition={{duration:1.2,ease:"easeInOut"}}/>{pts.map((p,i)=><g key={i}><circle cx={p[0]} cy={p[1]} r={5} fill="#04122a" stroke="#EED58E" strokeWidth={2.5}/><text x={p[0]} y={p[1]-12} textAnchor="middle" fill="#fff" fontSize={12} fontWeight={700}>{fmt(chart.values[i])}</text><text x={p[0]} y={H-P+20} textAnchor="middle" fill="#9dc0e8" fontSize={12}>{chart.labels[i]}</text></g>)}</g>;})()}
    </svg>}
    <p className="ai-status" style={{marginTop:10}}>{chart.source?`${en?"Source":"Source"} : ${chart.source}`:(en?"Illustrative breakdown — not operational data.":"Répartition illustrative — pas une donnée opérationnelle.")}</p>
  </section>;
}

// Résultats en ligne : synthèse sourcée, sources datées ; un QR code ouvre l’article sur le téléphone du visiteur.
function WebResults({web,en}:{web:WebView;en:boolean}){
  const [open,setOpen]=useState<number|null>(null);const [qrs,setQrs]=useState<Record<string,string>>({});
  const openUrl=open===null?null:web.items[open]?.url??null;const qr=openUrl?qrs[openUrl]:"";
  useEffect(()=>{if(!openUrl)return;let stop=false;void import("qrcode").then(Q=>Q.toDataURL(openUrl,{margin:1,width:220,color:{dark:"#04122a",light:"#ffffff"}})).then(u=>{if(!stop)setQrs(m=>({...m,[openUrl]:u}));}).catch(()=>{});return()=>{stop=true;};},[openUrl]);
  const fmt=(d?:string)=>{const t=d?Date.parse(d):NaN;return Number.isFinite(t)?new Date(t).toLocaleDateString(en?"en-GB":"fr-FR",{day:"numeric",month:"short",year:"numeric"}):"";};
  return <section>
    {web.summary&&<p className="live-summary">{web.summary}</p>}
    <div className="web-list">{web.items.map((it,i)=><motion.button key={it.url} className={`web-item ${open===i?"open":""}`} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:.08*i}} onClick={()=>setOpen(open===i?null:i)} aria-expanded={open===i}>
      <span className="web-meta">{it.source??new URL(it.url).hostname}{fmt(it.date)&&` · ${fmt(it.date)}`}</span>
      <strong>{it.title}</strong>
      {open===i&&<span className="web-qr">{qr?<img src={qr} alt={en?"QR code to open the article":"QR code pour ouvrir l’article"}/>:null}<em>{en?"Scan to read on your phone":"Scannez pour lire sur votre téléphone"}</em></span>}
    </motion.button>)}</div>
    <p className="ai-status" style={{marginTop:12}}>{en?"Live web results — external sources, not Africa Global Logistics positions.":"Résultats en ligne en direct — sources externes, pas des positions d’Africa Global Logistics."}</p>
  </section>;
}

// Page web en mode lecture ; la page d’origine s’affiche quand le site autorise l’intégration.
function PageReader({page,en}:{page:PageData;en:boolean}){
  const [original,setOriginal]=useState(false);const [qr,setQr]=useState("");
  useEffect(()=>{let stop=false;void import("qrcode").then(Q=>Q.toDataURL(page.url,{margin:1,width:220,color:{dark:"#04122a",light:"#ffffff"}})).then(u=>{if(!stop)setQr(u);}).catch(()=>{});return()=>{stop=true;};},[page.url]);
  return <section className="page-reader">
    <div className="page-bar"><span className="web-meta">{page.site}</span>{page.embeddable&&<button className="text-action" aria-pressed={original} onClick={()=>setOriginal(v=>!v)}>{original?(en?"Reading mode":"Mode lecture"):(en?"Original page":"Page d’origine")}</button>}</div>
    {original?<iframe src={page.url} title={page.title} className="page-frame" sandbox="allow-scripts allow-same-origin allow-popups" referrerPolicy="no-referrer"/>:<div className="page-body">
      {page.image&&/^https:/.test(page.image)&&<img src={page.image} alt="" className="page-hero" referrerPolicy="no-referrer" onError={e=>{(e.target as HTMLImageElement).style.display="none";}}/>}
      {page.description&&<p className="live-summary">{page.description}</p>}
      {page.paragraphs.map((p,i)=><p key={i} className="page-p">{p}</p>)}
      {!page.paragraphs.length&&!page.description&&<p className="ai-status">{en?"This page shows little readable text — scan the QR code to open it.":"Cette page contient peu de texte lisible — scannez le QR code pour l’ouvrir."}</p>}
    </div>}
    {qr&&<div className="web-qr"><img src={qr} alt={en?"QR code to open the page":"QR code pour ouvrir la page"}/><em>{en?"Scan to continue on your phone":"Scannez pour continuer sur votre téléphone"}</em></div>}
  </section>;
}

// Audio généré : forme d’onde vivante pendant la lecture.
function AudioView({kind,text,seconds,en,onReady}:{kind:AudioKind;text:string;seconds?:number;en:boolean;onReady:(u:string)=>void}){
  const [url,setUrl]=useState("");const [error,setError]=useState(false);const [playing,setPlaying]=useState(false);
  const audio=useRef<HTMLAudioElement>(null);const canvas=useRef<HTMLCanvasElement>(null);const ready=useRef(onReady);useEffect(()=>{ready.current=onReady;});
  useEffect(()=>{let stop=false;studioAudio(kind,text,en?"en":"fr",seconds).then(u=>{if(stop)return;setUrl(u);ready.current(u);sfx("success");}).catch(()=>{if(!stop)setError(true);});return()=>{stop=true;};},[kind,text,seconds,en]);
  useEffect(()=>{
    const el=audio.current,cv=canvas.current;if(!url||!el||!cv)return;
    let raf=0;const ac=new AudioContext();const src=ac.createMediaElementSource(el);const an=ac.createAnalyser();an.fftSize=256;src.connect(an);an.connect(ac.destination);
    const data=new Uint8Array(an.frequencyBinCount);const ctx=cv.getContext("2d");
    const draw=()=>{if(!ctx)return;an.getByteFrequencyData(data);const W=cv.width=cv.clientWidth*2,H=cv.height=cv.clientHeight*2;ctx.clearRect(0,0,W,H);const n=48,bw=W/n;for(let i=0;i<n;i++){const v=data[Math.floor(i*data.length/n/1.4)]/255;const h=Math.max(H*0.04,v*H*0.9);const g=ctx.createLinearGradient(0,H/2-h/2,0,H/2+h/2);g.addColorStop(0,"#f6e3a8");g.addColorStop(1,"#3a6ea5");ctx.fillStyle=g;ctx.beginPath();ctx.roundRect(i*bw+bw*0.2,H/2-h/2,bw*0.6,h,bw*0.3);ctx.fill();}raf=requestAnimationFrame(draw);};
    draw();el.play().then(()=>{void ac.resume();}).catch(()=>{});
    return()=>{cancelAnimationFrame(raf);ac.close().catch(()=>{});};
  },[url]);
  const label=kind==="music"?(en?"Composing the music…":"Composition de la musique…"):kind==="sound"?(en?"Creating the soundscape…":"Création de l’ambiance sonore…"):(en?"Recording the voice-over…":"Enregistrement de la voix off…");
  if(error)return <div className="live-skeleton error" role="alert">{en?"Audio unavailable right now.":"Audio momentanément indisponible."}</div>;
  if(!url)return <div className="live-skeleton" role="status"><Sparkles size={20}/>{label}</div>;
  return <section className="audio-view">
    <canvas ref={canvas} className="audio-wave" aria-hidden="true"/>
    <audio ref={audio} src={url} controls onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} aria-label={en?"Generated audio":"Audio généré"}/>
    {kind==="voiceover"&&<p className="live-summary" style={{marginTop:14}}>{text}</p>}
    <p className="ai-status">{playing?(en?"Playing":"Lecture en cours"):(en?"Ready":"Prêt")} · {en?"Generated on demand for Africa Global Logistics.":"Créé à la demande pour Africa Global Logistics."}</p>
  </section>;
}
