"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { useKiosk } from "@/lib/store";
import { TopBar } from "./Chrome";
import { Zoomable } from "./Mission";
import { sfx } from "./Fx";

const Globe3D = dynamic(() => import("./Globe3D").then((m) => m.Globe3D), {
  ssr: false,
  loading: () => <div className="h-[340px] flex items-center justify-center text-[#D6A84B] animate-pulse text-xl">🌍 Chargement du globe…</div>,
});

const NODES = [
  { id: "mine", icon: "⛏️", title: "MINE", desc: "Production, équipements, besoins logistiques massifiés.", exp: ["Project Logistics", "Heavy Lift", "Route Survey"] },
  { id: "camion", icon: "🚚", title: "CAMION", desc: "Transport routier, tracking temps réel, sûreté & coordination.", exp: ["Transport & Logistics", "Tracking", "HSE Coordination"] },
  { id: "hub", icon: "🏬", title: "HUB LOGISTIQUE", desc: "Stockage, consolidation, contrôle qualité, préparation.", exp: ["Warehousing", "Consolidation", "Customs Coordination"] },
  { id: "rail", icon: "🚆", title: "RAIL", desc: "Transport massifié bas-carbone sur corridors dédiés.", exp: ["Rail Logistics", "Corridor Management", "Massified Flows"] },
  { id: "port", icon: "⚓", title: "PORT / TERMINAL", desc: "Manutention, terminal ops, connexion maritime mondiale.", exp: ["Terminal Operations", "Cargo Handling", "Maritime Connectivity"] },
  { id: "navire", icon: "🚢", title: "NAVIRE", desc: "Connexion internationale vers les marchés.", exp: ["Freight Forwarding", "Global Network", "Supply-Chain Visibility"] },
];

export function ExploreScreen() {
  const k = useKiosk();
  const [zoomed, setZoomed] = useState(false);
  const sel = NODES.find((n) => n.id === k.selectedNode);

  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll" style={{ background: "radial-gradient(900px 600px at 70% 20%, #003F73, #00060f)" }}>
      <TopBar title="EXPLORE AGL" subtitle="Touchez chaque maillon — du fond de la mine au pont du navire." />
      {!zoomed ? (
        <div className="max-w-3xl mx-auto text-center px-6 py-6">
          <Globe3D height={360} onSelectCI={() => { setZoomed(true); k.touch(); sfx("whoosh"); }} />
          <h2 className="text-3xl font-extrabold mt-2">L’Afrique vue de l’espace — globe 3D temps réel</h2>
          <p className="text-white/55 text-sm mt-1">Glissez pour pivoter • Touchez le point d’or = Côte d’Ivoire</p>
          <button onClick={() => { setZoomed(true); k.touch(); sfx("whoosh"); }} className="halo-btn mt-5 h-16 px-10 rounded-full bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg">
            📍 TOUCHER LA CÔTE D’IVOIRE — ZOOM
          </button>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-6 md:px-10 pb-32 grid md:grid-cols-5 gap-5">
          <div className="md:col-span-3 glass rounded-3xl p-4">
            <div className="flex gap-2 px-2 pb-2">
              <button onClick={() => { k.setXray(!k.xray); k.touch(); }} className={`flex-1 h-14 rounded-xl font-extrabold ${k.xray ? "bg-[#D6A84B] text-[#001D3D]" : "bg-white/10"}`}>🔍 X-RAY SUPPLY CHAIN</button>
              <button onClick={() => { k.setDataView(!k.dataView); k.touch(); }} className={`flex-1 h-14 rounded-xl font-extrabold ${k.dataView ? "bg-[#D6A84B] text-[#001D3D]" : "bg-white/10"}`}>📊 DATA VIEW</button>
            </div>
            <Zoomable>
              <div className={`rounded-2xl p-4 transition-all ${k.xray ? "opacity-90" : ""}`} style={k.xray ? { background: "rgba(127,179,232,.08)" } : {}}>
                {/* twin strip: nodes as interactive chain */}
                <div className="flex items-center justify-between text-4xl md:text-5xl px-2 py-6 overflow-x-auto gap-2">
                  {NODES.map((n, i) => (
                    <div key={n.id} className="flex items-center gap-2 shrink-0">
                      <button onClick={() => { k.setSelectedNode(n.id); k.touch(); }}
                        className={`w-20 h-20 rounded-3xl text-4xl border-2 transition-all ${k.selectedNode === n.id ? "border-[#F2D28B] bg-[#D6A84B]/25 scale-110 shadow-[0_0_30px_rgba(214,168,75,.6)]" : "border-white/15 bg-white/5"}`}>
                        {n.icon}
                      </button>
                      {i < NODES.length - 1 && <span className="text-[#D6A84B] text-2xl flow-line">⟶</span>}
                    </div>
                  ))}
                </div>
                {k.xray && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs font-bold">
                    {[["Marchandise 🟡", "#F2D28B"], ["Documents 📄", "#7fb3e8"], ["Données 📡", "#5df2c8"], ["Douane 🛃", "#c99cff"], ["Personnes 👷", "#ffb3b3"]].map(([l, c]) => (
                      <div key={l} className="rounded-xl p-2 bg-black/40 border border-white/10" style={{ color: c as string }}>{l}<div className="mt-1 h-1 rounded-full animate-pulse" style={{ background: c as string }} /></div>
                    ))}
                  </div>
                )}
                {k.dataView && (
                  <div className="mt-3 rounded-2xl bg-black/50 border border-[#5df2c8]/30 p-4 font-mono text-xs md:text-sm text-[#5df2c8] grid grid-cols-2 gap-2">
                    <span>ETD Abidjan: 08:00Z ✓</span><span>ETA San Pedro: +26h</span>
                    <span>Shipment: AGL-88412 • IN TRANSIT</span><span>Position: 6.8°N 5.2°W 📍</span>
                    <span>Docs: BL ✓ Douane ⏳</span><span>Alertes: 0 critique</span>
                  </div>
                )}
                <p className="text-center text-white/40 text-sm mt-3">From physical flow to intelligent flow.</p>
              </div>
            </Zoomable>
          </div>
          <div className="md:col-span-2">
            {sel ? (
              <motion.div key={sel.id} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="glass glass-selected rounded-3xl p-7">
                <div className="text-6xl">{sel.icon}</div>
                <h3 className="text-3xl font-extrabold mt-3">{sel.title}</h3>
                <p className="text-white/75 mt-2 text-lg">{sel.desc}</p>
                <div className="mt-5 text-xs tracking-[0.25em] text-[#D6A84B] font-bold">AGL EXPERTISE</div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sel.exp.map((e) => <span key={e} className="px-3 h-10 flex items-center rounded-full bg-[#D6A84B]/15 border border-[#D6A84B]/50 text-sm font-bold">{e}</span>)}
                </div>
                <button onClick={() => { k.setAiOpen(true); k.touch(); }} className="mt-6 w-full h-14 rounded-xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold">🤖 QUESTION SUR CETTE ÉTAPE ?</button>
              </motion.div>
            ) : (
              <div className="glass rounded-3xl p-7 text-center text-white/60 text-lg">👆 Touchez un maillon de la chaîne pour révéler son rôle et l’expertise AGL associée.</div>
            )}
            <button onClick={() => { k.setFinaleStats({ Maillons: 6, "Vue X-Ray": k.xray ? "ON" : "OFF" }); k.go("finale"); }} className="mt-4 w-full h-14 rounded-2xl bg-white/10 font-bold">TERMINER L’EXPLORATION →</button>
          </div>
        </div>
      )}
    </div>
  );
}
