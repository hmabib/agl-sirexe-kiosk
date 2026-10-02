"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Image as ImageIcon, Network, Clapperboard, FileText, ArrowUpRight } from "lucide-react";
import { useKiosk, logEvent } from "@/lib/store";
import { TopBar } from "./Chrome";
import { ImageTab, SchemaTab, StoryboardTab, DocTab, TABS } from "./StudioPanel";
import { STUDIO_LINKS, type StudioTab } from "@/lib/studio";

const TAB_ICONS = { image: ImageIcon, schema: Network, storyboard: Clapperboard, doc: FileText } as const;

export function CanvasScreen() {
  const k = useKiosk();
  const en = k.lang === "en";
  const [tab, setTab] = useState<StudioTab>("image");
  const [shared, setShared] = useState("");
  function switchTab(t: StudioTab) {
    setTab(t); k.touch();
    logEvent("canvas_tab", { tab: t });
  }
  return (
    <div className="experience-page">
      <TopBar title="CANVAS LARA" subtitle={en ? "Create live with Lara: images, diagrams, storyboards." : "Créez en direct avec Lara : images, schémas, storyboards."} />
      <main className="experience-content">
        <div className="section-heading">
          <div>
            <span className="eyebrow">{en ? "LARA · GENERATIVE WORKSPACE" : "LARA · ESPACE DE CRÉATION"}</span>
            <h2>{en ? "Describe it. Watch it appear." : "Décrivez-le. Regardez-le apparaître."}</h2>
            <p>{en ? "Every tab generates for real through the kiosk AI: on-demand illustration, logistics diagram, narrated storyboard, living document." : "Chaque onglet génère réellement via l’IA de la borne : illustration à la demande, schéma logistique, storyboard narré, document vivant."}</p>
          </div>
        </div>
        <div className="stage-tabs" role="tablist" aria-label="Canvas">
          {TABS.map(t => {
            const Icon = TAB_ICONS[t.id];
            return (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "active" : ""} onClick={() => switchTab(t.id)}>
                <Icon size={20} />{en ? t.en : t.fr}
              </button>
            );
          })}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={`${tab}-${shared}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }} className="panel">
            {tab === "image" && <ImageTab initialPrompt={shared} />}
            {tab === "schema" && <SchemaTab initialBody={shared} />}
            {tab === "storyboard" && <StoryboardTab initialBody={shared} />}
            {tab === "doc" && <DocTab initialBody={shared} goSchema={(body) => { setShared(body); setTab("schema"); }} />}
          </motion.div>
        </AnimatePresence>
        <div style={{ marginTop: 18 }}>
          <span className="eyebrow">{en ? "CONTINUE ON THE KIOSK" : "CONTINUER SUR LA BORNE"}</span>
          <div className="pill-row" style={{ marginTop: 10 }}>
            {STUDIO_LINKS.map(l => (
              <button key={l.screen} className="pill" style={{ cursor: "pointer" }} onClick={() => k.go(l.screen)}>
                {en ? l.en : l.fr} <ArrowUpRight size={14} />
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
