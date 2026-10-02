"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, ArrowRight, ArrowUpRight, Network, RefreshCw, TriangleAlert, Truck, TrainFront, Ship, Plane, Anchor, Warehouse, ShieldCheck, Construction, Pickaxe, Satellite, Users, Sparkles } from "lucide-react";
import { useKiosk, logEvent, type Screen } from "@/lib/store";
import { publishAction, type MaterialAction, type RouteId, type StepMode } from "@/lib/actions";
import { brandImage, generateStudioImage, generateStudioVideo, STUDIO_LINKS } from "@/lib/studio";
import type { Chart } from "@/lib/actions";
import { downloadFile } from "@/lib/requests";
import { Orb } from "./Orb";
import { sfx } from "@/lib/sound";

const CinematicMap=dynamic(()=>import("./CinematicMap").then(m=>m.CinematicMap),{ssr:false,loading:()=> <div className="live-skeleton" style={{height:440}}>Envol vers la Côte d’Ivoire…</div>});

type StageAction=Extract<MaterialAction,{type:"solution"|"show_route"|"sheet"|"show_image"|"render_image"|"render_video"|"chart"}>;
interface View { id:number; action:StageAction }
interface ImageState { status:"loading"|"ready"|"error"; src?:string; text?:string }
const MAX_VIEWS=6;
const MODE_ICON:Record<StepMode,typeof Truck>={road:Truck,rail:TrainFront,sea:Ship,air:Plane,port:Anchor,warehouse:Warehouse,customs:ShieldCheck,heavy_lift:Construction,mining:Pickaxe,digital:Satellite,people:Users};
const MODE_LABEL:Record<StepMode,{fr:string;en:string}>={road:{fr:"Route",en:"Road"},rail:{fr:"Rail",en:"Rail"},sea:{fr:"Maritime",en:"Sea"},air:{fr:"Aérien",en:"Air"},port:{fr:"Port",en:"Port"},warehouse:{fr:"Entreposage",en:"Warehousing"},customs:{fr:"Douane",en:"Customs"},heavy_lift:{fr:"Heavy lift",en:"Heavy lift"},mining:{fr:"Mine",en:"Mine"},digital:{fr:"Visibilité",en:"Visibility"},people:{fr:"Équipe",en:"Team"}};
const isStage=(a:MaterialAction):a is StageAction=>["solution","show_route","sheet","show_image","render_image","render_video","chart"].includes(a.type);
function titleOf(a:StageAction){return a.type==="solution"?a.solution.title:a.type==="chart"?a.chart.title:a.type==="show_route"?`Corridor ${a.route.replace("route-","")} · Côte d’Ivoire`:a.title;}
function imagePrompt(a:StageAction){return a.type==="render_image"?a.prompt:a.type==="solution"?a.solution.imagePrompt:undefined;}
function screenLabel(s:Screen,en:boolean){const l=STUDIO_LINKS.find(x=>x.screen===s);if(l)return en?l.en:l.fr;const fr:Partial<Record<Screen,string>>={home:"Accueil",games:"Expériences",corporate:"Présentation",careers:"Emploi",satisfaction:"Avis",market:"Performance",canvas:"Canvas Lara"};return fr[s]??s;}

// Vue Live : chaque instruction donnée à Lara (voix ou texte) se matérialise ici, à côté de la conversation.
export function LiveStage(){
  const k=useKiosk();const en=k.lang==="en";
  const [views,setViews]=useState<View[]>([]);const [active,setActive]=useState<number|null>(null);const [images,setImages]=useState<Record<number,ImageState>>({});const [videos,setVideos]=useState<Record<number,string>>({});
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
    if(a.type==="chart"){const c=a.chart;downloadFile("Africa Global Logistics-analyse.csv",["libellé;valeur"+(c.unit?` (${c.unit})`:""),...c.labels.map((l,i)=>`${l};${c.values[i]}`),"",`Source : ${c.source||"illustratif"}`].join("\n"),"text/csv");return;}
    if(a.type==="show_image"||(a.type==="render_image"&&img?.src)){const link=document.createElement("a");link.href=img?.src??"";link.download="Lara-image.png";link.click();return;}
    if(a.type==="solution"){const s=a.solution;downloadFile("Africa Global Logistics-solution.txt",[s.title,"",s.summary,"",en?"STEPS":"ÉTAPES",...s.steps.map((st,i)=>`${i+1}. ${st.label}${st.mode?` [${MODE_LABEL[st.mode][en?"en":"fr"]}]`:""} — ${st.detail}`),"",...(s.considerations.length?[en?"TO VALIDATE":"À VALIDER",...s.considerations.map(c=>`• ${c.label} : ${c.text}`),""]:[]),en?"Working solution prepared by Lara — to be validated with Africa Global Logistics teams.":"Solution de travail préparée par Lara — à valider avec les équipes Africa Global Logistics."].join("\n"));return;}
    downloadFile("Africa Global Logistics-fiche.txt",title+"\n\n"+(a.type==="sheet"?a.body:"Corridor illustratif — étude de route nécessaire."));
  }
  const isImage=a.type==="show_image"||a.type==="render_image";
  const videoUrl=videos[view.id];

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
          {a.type==="render_video"&&<BrandFilm key={view.id} prompt={a.prompt} en={en} onReady={url=>setVideos(m=>({...m,[view.id]:url}))}/>}
          {a.type==="chart"&&<ChartView chart={a.chart} en={en}/>}
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
        <button className="outline-btn" disabled={(isImage&&img?.status!=="ready")||(a.type==="render_video"&&!videoUrl)} onClick={()=>{download();k.touch();}}><Download size={18}/>{isImage?"Télécharger l’image":a.type==="render_video"?(en?"Download film":"Télécharger le film"):a.type==="chart"?(en?"Download data":"Télécharger les données"):"Télécharger la fiche"}</button>
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
function BrandFilm({prompt,en,onReady}:{prompt:string;en:boolean;onReady:(url:string)=>void}){
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
