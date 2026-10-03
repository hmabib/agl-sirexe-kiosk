"use client";
import { ArrowUpRight, Boxes, CalendarDays, FileText, GraduationCap, Gamepad2, Building2, MessageSquareHeart, Pickaxe, ChartNoAxesCombined } from "lucide-react";
import { useKiosk, type Screen } from "@/lib/store";
import { TopBar } from "./Chrome";
import { ContinentMap } from "./ContinentMap";

export function HomeScreen() {
  const k = useKiosk(); const en = k.lang === "en";
  const cards: { screen: Screen; title: string; desc: string; icon: typeof CalendarDays; tag: string }[] = [
    { screen:"games", title:en?"Play & explore":"Jouer & explorer", desc:en?"Missions, corridors and AI vision":"Missions, corridors et vision IA", icon:Gamepad2,tag:"01 · EXPERIENCE" },
    { screen:"appointment",title:en?"Meet our experts":"Rencontrer nos experts",desc:en?"Prepare a business appointment":"Préparer un rendez-vous commercial",icon:CalendarDays,tag:"02 · BUSINESS" },
    { screen:"quotation",title:en?"Request a quotation":"Demander une cotation",desc:en?"The official Africa Global Logistics quotation form":"Le formulaire officiel Africa Global Logistics",icon:FileText,tag:"03 · YOUR PROJECT" },
    { screen:"careers",title:en?"Join the adventure":"Rejoindre l’aventure",desc:en?"Create your candidate profile":"Préparer votre candidature",icon:GraduationCap,tag:"04 · TALENTS" },
    { screen:"corporate",title:en?"Discover Africa Global Logistics":"Découvrir Africa Global Logistics",desc:en?"One network, integrated expertise":"Un réseau, des expertises intégrées",icon:Building2,tag:"05 · AFRICA GLOBAL LOGISTICS" },
    { screen:"projects",title:en?"Our projects in Côte d’Ivoire":"Nos projets en Côte d’Ivoire",desc:en?"Exceptional convoys, ports and rail in 3D":"Convois exceptionnels, ports et rail en 3D",icon:Boxes,tag:"06 · RÉALISATIONS" },
    { screen:"satisfaction",title:en?"Share your feedback":"Votre avis compte",desc:en?"Official satisfaction survey":"Enquête de satisfaction officielle",icon:MessageSquareHeart,tag:"07 · YOUR VOICE" },
  ];
  return <div className="experience-page home-page">
    <TopBar title="Africa Global Logistics × SIREXE" subtitle={en?"At the heart of Africa’s transformation":"Au cœur des transformations de l’Afrique"}/>
    <main className="experience-content">
      <div className="home-hero">
        <div className="home-copy"><span className="eyebrow">CÔTE D’IVOIRE · MINING · ENERGY · INFRASTRUCTURE</span>
          <h1>{en?"Your ambition.":"Votre ambition."}<br/><span className="gold-text">{en?"A connected Africa.":"Une Afrique connectée."}</span></h1>
          <p>{en?"From the mine to the market, discover the logistics that turns a project into an opportunity.":"De la mine au marché, découvrez la logistique qui transforme un projet en opportunité."}</p>
          <button className="brand-btn" onClick={()=>k.go("mining")}><Pickaxe size={23}/>{en?"ENTER THE MINING EXPERIENCE":"ENTRER DANS L’EXPÉRIENCE MINING"}<ArrowUpRight/></button>
          <button className="text-action" onClick={()=>k.go("market")}><ChartNoAxesCombined size={20}/>{en?"Performance & market insights":"Performance & lecture du marché"} →</button>
        </div>
        <div className="home-map"><ContinentMap onExplore={()=>k.go("explore")}/><div className="map-caption"><span className="status-dot"/> {en?"From Côte d’Ivoire to international markets":"De la Côte d’Ivoire aux marchés internationaux"}</div></div>
      </div>
      <div className="home-choices">{cards.map(c=><button key={c.screen} className="intent-card" onClick={()=>k.go(c.screen)}><div className="intent-top"><c.icon size={28}/><ArrowUpRight size={20}/></div><span className="eyebrow">{c.tag}</span><h2>{c.title}</h2><p>{c.desc}</p></button>)}</div>
    </main>
  </div>;
}
