"use client";
import { motion } from "framer-motion";
import { useKiosk } from "@/lib/store";
import { AfricaCorridors } from "./Maps";
import { AglLogo } from "./Orb";
import { ParticleField, ModelBadge, sfx, stopAmbient, startAmbient } from "./Fx";
const Logo = AglLogo;

export function AttractScreen() {
  const k = useKiosk();
  return (
    <motion.div
      onClick={() => { k.touch(); k.go("home"); }}
      className="absolute inset-0 cursor-pointer overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ background: "radial-gradient(1200px 800px at 50% 30%, #003F73 0%, #001D3D 55%, #00060f 100%)" }}
    >
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(rgba(214,168,75,.25) 1px, transparent 1px)", backgroundSize: "42px 42px" }} />
      <div className="absolute inset-0"><ParticleField density={90} /></div>
      <div className="relative h-full max-w-6xl mx-auto flex flex-col items-center justify-center p-10 text-center">
        <Logo size="lg" />
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-8">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">CONNECTING AFRICA.</h1>
          <h2 className="text-4xl md:text-6xl font-extrabold text-gold-gradient mt-2">POWERING POSSIBILITIES.</h2>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 1 }}
          className="w-[320px] h-[340px] md:w-[380px] md:h-[400px] my-6"
        >
          <AfricaCorridors />
        </motion.div>
        <p className="text-white/70 max-w-xl">Mines • Énergie • Ports • Rail • Corridors • Maritime — touchez pour voir comment AGL connecte la ressource au marché.</p>
        <motion.button
          className="halo-btn mt-8 h-[72px] px-12 rounded-full bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] text-xl font-extrabold tracking-widest"
          animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 2, repeat: Infinity }}
        >
          {k.lang === "fr" ? "TOUCHEZ POUR EXPLORER" : "TOUCH TO EXPERIENCE AGL"}
        </motion.button>
        <div className="mt-6 flex gap-3 text-xs text-white/50">
          <span>SIREXE • Côte d’Ivoire</span><span>•</span><span>Simulation illustrative</span><span>•</span><span>FR | EN</span>
        </div>
      </div>
    </motion.div>
  );
}

export function TopBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const k = useKiosk();
  return (
    <div className="flex items-center justify-between gap-4 px-6 md:px-10 pt-5">
      <button onClick={() => { k.touch(); k.go("home"); }} className="flex items-center gap-3">
        <AglLogo size="sm" />
      </button>
      <div className="text-center flex-1">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">{title}</h1>
        {subtitle && <p className="text-white/65 text-sm md:text-base mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <ModelBadge />
        <button onClick={() => { k.setLang("fr"); k.touch(); sfx("pop"); }} className={`h-12 px-4 rounded-xl font-bold ${k.lang === "fr" ? "bg-[#D6A84B] text-[#001D3D]" : "bg-white/10"}`}>FR</button>
        <button onClick={() => { k.setLang("en"); k.touch(); sfx("pop"); }} className={`h-12 px-4 rounded-xl font-bold ${k.lang === "en" ? "bg-[#D6A84B] text-[#001D3D]" : "bg-white/10"}`}>EN</button>
        <button onClick={() => { const z = k.kioskZoom >= 1.4 ? 1 : +(k.kioskZoom + 0.15).toFixed(2); k.setKioskZoom(z); }} className="h-12 px-4 rounded-xl bg-white/10 font-bold" title="Zoom kiosque">⤢ {Math.round(k.kioskZoom * 100)}%</button>
        <button onClick={() => { k.toggleSound(); try { const muted = localStorage.getItem("agl_mute") === "1"; localStorage.setItem("agl_mute", muted ? "0" : "1"); if (!muted) stopAmbient(); else startAmbient(); } catch {} }} className="h-12 w-12 rounded-xl bg-white/10 text-xl">{k.soundOn ? "🔊" : "🔇"}</button>
        <button onClick={() => { k.touch(); k.go("attract"); }} className="h-12 w-12 rounded-xl bg-white/10 text-xl">⌂</button>
      </div>
    </div>
  );
}
