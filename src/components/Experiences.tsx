"use client";
import { ArrowUpRight } from "lucide-react";
import { useKiosk, type Screen } from "@/lib/store";
import { TopBar } from "./Chrome";

export function ExperiencesScreen() {
  const k=useKiosk(); const en=k.lang==="en";
  const items: { screen:Screen; title:string; desc:string; image:string; time:string }[] = [
    {screen:"mining",title:"MINING JOURNEY",desc:en?"Connect every stage of a mining project. Includes the Tokadeh case and an interactive challenge.":"Connectez les étapes d’un projet minier. Cas Tokadeh et défi interactif inclus.",image:"image19",time:"3 min"},
    {screen:"mission",title:"MISSION CONTROL",desc:en?"Choose your cargo, anticipate an incident and design a resilient logistics solution.":"Choisissez votre cargaison, anticipez l’incident et composez votre solution logistique.",image:"image26",time:"3 min"},
    {screen:"build",title:"BUILD AFRICA",desc:en?"Place infrastructure on a real map. Activate your own logistics corridor.":"Placez les infrastructures sur une vraie carte. Activez votre propre corridor.",image:"image1",time:"2 min"},
    {screen:"explore",title:"EXPLORE AFRICA GLOBAL LOGISTICS",desc:en?"Touch the links in the supply chain. Reveal physical flows and information flows.":"Touchez les maillons de la chaîne. Révélez les flux physiques et les flux de données.",image:"image7",time:"2 min"},
    {screen:"vision",title:"VISION LAB",desc:en?"Show a plan or equipment. Talk with Lara while the camera is active.":"Montrez un plan ou un équipement. Échangez avec Lara, caméra active.",image:"image25",time:"2 min"},
    {screen:"market",title:"PERFORMANCE & DATA",desc:en?"Understand market signals and compare the impact of logistical decisions.":"Comprenez les signaux de marché et comparez l’impact des décisions logistiques.",image:"image21",time:"2 min"},
    {screen:"canvas",title:"CANVAS LARA",desc:en?"Create live with Lara: generated images, diagrams and narrated storyboards.":"Créez en direct avec Lara : images générées, schémas et storyboards narrés.",image:"image22",time:"3 min"},
  ];
  return <div className="experience-page"><TopBar title={en?"PLAY & EXPLORE":"JOUER & EXPLORER"} subtitle={en?"Touch. Decide. Connect.":"Touchez. Décidez. Connectez."}/><main className="experience-content"><div className="section-heading"><div><span className="eyebrow">YOUR LOGISTICS PLAYGROUND</span><h2>{en?"Take control of the journey.":"Prenez les commandes du voyage."}</h2><p>{en?"Short, interactive experiences to understand what integrated logistics makes possible.":"Des expériences courtes et interactives pour comprendre ce que rend possible une logistique intégrée."}</p></div></div><div className="feature-grid">{items.map(i=><button className="feature-card" key={i.screen} onClick={()=>k.go(i.screen)}><img src={`/assets/template/${i.image}.webp`} alt=""/><div className="feature-card-copy"><span className="eyebrow">{i.time} · Africa Global Logistics EXPERIENCE</span><h3>{i.title}</h3><p>{i.desc}</p><span className="text-action">{en?"Start":"Commencer"}<ArrowUpRight size={18}/></span></div></button>)}</div></main></div>;
}
