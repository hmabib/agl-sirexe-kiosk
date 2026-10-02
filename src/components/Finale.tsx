"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { useKiosk, logEvent } from "@/lib/store";
import { AglLogo } from "./Orb";
import { ConfettiBurst, ParticleField } from "./Fx";

export function FinaleScreen() {
  const k = useKiosk();
  const [lead, setLead] = useState({ name: "", company: "", role: "", email: "", sector: "Mining" });
  const [sent, setSent] = useState(false);

  async function submit() {
    logEvent("lead_created", { sector: lead.sector });
    try { await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) }); } catch {}
    setSent(true);
  }

  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll flex flex-col items-center justify-center text-center p-8" style={{ background: "radial-gradient(900px 700px at 50% 30%, #003F73, #00060f)" }}>
      <div className="absolute inset-0 pointer-events-none"><ParticleField density={80} /></div>
      <ConfettiBurst fire={1} />
      <div className="relative flex flex-col items-center">
      <AglLogo size="lg" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-8">
        <h1 className="text-4xl md:text-6xl font-extrabold">FROM RESOURCE TO MARKET.</h1>
        <h2 className="text-3xl md:text-5xl font-extrabold text-white/70 mt-1">FROM INFRASTRUCTURE TO OPPORTUNITY.</h2>
        <h2 className="text-4xl md:text-6xl font-extrabold text-gold-gradient mt-2">AGL CONNECTS THE JOURNEY.</h2>
        <div className="tracking-[0.35em] text-[#D6A84B] font-bold mt-4 text-sm">DISCOVER • CONNECT • MOVE • GROW</div>
      </motion.div>
      {k.finaleStats && (
        <div className="flex flex-wrap justify-center gap-3 mt-6">
          {Object.entries(k.finaleStats).map(([l, v]) => (
            <div key={l} className="glass rounded-2xl px-6 py-3"><div className="text-xs text-[#D6A84B] font-bold">{l}</div><div className="text-xl font-extrabold">{String(v)}</div></div>
          ))}
        </div>
      )}
      <div className="glass rounded-3xl p-6 mt-8 w-full max-w-2xl text-left">
        <h3 className="font-extrabold text-xl">ENVIE D’ALLER PLUS LOIN ?</h3>
        <p className="text-white/60 text-sm">Recevez votre scénario ou échangez avec un expert AGL. QR / contact — jamais forcé.</p>
        {sent ? (
          <div className="mt-4 text-emerald-300 font-bold text-lg">✓ Merci {lead.name || "!" } — un expert AGL vous recontactera.</div>
        ) : (
          <div className="grid md:grid-cols-2 gap-3 mt-4">
            <input value={lead.name} onChange={(e) => setLead({ ...lead, name: e.target.value })} placeholder="Nom" className="h-14 rounded-xl bg-black/40 border border-white/15 px-4" />
            <input value={lead.company} onChange={(e) => setLead({ ...lead, company: e.target.value })} placeholder="Entreprise" className="h-14 rounded-xl bg-black/40 border border-white/15 px-4" />
            <input value={lead.role} onChange={(e) => setLead({ ...lead, role: e.target.value })} placeholder="Fonction" className="h-14 rounded-xl bg-black/40 border border-white/15 px-4" />
            <input value={lead.email} onChange={(e) => setLead({ ...lead, email: e.target.value })} placeholder="Email" className="h-14 rounded-xl bg-black/40 border border-white/15 px-4" />
            <select value={lead.sector} onChange={(e) => setLead({ ...lead, sector: e.target.value })} className="h-14 rounded-xl bg-black/40 border border-white/15 px-4 md:col-span-2">
              {["Mining", "Energy", "Infrastructure", "Logistics", "Industrial", "Other"].map((s) => <option key={s}>{s}</option>)}
            </select>
            <button onClick={submit} className="md:col-span-2 h-16 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg touch-target">ÊTRE CONTACTÉ →</button>
          </div>
        )}
      </div>
      <div className="flex gap-3 mt-6 pb-4">
        <button onClick={() => { k.touch(); k.go("home"); }} className="h-16 px-8 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold touch-target">NOUVELLE EXPÉRIENCE</button>
        <button onClick={() => { k.setAiOpen(true); k.touch(); }} className="h-16 px-8 rounded-2xl bg-white/10 font-bold touch-target">PARLER À UN EXPERT AGL 🤖</button>
      </div>
      </div>
    </div>
  );
}
