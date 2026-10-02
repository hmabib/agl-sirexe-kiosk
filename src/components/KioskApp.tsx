"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KioskProvider, useKiosk, type Screen } from "@/lib/store";
import { AttractScreen } from "@/components/Chrome";
import { HomeScreen } from "@/components/Home";
import { MissionScreen } from "@/components/Mission";
import { ExploreScreen } from "@/components/Explore";
import { BuildScreen } from "@/components/Build";
import { FinaleScreen } from "@/components/Finale";
import dynamic from "next/dynamic";
import { AIAssistant } from "@/components/AIAssistant";
import { startAmbient } from "@/components/Fx";
import { feedbackFor, sfx } from "@/lib/sound";
import { ExperiencesScreen } from "./Experiences";
import { MiningScreen } from "./Mining";
import { CorporateScreen } from "./Corporate";
import { RequestForm } from "./RequestForm";
import { ExternalExperience } from "./ExternalExperience";
import { MarketScreen } from "./Market";
import { CanvasScreen } from "./CanvasScreen";
import { LiveStage } from "./LiveStage";
import { StudioHost } from "./StudioPanel";

const VisionLab = dynamic(() => import("@/components/VisionLab").then((m) => m.VisionLab), { ssr: false });

interface Ripple { id: number; x: number; y: number }

function Shell() {
  const k = useKiosk();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [idleLeft, setIdleLeft] = useState<number | null>(null);
  const idRef = useRef(0);

  // fullscreen kiosk + nappe sonore au premier toucher
  useEffect(() => {
    const f = () => {
      try { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {}); } catch {}
      startAmbient();
    };
    window.addEventListener("pointerdown", f, { once: true });
    return () => window.removeEventListener("pointerdown", f);
  }, []);

  // alerte "Nouvelle expérience ?" 10 s avant reset auto (55 s)
  useEffect(() => {
    const id = setInterval(() => {
      if (k.screen === "attract") { setIdleLeft(null); return; }
      const longSession = ["satisfaction", "quotation", "appointment", "careers", "vision", "canvas"].includes(k.screen);
      const remain = (longSession ? 300 : 90) - (Date.now() - k.lastTouch) / 1000;
      setIdleLeft(remain < 10 && remain > 0 ? Math.ceil(remain) : null);
    }, 1000);
    return () => clearInterval(id);
  }, [k.screen, k.lastTouch]);

  // Transition sonore à chaque changement d’écran (pas au premier affichage).
  const firstScreen = useRef(true);
  useEffect(() => { if (firstScreen.current) { firstScreen.current = false; return; } sfx("transition"); }, [k.screen]);

  function onDown(e: React.PointerEvent) {
    k.touch();
    feedbackFor(e.target as Element);
    const r = idRef.current++;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setRipples((rs) => [...rs.slice(-6), { id: r, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== r)), 850);
  }

  return (
    <div
      className={`h-full w-full relative overflow-hidden text-white ${k.aiOpen && !["attract", "satisfaction", "quotation", "vision"].includes(k.screen) ? "lara-open" : ""}`}
      onPointerDown={onDown}
      onTouchMove={() => k.touch()}
      style={{ background: "#000a18" }}
    >
      <div className="kiosk-zoom h-full w-full origin-top" style={{ transform: `scale(${k.kioskZoom})`, height: `${100 / k.kioskZoom}%`, width: `${100 / k.kioskZoom}%` }}>
        <AnimatePresence mode="wait">
          <motion.div key={k.screen} initial={{ opacity: 0, scale: 0.97, y: 18 }} animate={{ opacity: 1, scale: 1, y: 0, transition: { duration: 0.38, ease: [0.22, 1, 0.36, 1] } }} exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.16, ease: "easeIn" } }} className="h-full w-full relative">
            {k.screen === "attract" && <AttractScreen />}
            {k.screen === "home" && <HomeScreen />}
            {k.screen === "games" && <ExperiencesScreen />}
            {k.screen === "mining" && <MiningScreen />}
            {k.screen === "corporate" && <CorporateScreen />}
            {k.screen === "appointment" && <RequestForm kind="appointment" />}
            {k.screen === "careers" && <RequestForm kind="careers" />}
            {k.screen === "satisfaction" && <ExternalExperience kind="satisfaction" />}
            {k.screen === "quotation" && <ExternalExperience kind="quotation" />}
            {k.screen === "market" && <MarketScreen />}
            {k.screen === "canvas" && <CanvasScreen />}
            {k.screen === "mission" && <MissionScreen />}
            {k.screen === "explore" && <ExploreScreen />}
            {k.screen === "build" && <BuildScreen />}
            {k.screen === "vision" && <VisionLab />}
            {k.screen === "finale" && <FinaleScreen />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* flash warp doré à chaque transition */}
      <motion.div
        key={k.screen}
        initial={{ opacity: 0.55, scale: 1.25 }}
        animate={{ opacity: 0, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="fixed inset-0 z-[55] pointer-events-none"
        style={{ background: "radial-gradient(600px 400px at 50% 50%, rgba(214,168,75,.5), transparent 70%)" }}
      />

      {/* ripples tactiles */}
      {ripples.map((r) => (
        <motion.span
          key={r.id}
          initial={{ opacity: 0.8, scale: 0 }}
          animate={{ opacity: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="fixed z-[56] pointer-events-none rounded-full border-2 border-[#F2D28B]"
          style={{ left: r.x - 30, top: r.y - 30, width: 60, height: 60 }}
        />
      ))}

      {/* alerte idle */}
      <AnimatePresence>
        {idleLeft !== null && (
          <motion.button
            initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
            onClick={() => { k.touch(); setIdleLeft(null); }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[57] glass rounded-full px-8 h-16 font-bold text-lg"
          >
            👆 Nouvelle expérience ? Touchez pour continuer • {idleLeft}s
          </motion.button>
        )}
      </AnimatePresence>

      {!["attract", "satisfaction", "quotation", "vision"].includes(k.screen) && <AIAssistant />}
      <LiveStage />
      <StudioHost />
    </div>
  );
}

export default function KioskApp({ initialScreen = "attract" }: { initialScreen?: Screen }) {
  return (
    <KioskProvider initialScreen={initialScreen}>
      <Shell />
    </KioskProvider>
  );
}
