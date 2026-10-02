"use client";
import { useState } from "react";
import Link from "next/link";
import { listRequests, exportRequestsCSV, type LocalRequest } from "@/lib/requests";
import { AdminStats } from "@/components/AdminStats";

interface ModelInfo { provider: string; configured: boolean; textModel: string; liveModel: string; ttsModel: string; knowledge: number }
interface AnalyticsEvent { ts: string; name: string; data: Record<string, unknown> }

export default function AdminPage() {
  const [pw, setPw] = useState("");
  const [ok, setOk] = useState(false);
  const [cfg, setCfg] = useState({ idle: 55, model: "gemini-3.8-flash", camera: true, audio: true, voice: true, leads: true, lang: "fr" });
  const [liveInfo, setLiveInfo] = useState<ModelInfo | null>(null);
  const MODELS = [
    "gemini-3.8-flash",
    "gemini-flash-latest",
  ];
  const [analytics, setAnalytics] = useState<AnalyticsEvent[]>([]);
  const [requests, setRequests] = useState<LocalRequest[]>([]);

  function login() {
    if (pw === (process.env.NEXT_PUBLIC_ADMIN_PW || "agl2026")) {
      setOk(true);
      try { setAnalytics(JSON.parse(localStorage.getItem("agl_analytics") ?? "[]").slice(-50).reverse()); } catch {}
      try { const m = localStorage.getItem("agl_model"); if (m) setCfg((c) => ({ ...c, model: m })); } catch {}
      fetch("/api/gemini").then((r) => r.json()).then(setLiveInfo).catch(() => {});
      setRequests(listRequests());
    } else alert("Mot de passe incorrect.");
  }

  if (!ok)
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 text-white" style={{ background: "#000a18" }}>
        <h1 className="text-3xl font-extrabold">AFRICA GLOBAL LOGISTICS • ADMIN</h1>
        <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === "Enter" && login()} placeholder="Mot de passe" className="h-14 w-80 rounded-xl bg-white/10 border border-white/20 px-4" />
        <button onClick={login} className="h-14 w-80 rounded-xl bg-[#D6A84B] text-[#001D3D] font-extrabold">DÉVERROUILLER</button>
        <Link href="/" className="text-white/50 text-sm">← borne</Link>
      </div>
    );

  return (
    <div className="h-screen overflow-y-auto text-white p-8 max-w-4xl mx-auto" style={{ background: "#000a18" }}>
      <h1 className="text-3xl font-extrabold">AFRICA GLOBAL LOGISTICS • ADMIN BORNE</h1>
      <p className="text-white/60 text-sm">Textes • scénarios • modèle IA • idle • toggles. Stocké local.</p>
      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <label className="glass rounded-2xl p-4">Modèle IA texte
          <select value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/15 px-3">
            {MODELS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </label>
        {liveInfo && (
          <div className="glass rounded-2xl p-4 text-xs font-mono">
            <div className="font-bold text-[#5df2c8]">● SERVEUR IA : {liveInfo.configured ? `${liveInfo.provider.toUpperCase()} • ${liveInfo.textModel} • configuré` : "NON CONFIGURÉ"}</div>
            <div className="text-white/60 mt-1">Live voix : {liveInfo.liveModel} • TTS : {liveInfo.ttsModel} • KB : {liveInfo.knowledge} chars</div>
          </div>
        )}
        <label className="glass rounded-2xl p-4">Inactivité (s)<input type="number" value={cfg.idle} onChange={(e) => setCfg({ ...cfg, idle: +e.target.value })} className="mt-2 h-12 w-full rounded-xl bg-black/40 border border-white/15 px-3" /></label>
        {(["camera", "audio", "voice", "leads"] as const).map((k) => (
          <button key={k} onClick={() => setCfg({ ...cfg, [k]: !cfg[k] })} className="glass rounded-2xl p-4 text-left font-bold">{k.toUpperCase()} : {cfg[k] ? "✅ ON" : "❌ OFF"}</button>
        ))}
      </div>
      <button onClick={() => { localStorage.setItem("agl_cfg", JSON.stringify(cfg)); try { localStorage.setItem("agl_model", cfg.model); } catch {} alert(`Config enregistrée — modèle borne : ${cfg.model}`); }} className="mt-4 h-14 px-8 rounded-xl bg-[#D6A84B] text-[#001D3D] font-extrabold">💾 ENREGISTRER</button>
      <AdminStats />
      <h2 className="mt-8 font-bold text-[#F2D28B]">ANALYTICS (50 derniers, anonymes)</h2>
      <h2 className="mt-8 font-bold text-[#EED58E]">DEMANDES LOCALES · {requests.length}</h2>
      <button className="brand-btn mt-3" onClick={exportRequestsCSV}>Exporter RDV & candidatures en CSV</button>
      <div className="mt-3 space-y-2">{requests.map(r=><div className="panel" key={r.id}><strong>{r.kind==="appointment"?"Rendez-vous":"Candidature"} · {r.fields.name}</strong><p>{r.fields.email} · {r.fields.company} · {r.fields.sector}</p><small>{r.createdAt} · {r.id.slice(0,8)}</small></div>)}</div>
      <div className="mt-2 space-y-1 font-mono text-xs max-h-80 overflow-auto">
        {analytics.map((a, i) => <div key={i} className="bg-white/5 rounded-lg p-2">{a.ts} — {a.name} {JSON.stringify(a.data).slice(0, 120)}</div>)}
        {analytics.length === 0 && <div className="text-white/40">Aucun événement pour l’instant.</div>}
      </div>
      <div className="mt-6 flex gap-3">
        <button onClick={() => { localStorage.removeItem("agl_analytics"); setAnalytics([]); }} className="h-12 px-6 rounded-xl bg-red-900 font-bold">Effacer analytics</button>
        <Link href="/" className="h-12 px-6 rounded-xl bg-white/10 font-bold flex items-center">← borne</Link>
        <Link href="/demo" className="h-12 px-6 rounded-xl bg-white/10 font-bold flex items-center">▶ démo</Link>
      </div>
    </div>
  );
}
