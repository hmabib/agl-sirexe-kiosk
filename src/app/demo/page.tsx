"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// /demo — autoplay 75s : mine → équipement → incident → multimodal → port → navire
const STEPS = [
  { t: 0, title: "MINE ⛏️", sub: "Une ressource au nord de la Côte d'Ivoire.", emoji: "⛏️" },
  { t: 12, title: "ÉQUIPEMENT 80 T", sub: "Cargaison projet : étude de route, moyens spécialisés.", emoji: "🚜" },
  { t: 24, title: "INCIDENT 🚧", sub: "Route coupée — la borne propose : rerouter.", emoji: "🚧" },
  { t: 38, title: "SOLUTION MULTIMODALE", sub: "Route + Rail + Terminal : résilience ★★★★☆.", emoji: "🚆" },
  { t: 52, title: "PORT ⚓", sub: "Terminal ops, manutention, douane coordonnée.", emoji: "⚓" },
  { t: 64, title: "NAVIRE 🚢", sub: "Cap sur le marché international.", emoji: "🚢" },
];

export default function DemoPage() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((v) => (v + 1) % STEPS.length), 12000);
    const end = setTimeout(() => { window.location.href = "/"; }, 78000);
    return () => { clearInterval(id); clearTimeout(end); };
  }, []);
  const s = STEPS[i];
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center text-center text-white p-10" style={{ background: "radial-gradient(900px 700px at 50% 30%, #003F73, #00060f)" }}>
      <div className="text-xs tracking-[0.4em] text-[#D6A84B] font-bold">DÉMO VIP • 75 s • AGL × SIREXE</div>
      <motion.div key={i} initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="mt-6">
        <div className="text-[120px]">{s.emoji}</div>
        <h1 className="text-5xl md:text-7xl font-extrabold">{s.title}</h1>
        <p className="text-xl text-white/70 mt-3">{s.sub}</p>
      </motion.div>
      <div className="flex gap-2 mt-10">
        {STEPS.map((_, j) => <div key={j} className={`h-2 w-16 rounded-full ${j <= i ? "bg-[#D6A84B]" : "bg-white/15"}`} />)}
      </div>
      <a href="/" className="mt-8 h-14 px-8 rounded-2xl bg-white/10 font-bold flex items-center">✕ Quitter la démo</a>
    </div>
  );
}
