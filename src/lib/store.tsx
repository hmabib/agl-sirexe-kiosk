"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "./i18n";
import { AGL_SYSTEM_PROMPT } from "./prompt";

export { AGL_SYSTEM_PROMPT };

export type Screen = "attract" | "home" | "games" | "mission" | "explore" | "build" | "vision" | "mining" | "corporate" | "appointment" | "careers" | "quotation" | "satisfaction" | "market" | "finale";
export const SCREEN_PATHS: Record<Screen, string> = { attract: "/", home: "/accueil", games: "/experiences", mission: "/mission", explore: "/explore", build: "/build", vision: "/vision", mining: "/mining", corporate: "/presentation", appointment: "/rendez-vous", careers: "/emploi", quotation: "/cotation", satisfaction: "/satisfaction", market: "/performance", finale: "/resultats" };

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
  details?: Record<string, unknown>;
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
  contextDetails: Record<string, unknown>;
  setContextDetails: (d: Record<string, unknown>) => void;
  pendingQuestion: string;
  requestAI: (question: string) => void;
}

const Ctx = createContext<KioskState | null>(null);

export function KioskProvider({ children, initialScreen = "attract" }: { children: React.ReactNode; initialScreen?: Screen }) {
  const [screen, setScreen] = useState<Screen>(initialScreen);
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
  const [lastTouch, setLastTouch] = useState(()=>Date.now());
  const [contextDetails, setContextDetails] = useState<Record<string, unknown>>({});
  const [pendingQuestion, setPendingQuestion] = useState("");
  const screenRef = useRef(screen);
  useEffect(()=>{screenRef.current=screen;},[screen]);

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
      const longSession = ["satisfaction", "quotation", "appointment", "careers", "vision"].includes(screenRef.current);
      if (screenRef.current !== "attract" && Date.now() - lastTouch > (longSession ? 300000 : 90000)) {
        setScreen("attract");
        setCargo(null); setScenario(null); setRoute(null); setIncident(null);
        setSelectedNode(null); setCorridor([]); setCorridorActive(false);
        setAiOpen(false); setAiState("idle");
        setLastAiReply(""); setContextDetails({}); setFinaleStats(null);
        window.history.replaceState(null, "", "/");
        logEvent("session_reset_idle", {});
      }
    }, 5000);
    return () => clearInterval(id);
  }, [lastTouch]);

  const go = useCallback((s: Screen) => {
    logEvent(s === "attract" ? "session_started" : "experience_selected", { screen: s });
    setScreen(s);
    setContextDetails({});
    window.history.pushState(null, "", SCREEN_PATHS[s]);
    setLastTouch(Date.now());
  }, []);
  useEffect(() => {
    const pop = () => { const entry = Object.entries(SCREEN_PATHS).find(([,p])=> p === window.location.pathname); if(entry) { setScreen(entry[0] as Screen); setLastTouch(Date.now()); } };
    window.addEventListener("popstate", pop); return () => window.removeEventListener("popstate", pop);
  }, []);
  const requestAI = useCallback((question: string) => { setPendingQuestion(`${Date.now()}::${question}`); setAiOpen(true); setLastTouch(Date.now()); }, []);

  const getExperienceContext = useCallback((): ExperienceContext => {
    return {
      experience: screenRef.current,
      lang,
      cargo: cargo ?? undefined,
      origin: scenarioOrigin(scenario),
      destination: scenarioDest(scenario),
      transportMode: route === "route-B" ? ["road", "rail", "sea"] : ["road", "sea"],
      currentScreen: screenRef.current,
      selectedScenario: scenario ?? undefined,
      selectedNode: selectedNode ?? undefined,
      corridor,
      incident,
      zoom: kioskZoom,
      timestamp: new Date().toISOString(),
      details: contextDetails,
    };
  }, [lang, cargo, scenario, route, selectedNode, corridor, incident, kioskZoom, contextDetails]);

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
      contextDetails, setContextDetails, pendingQuestion, requestAI,
    }),
    [screen, lang, go, kioskZoom, soundOn, cargo, scenario, route, incident, selectedNode, xray, dataView, corridor, corridorActive, aiOpen, aiSpeaking, aiState, lastAiReply, finaleStats, getExperienceContext, touch, lastTouch, contextDetails, pendingQuestion, requestAI]
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
    const { text: _text, ctx: _ctx, context: _context, ...anonymous } = data;
    arr.push({ name, data: anonymous, ts: new Date().toISOString() });
    localStorage.setItem("agl_analytics", JSON.stringify(arr.slice(-500)));
  } catch {}
}
