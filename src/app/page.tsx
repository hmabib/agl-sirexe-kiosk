"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KioskProvider, useKiosk } from "@/lib/store";
import { AttractScreen } from "@/components/Chrome";
import { HomeScreen } from "@/components/Home";
import { MissionScreen } from "@/components/Mission";
import { ExploreScreen } from "@/components/Explore";
import { BuildScreen } from "@/components/Build";
import { FinaleScreen } from "@/components/Finale";
import { AIAssistant } from "@/components/AIAssistant";
import { startAmbient } from "@/components/Fx";

interface Ripple { id: number; x: number; y: number }

function Shell() {
  const k = useKiosk();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [warp, setWarp] = useState(0);
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

  // flash cinématique à chaque navigation
  useEffect(() => {
    setWarp((w) => w + 1);
  }, [k.screen]);

  // alerte "Nouvelle expérience ?" 10 s avant reset auto (55 s)
  useEffect(() => {
    const id = setInterval(() => {
      if (k.screen === "attract") { setIdleLeft(null); return; }
      const remain = 55 - (Date.now() - k.lastTouch) / 1000;
      setIdleLeft(remain < 10 && remain > 0 ? Math.ceil(remain) : null);
    }, 1000);
    return () => clearInterval(id);
  }, [k.screen, k.lastTouch]);

  function onDown(e: React.PointerEvent) {
    k.touch();
    const r = idRef.current++;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    setRipples((rs) => [...rs.slice(-6), { id: r, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== r)), 850);
  }

  return (
    <div
      className="h-full w-full relative overflow-hidden text-white"
      onPointerDown={onDown}
      onTouchMove={() => k.touch()}
      style={{ background: "#000a18" }}
    >
      <audio id="kiosk-beep" src="data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=" />
      <div className="kiosk-zoom h-full w-full origin-top" style={{ transform: `scale(${k.kioskZoom})`, height: `${100 / k.kioskZoom}%`, width: `${100 / k.kioskZoom}%` }}>
        <AnimatePresence mode="wait">
          <motion.div key={k.screen} initial={{ opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.015 }} transition={{ duration: 0.5 }} className="h-full w-full relative">
            {k.screen === "attract" && <AttractScreen />}
            {k.screen === "home" && <HomeScreen />}
            {k.screen === "mission" && <MissionScreen />}
            {k.screen === "explore" && <ExploreScreen />}
            {k.screen === "build" && <BuildScreen />}
            {k.screen === "finale" && <FinaleScreen />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* flash warp doré à chaque transition */}
      <motion.div
        key={warp}
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

      {k.screen !== "attract" && <AIAssistant />}
    </div>
  );
}

export default function Page() {
  return (
    <KioskProvider>
      <Shell />
    </KioskProvider>
  );
}
