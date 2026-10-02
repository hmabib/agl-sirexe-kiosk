"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKiosk, logEvent } from "@/lib/store";
import { TopBar } from "./Chrome";
import { WestAfricaMap, iconFor } from "./Maps";
import { ConfettiBurst, ScoreRing, sfx } from "./Fx";

const PALETTE = ["MINE", "ENERGY", "INDUSTRY", "LOGISTICS HUB", "RAIL", "ROAD", "PORT", "MARITIME ROUTE", "WAREHOUSE"];

export function BuildScreen() {
  const k = useKiosk();
  const [selected, setSelected] = useState<string>("MINE");
  const [placed, setPlaced] = useState<{ id: string; x: number; y: number }[]>([]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [wowStep, setWowStep] = useState(0);

  function place(x: number, y: number) {
    const np = [...placed, { id: selected, x, y }];
    setPlaced(np);
    k.setCorridor([...k.corridor, selected]);
    k.touch(); sfx("pop");
    // auto-suggest connect
    if (np.length >= 2) logEvent("build_connect", { corridor: np.map((p) => p.id) });
  }

  function activate() {
    sfx("whoosh");
    setCountdown(3);
    setWowStep(0);
    logEvent("build_africa_completed", { corridor: placed.map((p) => p.id) });
    const seq = [3, 2, 1];
    seq.forEach((n, i) => setTimeout(() => setCountdown(n), i * 900));
    setTimeout(() => {
      setCountdown(null); k.setCorridorActive(true); sfx("success");
      [1, 2, 3, 4].forEach((s, i) => setTimeout(() => { setWowStep(s); sfx("whoosh"); }, 900 + i * 1400));
    }, 2800);
    setTimeout(() => { k.setFinaleStats({ Maillons: placed.length, Corridor: "ACTIF ⚡", Score: Math.min(98, 18 + placed.length * 11 + new Set(placed.map((p) => p.id)).size * 4) }); k.go("finale"); }, 10500);
  }

  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll" style={{ background: "linear-gradient(180deg,#0a0f22,#001D3D 60%,#00060f)" }}>
      <TopBar title="BUILD AFRICA" subtitle="Glissez les infrastructures — connectez la ressource au marché." />
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-32">
        {/* palette */}
        <div className="glass rounded-3xl p-4 mt-4">
          <div className="text-xs tracking-[0.25em] text-[#D6A84B] font-bold px-2">BARRE D’OBJETS — TOUCHEZ PUIS PLACEZ SUR LA CARTE</div>
          <div className="flex gap-2 overflow-x-auto mt-3 pb-1">
            {PALETTE.map((p) => (
              <button key={p} onClick={() => { setSelected(p); k.touch(); }}
                className={`shrink-0 h-16 px-5 rounded-2xl font-extrabold text-sm border-2 touch-target ${selected === p ? "border-[#F2D28B] bg-[#D6A84B]/25" : "border-white/10 bg-white/5"}`}>
                {iconFor(p)} {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-5 mt-5">
          <div className="md:col-span-2 glass rounded-3xl p-4 min-h-[420px]">
            <WestAfricaMap placed={placed} onPlace={place} />
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setPlaced([]); k.setCorridor([]); k.setCorridorActive(false); }} className="h-12 px-5 rounded-xl bg-white/10 font-bold">↺ Reset</button>
              {placed.length >= 2 && <div className="flex-1 h-12 rounded-xl bg-[#D6A84B]/15 border border-[#D6A84B]/50 flex items-center justify-center font-bold text-[#F2D28B]">✨ CONNECTER ? — ligne dorée tracée automatiquement</div>}
            </div>
          </div>
          <div className="space-y-4">
            <div className="glass rounded-3xl p-6">
              <ScoreRing score={Math.min(98, 18 + placed.length * 11 + new Set(placed.map((p) => p.id)).size * 4)} label="SCORE CORRIDOR" />
              <h3 className="text-gold-gradient font-extrabold text-xl mt-4">VOTRE CORRIDOR CRÉE DE LA VALEUR</h3>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {["CONNECTIVITY", "TRADE", "RESILIENCE", "INDUSTRIAL ACCESS", "LOGISTICS CAPACITY", "REGIONAL INTEGRATION"].map((l) => (
                  <div key={l} className="rounded-xl bg-black/30 border border-white/10 p-3">
                    <div className="text-[10px] font-bold text-white/70">{l}</div>
                    <div className="text-emerald-300 font-extrabold">↑ +{20 + placed.length * 8}%</div>
                  </div>
                ))}
              </div>
              <div className="text-xs text-white/40 mt-2">Impact indicatif — expérience de simulation.</div>
            </div>
            {placed.length >= 3 && !k.corridorActive && (
              <button onClick={activate} className="halo-btn w-full h-16 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg touch-target">
                ⚡ ACTIVER LE CORRIDOR
              </button>
            )}
            <button onClick={async () => {
              k.setAiOpen(true);
              try {
                const m = localStorage.getItem("agl_model") || undefined;
                const r = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: `Analyse ce corridor construit par le visiteur : ${placed.map((p) => p.id).join(" → ")}. Donne un avis pro en <100 mots + ce qu'AGL pourrait apporter.`, context: k.getExperienceContext(), lang: k.lang, model: m }) });
                const d = await r.json();
                k.setLastAiReply(d.reply ?? "");
              } catch {}
            }} className="w-full h-14 rounded-2xl bg-white/10 font-bold border border-[#D6A84B]/30">🤖 AGL AI ANALYSE MON CORRIDOR</button>
            {k.lastAiReply && <div className="rounded-2xl bg-[#003F73]/60 border border-[#D6A84B]/40 p-4 text-sm">🤖 {k.lastAiReply}</div>}
          </div>
        </div>
      </div>

      {/* WOW overlay */}
      <ConfettiBurst fire={k.corridorActive ? 1 : 0} />
      <AnimatePresence>
        {(countdown !== null || k.corridorActive) && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center text-center p-10">
            {countdown !== null ? (
              <motion.div key={countdown} initial={{ scale: 0.5 }} animate={{ scale: 1.2 }} className="text-[160px] font-extrabold text-gold-gradient">{countdown}</motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                <div className="text-6xl mb-4">🚆💨🚚⚓🚢</div>
                {wowStep >= 1 && <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-extrabold">INFRASTRUCTURE CONNECTS.</motion.h2>}
                {wowStep >= 2 && <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-extrabold text-gold-gradient mt-2">LOGISTICS ACCELERATES.</motion.h2>}
                {wowStep >= 3 && <motion.h2 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-6xl font-extrabold mt-2">AFRICA MOVES FORWARD.</motion.h2>}
                {wowStep >= 4 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 text-[#D6A84B] tracking-[0.3em] font-bold">CORRIDOR ACTIVÉ • {placed.length} maillons • before → after • flux animés</motion.div>}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
