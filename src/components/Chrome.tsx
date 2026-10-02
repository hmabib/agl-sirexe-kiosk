"use client";
import { motion } from "framer-motion";
import { Home, Volume2, VolumeX, MoveUpRight } from "lucide-react";
import { useKiosk } from "@/lib/store";
import { AglLogo } from "./Orb";
import { ContinentMap } from "./ContinentMap";
import { sfx, stopAmbient, startAmbient } from "./Fx";

export function AttractScreen() {
  const k = useKiosk(); const en = k.lang === "en";
  return <motion.div initial={{opacity:0}} animate={{opacity:1}} className="attract-page" onClick={()=>{k.touch();sfx("whoosh");k.go("home");}}>
    <div className="attract-photo"/>
    <div className="attract-top"><AglLogo size="lg"/><span className="eyebrow">SIREXE · CÔTE D’IVOIRE</span></div>
    <div className="attract-body"><div className="attract-copy"><span className="eyebrow">AFRICA GLOBAL LOGISTICS</span><h1>{en?"CONNECTING":"CONNECTER"}<br/><span className="gold-text">{en?"POSSIBILITIES.":"LES POSSIBLES."}</span></h1><p>{en?"Resources. Infrastructure. Markets.\nOne connected journey.":"Ressources. Infrastructures. Marchés.\nUne même chaîne de valeur."}</p><button className="brand-btn attract-cta">{en?"TOUCH TO EXPLORE":"TOUCHEZ POUR EXPLORER"}<MoveUpRight/></button><span className="attract-hint">{en?"An immersive journey into African logistics":"Une immersion dans la logistique africaine"}</span></div><div className="attract-map"><ContinentMap/></div></div>
    <div className="attract-bottom"><span>Discover · Connect · Move · Grow</span><span>Africa Global Logistics × SIREXE</span></div>
  </motion.div>;
}
export function TopBar({ title, subtitle }: { title:string; subtitle?:string }) {
  const k=useKiosk();
  return <div className="experience-topbar"><button className="logo-home" aria-label="Accueil Africa Global Logistics" onClick={()=>k.go("home")}><AglLogo size="sm"/></button><div className="topbar-title"><h1>{title}</h1>{subtitle&&<p>{subtitle}</p>}</div><div className="topbar-controls"><button className={k.lang==="fr"?"active":""} onClick={()=>k.setLang("fr")}>FR</button><button className={k.lang==="en"?"active":""} onClick={()=>k.setLang("en")}>EN</button><button aria-label="Son" onClick={()=>{k.toggleSound();try{const mute=k.soundOn;localStorage.setItem("agl_mute",mute?"1":"0");mute?stopAmbient():startAmbient();}catch{}}}>{k.soundOn?<Volume2 size={22}/>:<VolumeX size={22}/>}</button><button aria-label="Accueil" onClick={()=>k.go("home")}><Home size={22}/></button></div></div>;
}
