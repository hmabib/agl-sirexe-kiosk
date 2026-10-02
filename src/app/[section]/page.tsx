import { notFound } from "next/navigation";
import KioskApp from "@/components/KioskApp";
import type { Screen } from "@/lib/store";
const routes:Record<string,Screen>={accueil:"home",experiences:"games",mission:"mission",explore:"explore",build:"build",vision:"vision",mining:"mining",presentation:"corporate","rendez-vous":"appointment",emploi:"careers",cotation:"quotation",satisfaction:"satisfaction",performance:"market",resultats:"finale"};
export function generateStaticParams(){return Object.keys(routes).map(section=>({section}));}
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;const screen=routes[section];if(!screen)notFound();return <KioskApp initialScreen={screen}/>;}
