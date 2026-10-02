"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKiosk, logEvent } from "@/lib/store";
import { TopBar } from "./Chrome";
import dynamic from "next/dynamic";
import { ConfettiBurst, ParticleField, ScoreRing, sfx } from "./Fx";

const RealCivMap = dynamic(() => import("./RealMaps").then((m) => m.RealCivMap), {
  ssr: false,
  loading: () => <div className="h-[420px] flex items-center justify-center text-[#D6A84B] animate-pulse">🗺️ Chargement de la vraie carte…</div>,
});

const CARGOS = [
  { id: "minerai", icon: "🪨", fr: "MINERAI", en: "ORE" },
  { id: "equipment", icon: "🚜", fr: "ÉQUIPEMENT LOURD", en: "HEAVY EQUIPMENT" },
  { id: "energie", icon: "⚡", fr: "ÉNERGIE", en: "ENERGY" },
  { id: "conteneurs", icon: "📦", fr: "CONTENEURS", en: "CONTAINERS" },
  { id: "projet", icon: "🏗️", fr: "CARGAISON PROJET", en: "PROJECT CARGO" },
];
const SCENARIOS = [
  { id: "A", fr: "Mission A — 80 t d'Abidjan vers site minier nord", en: "Mission A — 80t Abidjan to northern mine" },
  { id: "B", fr: "Mission B — Production minière vers port export", en: "Mission B — Mine output to export port" },
  { id: "C", fr: "Mission C — Équipements énergie vers site industriel", en: "Mission C — Energy kit to industrial site" },
];

