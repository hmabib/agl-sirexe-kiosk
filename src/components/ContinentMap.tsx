"use client";
import { useId } from "react";
import geography from "@/lib/geography.json";

const project = (lon: number, lat: number) => [28+(lon+19)/71*490,20+(38-lat)/74*510];
const hubs = [
  { name: "Abidjan", lon: -4.02, lat: 5.32 }, { name: "San Pedro", lon: -6.64, lat: 4.75 },
  { name: "Dakar", lon: -17.44, lat: 14.7 }, { name: "Douala", lon: 9.7, lat: 4.05 },
  { name: "Lomé", lon: 1.22, lat: 6.13 }, { name: "Mombasa", lon: 39.67, lat: -4.04 },
  { name: "Durban", lon: 31.02, lat: -29.86 }, { name: "Buchanan", lon: -10.04, lat: 5.88 },
];
export function ContinentMap({ onExplore }: { onExplore?: () => void }) {
  const id = useId().replaceAll(":", "");
  const [ax,ay] = project(-4.02,5.32);
  return <svg viewBox="0 0 565 550" className="continent-map" role="img" aria-label="Carte géographique de l’Afrique, Côte d’Ivoire mise en évidence">
    <defs><radialGradient id={`${id}-light`}><stop stopColor="#30548a"/><stop offset="1" stopColor="#101f3a"/></radialGradient><filter id={`${id}-glow`}><feGaussianBlur stdDeviation="3"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle cx="290" cy="275" r="239" fill="none" stroke="#EED58E" strokeOpacity=".1" strokeDasharray="3 8"/>
    {geography.countries.map(c=><path key={c.iso} d={c.path} fill={c.iso === "CIV" ? "#EED58E" : `url(#${id}-light)`} stroke={c.iso === "CIV" ? "#fff0ba" : "#355078"} strokeWidth={c.iso === "CIV" ? 1.8 : .7} onClick={c.iso === "CIV" ? onExplore : undefined} style={{ cursor: c.iso === "CIV" ? "pointer" : "default" }}/>) }
    <g fill="none" stroke="#EED58E" strokeWidth="1.6" opacity=".75">
      {hubs.slice(2).map(h=> {const [x,y]=project(h.lon,h.lat); const d=`M${ax},${ay} Q${(ax+x)/2-35},${(ay+y)/2-55} ${x},${y}`;return <g key={h.name}><path d={d}/><circle r="2.4" fill="#fff0bb" filter={`url(#${id}-glow)`}><animateMotion path={d} dur="5s" repeatCount="indefinite"/></circle></g>;})}
    </g>
    {hubs.map(h=> {const[x,y]=project(h.lon,h.lat);return <g key={h.name}><circle cx={x} cy={y} r={h.name === "Abidjan" ? 5 : 3} fill="#EED58E"/><text x={x+7} y={y-7} fill="#fff" fontSize="9" fontFamily="Arial">{h.name}</text></g>;})}
    <g onClick={onExplore} style={{cursor:"pointer"}}><circle cx={ax} cy={ay} r="17" fill="none" stroke="#EED58E"><animate attributeName="r" values="8;22;8" dur="3s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;.2;1" dur="3s" repeatCount="indefinite"/></circle></g>
    <text x="280" y="534" textAnchor="middle" fontSize="8" fill="#8aa0bf">Géographie : Natural Earth · Liaisons de démonstration</text>
  </svg>;
}
