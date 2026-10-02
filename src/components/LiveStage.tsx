"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { X, Download, ArrowRight, ArrowUpRight, Network, RefreshCw, TriangleAlert, Truck, TrainFront, Ship, Plane, Anchor, Warehouse, ShieldCheck, Construction, Pickaxe, Satellite, Users, Sparkles } from "lucide-react";
import { useKiosk, logEvent, type Screen } from "@/lib/store";
import { publishAction, type MaterialAction, type RouteId, type StepMode } from "@/lib/actions";
import { brandImage, generateStudioImage, STUDIO_LINKS } from "@/lib/studio";
import { downloadFile } from "@/lib/requests";
import { Orb } from "./Orb";
import { sfx } from "@/lib/sound";

const CinematicMap=dynamic(()=>import("./CinematicMap").then(m=>m.CinematicMap),{ssr:false,loading:()=> <div className="live-skeleton" style={{height:440}}>Envol vers la Côte d’Ivoire…</div>});

type StageAction=Extract<MaterialAction,{type:"solution"|"show_route"|"sheet"|"show_image"|"render_image"}>;
interface View { id:number; action:StageAction }
interface ImageState { status:"loading"|"ready"|"error"; src?:string; text?:string }
const MAX_VIEWS=6;
const MODE_ICON:Record<StepMode,typeof Truck>={road:Truck,rail:TrainFront,sea:Ship,air:Plane,port:Anchor,warehouse:Warehouse,customs:ShieldCheck,heavy_lift:Construction,mining:Pickaxe,digital:Satellite,people:Users};
const MODE_LABEL:Record<StepMode,{fr:string;en:string}>={road:{fr:"Route",en:"Road"},rail:{fr:"Rail",en:"Rail"},sea:{fr:"Maritime",en:"Sea"},air:{fr:"Aérien",en:"Air"},port:{fr:"Port",en:"Port"},warehouse:{fr:"Entreposage",en:"Warehousing"},customs:{fr:"Douane",en:"Customs"},heavy_lift:{fr:"Heavy lift",en:"Heavy lift"},mining:{fr:"Mine",en:"Mine"},digital:{fr:"Visibilité",en:"Visibility"},people:{fr:"Équipe",en:"Team"}};
const isStage=(a:MaterialAction):a is StageAction=>["solution","show_route","sheet","show_image","render_image"].includes(a.type);
function titleOf(a:StageAction){return a.type==="solution"?a.solution.title:a.type==="show_route"?`Corridor ${a.route.replace("route-","")} · Côte d’Ivoire`:a.title;}
function imagePrompt(a:StageAction){return a.type==="render_image"?a.prompt:a.type==="solution"?a.solution.imagePrompt:undefined;}
function screenLabel(s:Screen,en:boolean){const l=STUDIO_LINKS.find(x=>x.screen===s);if(l)return en?l.en:l.fr;const fr:Partial<Record<Screen,string>>={home:"Accueil",games:"Expériences",corporate:"Présentation",careers:"Emploi",satisfaction:"Avis",market:"Performance",canvas:"Canvas Lara"};return fr[s]??s;}

// Vue Live : chaque instruction donnée à Lara (voix ou texte) se matérialise ici, à côté de la conversation.
export function LiveStage(){
  const k=useKiosk();const en=k.lang==="en";
  const [views,setViews]=useState<View[]>([]);const [active,setActive]=useState<number|null>(null);const [images,setImages]=useState<Record<number,ImageState>>({});
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
    if(a.type==="show_image"||(a.type==="render_image"&&img?.src)){const link=document.createElement("a");link.href=img?.src??"";link.download="Lara-image.png";link.click();return;}
    if(a.type==="solution"){const s=a.solution;downloadFile("Africa Global Logistics-solution.txt",[s.title,"",s.summary,"",en?"STEPS":"ÉTAPES",...s.steps.map((st,i)=>`${i+1}. ${st.label}${st.mode?` [${MODE_LABEL[st.mode][en?"en":"fr"]}]`:""} — ${st.detail}`),"",...(s.considerations.length?[en?"TO VALIDATE":"À VALIDER",...s.considerations.map(c=>`• ${c.label} : ${c.text}`),""]:[]),en?"Working solution prepared by Lara — to be validated with Africa Global Logistics teams.":"Solution de travail préparée par Lara — à valider avec les équipes Africa Global Logistics."].join("\n"));return;}
    downloadFile("Africa Global Logistics-fiche.txt",title+"\n\n"+(a.type==="sheet"?a.body:"Corridor illustratif — étude de route nécessaire."));
  }
  const isImage=a.type==="show_image"||a.type==="render_image";

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
        <button className="outline-btn" disabled={isImage&&img?.status!=="ready"} onClick={()=>{download();k.touch();}}><Download size={18}/>{isImage?"Télécharger l’image":"Télécharger la fiche"}</button>
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