export function MissionScreen() {
  const k = useKiosk();
  const [step, setStep] = useState(0);
  const [metrics, setMetrics] = useState({ time: "—", cost: "—", dist: "—", co2: "—", penalty: "" });
  const [missionStart, setMissionStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);

  // Moteur de calcul pointu : cargaison × scénario × route × incident
  function computeMetrics() {
    const baseTime = { A: 44, B: 40, C: 32 }[k.scenario ?? "A"] ?? 44;
    const baseDist = { A: 680, B: 640, C: 480 }[k.scenario ?? "A"] ?? 680;
    const routeAdj = { "route-A": 0, "route-B": -6, "route-C": -10 }[k.route ?? "route-A"] ?? 0;
    const heavy = k.cargo === "equipment" || k.cargo === "projet" ? 6 : 0;
    const incidentPenalty = k.incident ? 8 : 0;
    const time = baseTime + routeAdj + heavy + incidentPenalty;
    let cost = 2 + (heavy ? 1 : 0) + (k.route === "route-B" ? 1 : 0) + (k.incident ? 1 : 0);
    cost = Math.min(5, Math.max(1, cost));
    const co2 = k.route === "route-B" ? "−28 %" : k.route === "route-C" ? "−12 %" : "réf.";
    return {
      time: `${time} h`,
      cost: "$".repeat(cost),
      dist: `${baseDist + routeAdj * 8} km`,
      co2,
      penalty: k.incident ? "+8 h incident" : "",
    };
  }

  // chrono mission
  useEffect(() => {
    if (step === 2 && missionStart === null) setMissionStart(Date.now());
    if (step >= 2 && missionStart) {
      const id = setInterval(() => setElapsed(Math.floor((Date.now() - missionStart) / 1000)), 1000);
      return () => clearInterval(id);
    }
  }, [step, missionStart]);
  const [feed, setFeed] = useState<string[]>([]);

  // Flux temps réel simulé du corridor
  useEffect(() => {
    if (step !== 2 || !k.route) return;
    const seed = [
      `📡 Convoi localisé — corridor ${k.route === "route-A" ? "A routier" : k.route === "route-B" ? "B multimodal" : "C ouest"}`,
      "🛃 Documents douaniers validés ✓",
      "📍 Hub Bouaké — consolidation en cours…",
    ];
    setFeed(seed);
    const live = ["🚚 Truck #12 — 62 km/h", "🚆 Sillon rail réservé ✓", "⚓ Terminal Abidjan — fenêtre 14:00", "📦 Capteurs : température OK", "🛰️ ETA recalculé en direct"];
    let i = 0;
    const id = setInterval(() => { setFeed((f) => [...live.slice(0, ++i % (live.length + 1)), ...(f.slice(-2))].slice(-5)); }, 3200);
    return () => clearInterval(id);
  }, [step, k.route]);

  useEffect(() => {
    if (step === 2 && k.route) {
      setMetrics(computeMetrics());
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const id = setTimeout(() => {
        if (!k.incident) {
          const inc = ["🌧️ Fortes pluies — tronçon inondé", "🚧 Route fermée — travaux", "⚠️ Congestion terminal"][Math.floor(Math.random() * 3)];
          k.setIncident(inc);
          sfx("alert");
          logEvent("mission_incident", { incident: inc });
        }
      }, 6000);
      return () => clearTimeout(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, k.route]);

  // recalcule dès que l'incident frappe
  useEffect(() => {
    if (step === 2 && k.route) setMetrics(computeMetrics());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k.incident]);

  const expertise = ["Transport & Logistics", "Project Cargo", "Port Operations", "Warehousing", "Rail", "Freight Forwarding", "Customs & Coordination", "Multimodal Solutions"];

  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll" style={{ background: "linear-gradient(180deg,#001D3D,#00060f)" }}>
      <TopBar title="AGL MISSION CONTROL" subtitle={k.lang === "fr" ? "Acheminez une cargaison stratégique jusqu'au marché international." : "Move strategic cargo to the international market."} />
      {/* stepper */}
      <div className="flex gap-2 px-6 md:px-10 mt-4 max-w-6xl mx-auto">
        {["Cargaison", "Scénario", "Route", "Incident", "Succès"].map((s, i) => (
          <div key={s} className={`flex-1 h-2 rounded-full ${i <= step ? "bg-[#D6A84B]" : "bg-white/10"}`} />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 md:px-10 py-6 pb-32">
        {step === 0 && (
          <>
            <h2 className="text-xl font-bold mb-4">1 — {k.lang === "fr" ? "CHOISIR LA CARGAISON" : "CHOOSE CARGO"}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {CARGOS.map((c) => (
                <button key={c.id} onClick={() => { k.setCargo(c.id); k.touch(); sfx("select"); }}
                  className={`glass rounded-2xl p-6 text-center touch-target ${k.cargo === c.id ? "glass-selected" : ""}`}>
                  <div className="text-5xl">{c.icon}</div>
                  <div className="mt-3 font-extrabold text-sm">{k.lang === "fr" ? c.fr : c.en}</div>
                  {c.id === "equipment" && <div className="text-xs text-[#F2D28B] mt-1">80 t • oversized</div>}
                </button>
              ))}
            </div>
            <NextBtn disabled={!k.cargo} onClick={() => setStep(1)} label={k.lang === "fr" ? "COMMENCER LA MISSION →" : "START MISSION →"} />
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-xl font-bold mb-4">2 — {k.lang === "fr" ? "SCÉNARIO (évite la saisie clavier)" : "SCENARIO"}</h2>
            <div className="grid gap-4">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => { k.setScenario(s.id); k.touch(); }}
                  className={`glass rounded-2xl p-6 text-left text-lg touch-target ${k.scenario === s.id ? "glass-selected" : ""}`}>
                  <span className="text-[#D6A84B] font-extrabold mr-3">{s.id}</span>{k.lang === "fr" ? s.fr : s.en}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <BackBtn onClick={() => setStep(0)} />
              <NextBtn disabled={!k.scenario} onClick={() => setStep(2)} label="VOIR LA CARTE →" />
            </div>
          </>
        )}

        {step === 2 && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="glass rounded-3xl p-4">
              <div className="flex items-center justify-between px-2 py-1">
                <span className="font-bold text-[#F2D28B]">CÔTE D’IVOIRE • vraie carte • 17 villes réelles</span>
                <span className="text-xs text-white/50">tap • pinch • zoom</span>
              </div>
              <RealCivMap selectedRoute={k.route} onSelectRoute={(r) => { k.setRoute(r); k.touch(); sfx("select"); }} incidentZone={k.incident} corridorNodes={k.corridor} />
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(["route-A", "route-B", "route-C"] as const).map((r) => (
                  <button key={r} onClick={() => { k.setRoute(r); k.touch(); }}
                    className={`h-14 rounded-xl font-bold text-sm ${k.route === r ? "bg-[#D6A84B] text-[#001D3D]" : "bg-white/10"}`}>
                    {r === "route-A" ? "A • Route" : r === "route-B" ? "B • Multimodal" : "C • Ouest"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="glass rounded-3xl p-6">
                <div className="text-sm text-white/60">Mine → Camion → Hub → Rail → Terminal → Port → Navire</div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {[
                    ["TEMPS", metrics.time], ["COÛT RELATIF", metrics.cost],
                    ["DISTANCE", metrics.dist], ["CO₂", metrics.co2],
                    ["COMPLEXITÉ", k.route === "route-B" ? "Moyenne" : "Élevée"], ["RISQUE", k.incident ? "Élevé ⚠️" : "Modéré"],
                    ["RÉSILIENCE", k.route === "route-B" ? "★★★★☆" : "★★★☆☆"],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-2xl bg-black/30 border border-white/10 p-4">
                      <div className="text-[11px] tracking-widest text-[#D6A84B] font-bold">{l}</div>
                      <div className="text-2xl font-extrabold mt-1">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-white/40 mt-3">Simulation illustrative — pas de données contractuelles. {metrics.penalty && <span className="text-red-300 font-bold">Incident : {metrics.penalty}.</span>}</div>
              </div>
              {/* comparatif animé A / B / C */}
              <div className="glass rounded-3xl p-6">
                <div className="text-xs tracking-[0.25em] text-[#D6A84B] font-bold mb-3">COMPARATIF CORRIDORS • TEMPS (h)</div>
                {[["A • Route", 44, "route-A"], ["B • Multimodal", 38, "route-B"], ["C • Ouest", 30, "route-C"]].map(([label, h, id]) => (
                  <button key={id as string} onClick={() => { k.setRoute(id as string); k.touch(); sfx("pop"); }} className="w-full text-left mb-2">
                    <div className="flex justify-between text-xs font-bold"><span className={k.route === id ? "text-[#F2D28B]" : "text-white/60"}>{label}</span><span>{h} h</span></div>
                    <div className="h-3 rounded-full bg-white/10 overflow-hidden">
                      <motion.div className={`h-full rounded-full ${k.route === id ? "bg-gradient-to-r from-[#D6A84B] to-[#F2D28B]" : "bg-[#3a6ea5]"}`}
                        initial={false} animate={{ width: `${(Number(h) / 44) * 100}%` }} transition={{ duration: 0.6 }} />
                    </div>
                  </button>
                ))}
              </div>
              {/* live feed corridor */}
              {feed.length > 0 && (
                <div className="rounded-3xl bg-black/50 border border-[#5df2c8]/25 p-4 font-mono text-xs text-[#5df2c8] space-y-1">
                  <div className="text-[10px] tracking-[0.3em] font-bold animate-pulse">● LIVE CORRIDOR FEED</div>
                  <AnimatePresence initial={false}>
                    {feed.map((l, i) => (
                      <motion.div key={`${i}-${l}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}>{l}</motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
              <div className="flex gap-3">
                <BackBtn onClick={() => setStep(1)} />
                <NextBtn disabled={!k.route} onClick={() => setStep(3)} label="SIMULER L'INCIDENT →" />
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="max-w-3xl mx-auto text-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-3xl p-10">
              <div className="text-6xl">🚨</div>
              <h2 className="text-4xl font-extrabold mt-4">INCIDENT</h2>
              <p className="text-xl mt-2 text-white/80">{k.incident ?? "Une section du corridor est indisponible."}</p>
              <p className="text-[#F2D28B] font-bold mt-4 text-lg">{k.lang === "fr" ? "Que faites-vous ?" : "What do you do?"}</p>
              <div className="grid md:grid-cols-2 gap-3 mt-6">
                {[
                  ["A", k.lang === "fr" ? "Continuer" : "Continue"],
                  ["B", k.lang === "fr" ? "Changer de route" : "Reroute"],
                  ["C", k.lang === "fr" ? "Ajouter une étape logistique" : "Add logistics leg"],
                  ["D", "🤖 Demander à AGL AI"],
                ].map(([id, label]) => (
                  <button key={id} onClick={() => {
                    k.touch(); sfx(id === "D" ? "whoosh" : "alert");
                    if (id === "D") { k.setAiOpen(true); }
                    if (id === "B") { k.setRoute("route-B"); }
                    if (id === "C") { k.setRoute("route-B"); }
                    setChoice(id);
                    setStep(4);
                    logEvent("mission_completed", { choice: id, route: k.route });
                  }} className="touch-target min-h-[72px] rounded-2xl bg-white/10 border border-white/15 text-lg font-bold hover:border-[#D6A84B]">
                    <span className="text-[#D6A84B] mr-2">{id}</span> {label}
                  </button>
                ))}
              </div>
              {k.lastAiReply && <div className="mt-6 text-left rounded-2xl bg-[#003F73]/60 border border-[#D6A84B]/40 p-4">🤖 {k.lastAiReply}</div>}
            </motion.div>
          </div>
        )}

        {step === 4 && (
          <div className="max-w-4xl mx-auto text-center">
            <ConfettiBurst fire={1} />
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="text-7xl">🏆</div>
              <h2 className="text-5xl font-extrabold text-gold-gradient mt-4">MISSION ACCOMPLIE</h2>
              <div className="flex items-center justify-center gap-6 mt-4">
                <ScoreRing score={Math.min(99, 52 + (k.route === "route-B" ? 24 : k.route === "route-C" ? 14 : 6) + (choice === "B" || choice === "C" ? 10 : choice === "D" ? 8 : 0))} label="SCORE MISSION" />
                <div className="text-left">
                  <div className="text-3xl font-extrabold font-mono">{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</div>
                  <div className="text-xs text-white/50">chrono borne • choix {choice ?? "—"}</div>
                  {metrics.penalty && <div className="mt-1 text-xs font-bold text-red-300 bg-red-500/15 border border-red-400/40 rounded-lg px-2 py-1">⚠️ incident absorbé ({metrics.penalty})</div>}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
                {[["Distance", metrics.dist], ["Temps", metrics.time], ["Modes", k.route === "route-B" ? "Route + Rail + Mer" : "Route + Mer"], ["Résilience", "★★★★☆"], ["CO₂ relatif", metrics.co2], ["Port", "Abidjan ⚓"]].map(([l, v]) => (
                  <div key={l} className="glass rounded-2xl p-4"><div className="text-xs text-[#D6A84B] font-bold tracking-widest">{l}</div><div className="text-xl font-extrabold">{v}</div></div>
                ))}
              </div>
              <h3 className="mt-8 tracking-[0.25em] text-[#F2D28B] font-bold">LE SAVOIR-FAIRE AGL MOBILISÉ</h3>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {expertise.map((e, i) => (
                  <motion.span key={e} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
                    className="px-4 h-11 flex items-center rounded-full bg-[#D6A84B]/15 border border-[#D6A84B]/50 text-sm font-bold">{e}</motion.span>
                ))}
              </div>
              <p className="mt-8 text-white/70">Une chaîne performante ne repose pas sur un seul mode.</p>
              <p className="text-3xl font-extrabold mt-1">ELLE REPOSE SUR L’ORCHESTRATION.</p>
              <div className="flex gap-3 justify-center mt-8">
                <button onClick={() => { k.setFinaleStats({ Distance: metrics.dist, Temps: metrics.time, CO2: metrics.co2, Chrono: `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` }); k.go("finale"); }} className="h-16 px-8 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg">TERMINER →</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}

function NextBtn({ disabled, onClick, label }: { disabled?: boolean; onClick: () => void; label: string }) {
  return <button disabled={disabled} onClick={() => { sfx("select"); onClick(); }} className="mt-6 h-16 px-8 rounded-2xl bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg disabled:opacity-30 touch-target">{label}</button>;
}
function BackBtn({ onClick }: { onClick: () => void }) {
  return <button onClick={() => { sfx("pop"); onClick(); }} className="mt-6 h-16 px-6 rounded-2xl bg-white/10 font-bold touch-target">←</button>;
}

export function Zoomable({ children }: { children: React.ReactNode }) {
  const [z, setZ] = useState(1);
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl" style={{ transform: `scale(${z})`, transformOrigin: "center", transition: "transform .3s" }}>
        {children}
      </div>
      <div className="absolute top-2 right-2 flex gap-2">
        <button onClick={() => setZ((v) => Math.min(2.5, +(v + 0.25).toFixed(2)))} className="w-12 h-12 rounded-xl bg-black/60 border border-[#D6A84B]/50 text-xl font-bold">＋</button>
        <button onClick={() => setZ((v) => Math.max(0.7, +(v - 0.25).toFixed(2)))} className="w-12 h-12 rounded-xl bg-black/60 border border-[#D6A84B]/50 text-xl font-bold">－</button>
        <button onClick={() => setZ(1)} className="h-12 px-3 rounded-xl bg-black/60 border border-white/20 text-sm">Reset</button>
      </div>
    </div>
  );
}
