"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Bot, Boxes, ExternalLink, Map as MapIcon, MapPin, CalendarDays } from "lucide-react";
import { useKiosk, logEvent } from "@/lib/store";
import { PROJECTS, type Project } from "@/lib/projects";
import { TopBar } from "./Chrome";
import { sfx } from "@/lib/sound";

const Exploded3D = dynamic(() => import("./Exploded3D").then(m => m.Exploded3D), { ssr: false, loading: () => <div className="live-skeleton" style={{ height: 520 }}>Préparation de l’expérience 3D…</div> });
const CinematicMap = dynamic(() => import("./CinematicMap").then(m => m.CinematicMap), { ssr: false, loading: () => <div className="live-skeleton" style={{ height: 460 }}>Envol vers la Côte d’Ivoire…</div> });

const CATEGORIES = ["Tous", ...Array.from(new Set(PROJECTS.map(p => p.category)))];
const subscribeProject = () => () => {};
const readProject = () => { try { return sessionStorage.getItem("agl-project") ?? PROJECTS[0].id; } catch { return PROJECTS[0].id; } };
const initialProject = () => PROJECTS[0].id;

function Sources({ project }: { project: Project }) {
  const [open, setOpen] = useState<string | null>(null);
  const [qrs, setQrs] = useState<Record<string, string>>({});
  useEffect(() => { if (!open || qrs[open]) return; let stop = false; void import("qrcode").then(Q => Q.toDataURL(open, { margin: 1, width: 220, color: { dark: "#04122a", light: "#ffffff" } })).then(u => { if (!stop) setQrs(m => ({ ...m, [open]: u })); }).catch(() => {}); return () => { stop = true; }; }, [open, qrs]);
  return <div className="proj-sources">
    <span className="eyebrow">SOURCES</span>
    {project.sources.map(s => <button key={s.url} className={`proj-source ${open === s.url ? "open" : ""}`} onClick={() => setOpen(open === s.url ? null : s.url)}>
      <ExternalLink size={14} /><span>{s.label}</span>
      {open === s.url && qrs[s.url] && <img src={qrs[s.url]} alt="QR code de la source" />}
    </button>)}
  </div>;
}

export function ProjectsScreen() {
  const k = useKiosk(); const en = k.lang === "en";
  const [cat, setCat] = useState("Tous");
  const savedId = useSyncExternalStore(subscribeProject, readProject, initialProject);
  const [selectedId, setId] = useState<string | null>(null);
  const id = selectedId ?? savedId;
  const [tab, setTab] = useState<"3d" | "map">("3d");
  const list = useMemo(() => PROJECTS.filter(p => cat === "Tous" || p.category === cat), [cat]);
  const project = PROJECTS.find(p => p.id === id) ?? PROJECTS[0];
  const view = project.model ? tab : "map";
  // Lara peut ouvrir un projet précis.
  useEffect(() => { const h = (e: Event) => { const next = (e as CustomEvent<string>).detail; if (PROJECTS.some(p => p.id === next)) { setId(next); setCat("Tous"); } }; window.addEventListener("agl-project", h); return () => window.removeEventListener("agl-project", h); }, []);
  const { setContextDetails } = k;
  useEffect(() => { if (selectedId) { try { sessionStorage.setItem("agl-project", project.id); } catch { /* stockage indisponible */ } } setContextDetails({ project: project.title, category: project.category, date: project.date, facts: project.facts.map(f => `${f.value} ${f.label}`) }); logEvent("project_viewed", { id: project.id }); }, [project, selectedId, setContextDetails]);
  const pick = (p: Project) => { setId(p.id); sfx("select"); k.touch(); };

  return <div className="experience-page">
    <TopBar title={en ? "AGL PROJECTS · CÔTE D’IVOIRE" : "PROJETS AGL · CÔTE D’IVOIRE"} subtitle={en ? "Ports, rail, energy, mines, health: field operations, sourced." : "Ports, rail, énergie, mines, santé : des opérations réelles, sourcées."} />
    <main className="experience-content">
      <div className="proj-filters">{CATEGORIES.map(c => <button key={c} aria-pressed={cat === c} className={cat === c ? "on" : ""} onClick={() => { setCat(c); sfx("tick"); }}>{c}</button>)}</div>
      <div className="proj-layout">
        <nav className="proj-list" aria-label={en ? "Projects" : "Projets"}>
          {list.map((p, i) => <motion.button key={p.id} className={`proj-card ${p.id === project.id ? "on" : ""}`} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} onClick={() => pick(p)}>
            <span className="proj-cat">{p.category}{p.model && <Boxes size={13} />}</span>
            <strong>{p.title}</strong>
            <span className="proj-date">{p.date}</span>
          </motion.button>)}
        </nav>
        {/* Pas d’animation de sortie : la scène 3D et ses étiquettes se démontent proprement. */}
          <motion.article key={project.id} className="proj-detail panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
            <span className="eyebrow">{project.category.toUpperCase()} · AFRICA GLOBAL LOGISTICS</span>
            <h2 className="proj-title">{project.title}</h2>
            <div className="proj-meta"><span><CalendarDays size={15} />{project.date}</span><span><MapPin size={15} />{project.place}</span></div>
            <p className="proj-summary">{project.summary}</p>
            <div className="proj-facts">{project.facts.map((f, i) => <motion.div key={f.label} initial={{ opacity: 0, y: 12, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15 + i * 0.08 }}><strong>{f.value}</strong><span>{f.label}</span></motion.div>)}</div>
            <div className="proj-tabs">
              {project.model && <button aria-pressed={view === "3d"} className={view === "3d" ? "on" : ""} onClick={() => setTab("3d")}><Boxes size={16} />{en ? "3D exploded experience" : "Expérience 3D éclatée"}</button>}
              <button aria-pressed={view === "map"} className={view === "map" ? "on" : ""} onClick={() => setTab("map")}><MapIcon size={16} />{en ? "On the map" : "Sur la carte"}</button>
            </div>
            {view === "3d" && project.model ? <Exploded3D key={project.id} object={project.model} parts={[]} intro={project.steps[0]} en={en} height={520} />
              : <CinematicMap key={project.id} focus={{ kind: "point", lng: project.lng, lat: project.lat, zoom: 9.5, pitch: 58, bearing: -20 }} height={460} controls={false} />}
            <div className="proj-bottom">
              <ol className="proj-steps">{project.steps.map((s, i) => <motion.li key={s} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.07 }}><i>{i + 1}</i>{s}</motion.li>)}</ol>
              <div>
                <Sources project={project} />
                <button className="brand-btn" style={{ marginTop: 14 }} onClick={() => k.requestAI(en ? `Tell me about this Africa Global Logistics project: ${project.title}.` : `Raconte-moi ce projet d’Africa Global Logistics : ${project.title}.`)}><Bot size={18} />{en ? "Ask Lara" : "Demander à Lara"}</button>
              </div>
            </div>
          </motion.article>
      </div>
      <p className="ai-status" style={{ marginTop: 16 }}>{en ? "Figures from the cited public sources; 3D models are illustrative." : "Chiffres issus des sources publiques citées ; les modèles 3D sont illustratifs."}</p>
    </main>
  </div>;
}
