"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "./i18n";
import { AGL_SYSTEM_PROMPT } from "./prompt";

export { AGL_SYSTEM_PROMPT };

export type Screen = "attract" | "home" | "mission" | "explore" | "build" | "vision" | "finale";

export interface ExperienceContext {
  experience: string;
  lang: Lang;
  cargo?: string;
  weight?: number;
  origin?: string;
  destination?: string;
  transportMode?: string[];
  currentScreen?: string;
  selectedScenario?: string;
  selectedNode?: string;
  corridor?: string[];
  incident?: string | null;
  metrics?: Record<string, string | number>;
  zoom?: number;
  timestamp: string;
}

interface KioskState {
  screen: Screen;
  lang: Lang;
  setLang: (l: Lang) => void;
  go: (s: Screen) => void;
  kioskZoom: number;
  setKioskZoom: (z: number) => void;
  soundOn: boolean;
  toggleSound: () => void;
  // mission
  cargo: string | null;
  setCargo: (c: string | null) => void;
  scenario: string | null;
  setScenario: (s: string | null) => void;
  route: string | null;
  setRoute: (r: string | null) => void;
  incident: string | null;
  setIncident: (i: string | null) => void;
  // explore
  selectedNode: string | null;
  setSelectedNode: (n: string | null) => void;
  xray: boolean;
  setXray: (v: boolean) => void;
  dataView: boolean;
  setDataView: (v: boolean) => void;
  // build
  corridor: string[];
  setCorridor: (c: string[]) => void;
  corridorActive: boolean;
  setCorridorActive: (v: boolean) => void;
  // ai
  aiOpen: boolean;
  setAiOpen: (v: boolean) => void;
  aiSpeaking: boolean;
  setAiSpeaking: (v: boolean) => void;
  aiState: "idle" | "listening" | "thinking" | "speaking";
  setAiState: (s: "idle" | "listening" | "thinking" | "speaking") => void;
  lastAiReply: string;
  setLastAiReply: (s: string) => void;
  // finale
  finaleStats: Record<string, string | number> | null;
  setFinaleStats: (s: Record<string, string | number> | null) => void;
  getExperienceContext: () => ExperienceContext;
  touch: () => void;
  lastTouch: number;
}

const Ctx = createContext<KioskState | null>(null);

export function KioskProvider({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>("attract");
  const [lang, setLang] = useState<Lang>("fr");
  const [kioskZoom, setKioskZoom] = useState(1);
  const [soundOn, setSoundOn] = useState(true);
  const [cargo, setCargo] = useState<string | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const [route, setRoute] = useState<string | null>(null);
  const [incident, setIncident] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [xray, setXray] = useState(false);
  const [dataView, setDataView] = useState(false);
  const [corridor, setCorridor] = useState<string[]>([]);
  const [corridorActive, setCorridorActive] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [aiState, setAiState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [lastAiReply, setLastAiReply] = useState("");
  const [finaleStats, setFinaleStats] = useState<Record<string, string | number> | null>(null);
  const [lastTouch, setLastTouch] = useState(Date.now());
  const screenRef = useRef(screen);
  screenRef.current = screen;

  const touch = useCallback(() => {
    setLastTouch(Date.now());
    try {
      const el = document.getElementById("kiosk-beep");
      if (el && soundOn) (el as HTMLAudioElement).play().catch(() => {});
    } catch {}
  }, [soundOn]);

  // Auto-reset 60s -> confirm -> attract
  useEffect(() => {
    const id = setInterval(() => {
      if (screenRef.current !== "attract" && Date.now() - lastTouch > 55000) {
        setScreen("attract");
        setCargo(null); setScenario(null); setRoute(null); setIncident(null);
        setSelectedNode(null); setCorridor([]); setCorridorActive(false);
        setAiOpen(false); setAiState("idle");
        logEvent("session_reset_idle", {});
      }
    }, 5000);
    return () => clearInterval(id);
  }, [lastTouch]);

  const go = useCallback((s: Screen) => {
    logEvent(s === "attract" ? "session_started" : "experience_selected", { screen: s });
    setScreen(s);
    setLastTouch(Date.now());
  }, []);

  const getExperienceContext = useCallback((): ExperienceContext => {
    return {
      experience: screenRef.current,
      lang,
      cargo: cargo ?? undefined,
      origin: scenarioOrigin(scenario),
      destination: scenarioDest(scenario),
      transportMode: route ? [route] : ["road"],
      currentScreen: screenRef.current,
      selectedScenario: scenario ?? undefined,
      selectedNode: selectedNode ?? undefined,
      corridor,
      incident,
      zoom: kioskZoom,
      timestamp: new Date().toISOString(),
    };
  }, [lang, cargo, scenario, route, selectedNode, corridor, incident, kioskZoom]);

  const value = useMemo<KioskState>(
    () => ({
      screen, lang, setLang, go, kioskZoom, setKioskZoom, soundOn,
      toggleSound: () => setSoundOn((v) => !v),
      cargo, setCargo, scenario, setScenario, route, setRoute, incident, setIncident,
      selectedNode, setSelectedNode, xray, setXray, dataView, setDataView,
      corridor, setCorridor, corridorActive, setCorridorActive,
      aiOpen, setAiOpen, aiSpeaking, setAiSpeaking, aiState, setAiState,
      lastAiReply, setLastAiReply, finaleStats, setFinaleStats,
      getExperienceContext, touch, lastTouch,
    }),
    [screen, lang, go, kioskZoom, soundOn, cargo, scenario, route, incident, selectedNode, xray, dataView, corridor, corridorActive, aiOpen, aiSpeaking, aiState, lastAiReply, finaleStats, getExperienceContext, touch, lastTouch]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useKiosk() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useKiosk outside provider");
  return v;
}

function scenarioOrigin(s: string | null) {
  if (s === "A") return "Abidjan";
  if (s === "B") return "Mine Nord CI";
  if (s === "C") return "Port d'Abidjan";
  return "Abidjan";
}
function scenarioDest(s: string | null) {
  if (s === "A") return "Site minier Nord";
  if (s === "B") return "Port de San Pedro";
  if (s === "C") return "Site industriel intérieur";
  return "Nord Côte d'Ivoire";
}

export function logEvent(name: string, data: Record<string, unknown>) {
  try {
    const raw = localStorage.getItem("agl_analytics") ?? "[]";
    const arr = JSON.parse(raw);
    arr.push({ name, data, ts: new Date().toISOString() });
    localStorage.setItem("agl_analytics", JSON.stringify(arr.slice(-500)));
  } catch {}
}
