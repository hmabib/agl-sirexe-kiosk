"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Home, Volume2, VolumeX, MoveUpRight } from "lucide-react";
import { useKiosk } from "@/lib/store";
import { AglLogo } from "./Orb";
import { ContinentMap } from "./ContinentMap";
import { sfx } from "./Fx";

export function AttractScreen() {
  const k = useKiosk(); const en = k.lang === "en";
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} className="attract-page" onClick={()=>{k.touch();sfx("whoosh");k.go("home");}}>
    <HeroFilm en={en}/>
    <div className="attract-photo"/>
    <div className="attract-top"><AglLogo size="lg"/><span className="eyebrow">SIREXE · CÔTE D’IVOIRE</span></div>
    <div className="attract-body"><motion.div className="attract-copy" initial="hidden" animate="show" variants={{show:{transition:{staggerChildren:.14,delayChildren:.25}}}}><motion.span variants={REVEAL} className="eyebrow">AFRICA GLOBAL LOGISTICS</motion.span><motion.h1 variants={REVEAL}>{en?"CONNECTING":"CONNECTER"}<br/><span className="gold-text">{en?"POSSIBILITIES.":"LES POSSIBLES."}</span></motion.h1><motion.p variants={REVEAL}>{en?"Resources. Infrastructure. Markets.\nOne connected journey.":"Ressources. Infrastructures. Marchés.\nUne même chaîne de valeur."}</motion.p><motion.button variants={REVEAL} className="brand-btn attract-cta">{en?"TOUCH TO EXPLORE":"TOUCHEZ POUR EXPLORER"}<MoveUpRight/></motion.button><motion.span variants={REVEAL} className="attract-hint">{en?"An immersive journey into African logistics":"Une immersion dans la logistique africaine"}</motion.span></motion.div><div className="attract-map"><ContinentMap/></div></div>
    <div className="attract-bottom"><span>Discover · Connect · Move · Grow</span><span>Africa Global Logistics × SIREXE</span></div>
  </motion.div>;
}
const REVEAL={hidden:{opacity:0,y:26,filter:"blur(8px)"},show:{opacity:1,y:0,filter:"blur(0px)",transition:{duration:.8,ease:[0.22,1,0.36,1]}}} as const;
// Chapitres calés sur les plans du film d’accueil (continent → mer → port → route).
const CHAPTERS=[{at:0,fr:"Connecter le continent",en:"Connecting the continent"},{at:4.4,fr:"Acheminer par la mer",en:"Shipping by sea"},{at:8.5,fr:"Opérer les ports",en:"Operating ports"},{at:12.6,fr:"Livrer jusqu’au site",en:"Delivering to site"}];
function HeroFilm({en}:{en:boolean}){
  const video=useRef<HTMLVideoElement>(null);const [chapter,setChapter]=useState(0);const [progress,setProgress]=useState(0);const [still,setStill]=useState(false);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if(window.matchMedia("(prefers-reduced-motion: reduce)").matches){setStill(true);return;}
    const v=video.current;if(!v)return;
    const tick=()=>{const t=v.currentTime;let c=0;CHAPTERS.forEach((ch,i)=>{if(t>=ch.at)c=i;});setChapter(c);const end=CHAPTERS[c+1]?.at??(v.duration||17.2);setProgress(Math.min(1,(t-CHAPTERS[c].at)/(end-CHAPTERS[c].at)));};
    v.addEventListener("timeupdate",tick);v.play().catch(()=>setStill(true));
    return()=>v.removeEventListener("timeupdate",tick);
  },[]);
  return <>
    <video ref={video} className="attract-video" src="/video/agl-hero.mp4" poster="/video/agl-hero-poster.jpg" muted loop playsInline preload="auto" autoPlay={!still} aria-hidden="true"/>
    {!still&&<div className="attract-chapters" aria-hidden="true">
      <div className="attract-chapter-bars">{CHAPTERS.map((c,i)=><span key={c.fr}><i style={{transform:`scaleX(${i<chapter?1:i===chapter?progress:0})`}}/></span>)}</div>
      <AnimatePresence mode="wait"><motion.span key={chapter} className="attract-chapter-label" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} transition={{duration:.45}}>{String(chapter+1).padStart(2,"0")} · {en?CHAPTERS[chapter].en:CHAPTERS[chapter].fr}</motion.span></AnimatePresence>
    </div>}
  </>;
}
export function TopBar({ title, subtitle }: { title:string; subtitle?:string }) {
  const k=useKiosk();
  return <div className="experience-topbar"><button className="logo-home" aria-label="Accueil Africa Global Logistics" onClick={()=>k.go("home")}><AglLogo size="sm"/></button><div className="topbar-title"><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="topbar-controls"><button className={k.lang==="fr"?"active":""} onClick={()=>k.setLang("fr")}>FR</button><button className={k.lang==="en"?"active":""} onClick={()=>k.setLang("en")}>EN</button><button aria-label="Son" onClick={()=>k.toggleSound()}>{k.soundOn?<Volume2 size={22}/>:<VolumeX size={22}/>}</button><button aria-label="Accueil" onClick={()=>k.go("home")}><Home size={22}/></button></div></div>;
}
