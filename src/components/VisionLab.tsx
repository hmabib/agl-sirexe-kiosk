"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useKiosk, logEvent } from "@/lib/store";
import { TopBar } from "./Chrome";
import { Orb } from "./Orb";
import { sfx } from "./Fx";
import { askStream, playServerVoice, stopServerVoice, preferredModel } from "@/lib/live";

// Labels FR + lecture métier AGL pour chaque classe COCO utile
const FR: Record<string, [string, string]> = {
  truck: ["CAMION 🚚", "Transport routier — tracking & coordination AGL"],
  boat: ["NAVIRE 🚢", "Connexion maritime — terminal & manutention AGL"],
  car: ["VÉHICULE 🚗", "Flux corridor — fluidité du corridor"],
  bus: ["BUS 🚌", "Mobilité — flux de personnes du corridor"],
  motorcycle: ["MOTO 🏍️", "Dernier kilomètre — agilité urbaine"],
  bicycle: ["VÉLO 🚲", "Dernier kilomètre décarboné"],
  person: ["PERSONNE 👷", "HSE & sûreté — priorité AGL sur site"],
  traffic_light: ["FEU 🚦", "Infrastructure — régulation des flux"],
  stop_sign: ["SIGNALISATION 🛑", "Infrastructure — sécurité du corridor"],
  airplane: ["AVION ✈️", "Fret aérien — urgences & pièces critiques"],
  train: ["TRAIN 🚆", "Fret massifié bas-carbone — rail AGL"],
  forklift: ["CHARIOT 🏭", "Manutention — opérations terminal"],
};

interface Det { bbox: [number, number, number, number]; class: string; score: number }

export function VisionLab() {
  const k = useKiosk();
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const modelRef = useRef<any>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "live" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");
  const [dets, setDets] = useState<Det[]>([]);
  const [fps, setFps] = useState(0);
  const [detectOn, setDetectOn] = useState(true);
  const [aiReply, setAiReply] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const busyRef = useRef(false);
  // --- conversation live : caméra + micro + voix ---
  const [convo, setConvo] = useState(false);
  const [phase, setPhase] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [transcript, setTranscript] = useState("");
  const convoRef = useRef(false);
  const recRef = useRef<any>(null);
  const turnRef = useRef(false);

  async function start() {
    try {
      sfx("whoosh");
      setStatus("loading");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play().catch(() => {});
      setStatus("live");
      logEvent("vision_started", {});
      // charge le modèle de détection (lazy, chunk séparé)
      try {
        const tf = await import("@tensorflow/tfjs");
        await tf.ready();
        const coco = await import("@tensorflow-models/coco-ssd");
        modelRef.current = await coco.load({ base: "lite_mobilenet_v2" });
      } catch (e) {
        console.warn("CV model failed, camera only", e);
      }
      loop();
    } catch (e: any) {
      setStatus("error");
      setErrMsg("Caméra indisponible — vérifiez l'autorisation navigateur / HTTPS.");
    }
  }

  function stop() {
    stopConvo();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStatus("idle");
    setDets([]);
  }

  useEffect(() => () => { stopConvo(); streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  // ---------- CONVERSATION LIVE : elle entend + elle voit + elle répond ----------
  async function speakText(text: string): Promise<void> {
    setPhase("speaking");
    k.setAiState("speaking");
    const ok = await playServerVoice(text, k.lang);
    if (!ok) {
      await new Promise<void>((resolve) => {
        try {
          const u = new SpeechSynthesisUtterance(text.slice(0, 400));
          u.lang = k.lang === "en" ? "en-US" : "fr-FR";
          u.rate = 1.05;
          u.onend = () => resolve();
          u.onerror = () => resolve();
          speechSynthesis.cancel();
          speechSynthesis.speak(u);
          setTimeout(resolve, 25000);
        } catch { resolve(); }
      });
    }
  }

  function listenLoop() {
    if (!convoRef.current) return;
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setTranscript(k.lang === "fr" ? "(micro non supporté — utilisez le bouton Analyser)" : "(mic not supported — use Analyze)");
      return;
    }
    try { recRef.current?.abort(); } catch {}
    const rec = new SR();
    rec.lang = k.lang === "en" ? "en-US" : "fr-FR";
    rec.interimResults = true;
    rec.continuous = false;
    setPhase("listening");
    k.setAiState("listening");
    rec.onresult = (e: any) => {
      let interim = "", final = "";
      for (const r of e.results) {
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      setTranscript((final || interim).slice(0, 300));
      if (final.trim() && !turnRef.current) {
        turnRef.current = true;
        try { rec.stop(); } catch {}
        doTurn(final.trim());
      }
    };
    rec.onend = () => {
      // relance l'écoute si toujours en conversation et pas de tour en cours
      if (convoRef.current && !turnRef.current) setTimeout(() => listenLoop(), 350);
    };
    rec.onerror = () => {
      if (convoRef.current && !turnRef.current) setTimeout(() => listenLoop(), 800);
    };
    recRef.current = rec;
    try { rec.start(); } catch {}
  }

  async function doTurn(userText: string) {
    if (!convoRef.current) { turnRef.current = false; return; }
    setPhase("thinking");
    k.setAiState("thinking");
    logEvent("vision_convo_turn", { text: userText.slice(0, 150) });
    const img = snapshot();
    try {
      const meta = await askStream(
        {
          message: userText,
          context: { ...k.getExperienceContext(), experience: "vision-lab-live" },
          image: img ?? undefined,
          lang: k.lang,
          model: preferredModel(), // dernier modèle (admin) — défaut gemini-3.8-flash
          voice: true, // prompt conversation orale humaine
        },
        (full) => setAiReply(full + "▍")
      );
      const reply = meta.reply || (k.lang === "fr" ? "Je n'ai pas bien saisi, pouvez-vous répéter ?" : "Sorry, could you repeat that?");
      setAiReply(reply);
      k.setLastAiReply(reply);
      if (convoRef.current) await speakText(reply);
    } catch {
      if (convoRef.current) await speakText(k.lang === "fr" ? "Petit souci de connexion, je vous écoute quand même." : "Connection hiccup, I'm still listening.");
    }
    turnRef.current = false;
    setTranscript("");
    if (convoRef.current) {
      k.setAiState("idle");
      listenLoop(); // elle ré-écoute aussitôt — vraie conversation
    } else {
      setPhase("idle");
      k.setAiState("idle");
    }
  }

  async function startConvo() {
    if (status !== "live") await start();
    if (status !== "live" && !videoRef.current?.srcObject) return;
    sfx("whoosh");
    convoRef.current = true;
    setConvo(true);
    setAiReply("");
    logEvent("vision_convo_started", {});
    // phrase d'accueil parlée
    const hello = k.lang === "fr"
      ? "Bonjour ! Je vous vois et je vous entends. Montrez-moi quelque chose ou posez-moi votre question."
      : "Hello! I can see and hear you. Show me something or ask away.";
    setAiReply(hello);
    await speakText(hello);
    if (convoRef.current) listenLoop();
  }

  function stopConvo() {
    convoRef.current = false;
    turnRef.current = false;
    try { recRef.current?.abort(); } catch {}
    stopServerVoice();
    setConvo(false);
    setPhase("idle");
    if (!aiBusy) k.setAiState("idle");
  }

  function interrupt() {
    // touchez pour l'interrompre : elle se tait et ré-écoute
    stopServerVoice();
    turnRef.current = false;
    if (convoRef.current) listenLoop();
  }

  async function loop() {
    const v = videoRef.current;
    if (!v || v.readyState < 2) { requestAnimationFrame(loop); return; }
    const t0 = performance.now();
    // dessine l'overlay à la taille affichée
    const cv = overlayRef.current!;
    const box = v.getBoundingClientRect();
    cv.width = box.width; cv.height = box.height;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, cv.width, cv.height);

    let cur: Det[] = [];
    if (detectOn && modelRef.current && !busyRef.current) {
      busyRef.current = true;
      try {
        const preds = await modelRef.current.detect(v, 20, 0.45);
        cur = preds.map((p: any) => ({ bbox: p.bbox, class: p.class, score: p.score }));
        setDets(cur);
      } catch { /* ignore frame */ }
      busyRef.current = false;
    } else if (!detectOn) {
      setDets((d) => (d.length ? [] : d));
    }

    // mise à l'échelle vidéo native -> affichée (object-fit cover)
    const vw = v.videoWidth, vh = v.videoHeight;
    const scale = Math.max(cv.width / vw, cv.height / vh);
    const ox = (cv.width - vw * scale) / 2, oy = (cv.height - vh * scale) / 2;
    const show = detectOn ? (cur.length ? cur : dets) : [];
    for (const d of show) {
      const [x, y, w, h] = d.bbox;
      const X = ox + x * scale, Y = oy + y * scale, W = w * scale, H = h * scale;
      const fr = FR[d.class]?.[0] ?? d.class.toUpperCase();
      ctx.strokeStyle = "#D6A84B"; ctx.lineWidth = 3;
      ctx.shadowColor = "rgba(214,168,75,.8)"; ctx.shadowBlur = 12;
      ctx.strokeRect(X, Y, W, H);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(0,29,61,.85)";
      const label = `${fr} ${Math.round(d.score * 100)}%`;
      ctx.font = "bold 15px Manrope, sans-serif";
      const tw = ctx.measureText(label).width;
      ctx.fillRect(X, Y - 24, tw + 14, 24);
      ctx.fillStyle = "#F2D28B";
      ctx.fillText(label, X + 7, Y - 7);
    }
    setFps(Math.round(1000 / Math.max(1, performance.now() - t0 + 16)));
    setTimeout(() => requestAnimationFrame(loop), detectOn ? 120 : 600);
  }

  function snapshot(): string | null {
    const v = videoRef.current;
    if (!v || v.readyState < 2) return null;
    const c = document.createElement("canvas");
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    return c.toDataURL("image/jpeg", 0.75);
  }

  async function askGemini() {
    const img = snapshot();
    if (!img) return;
    setAiBusy(true); setAiReply("▍");
    k.setAiState("thinking");
    logEvent("vision_gemini", { detections: dets.map((d) => d.class) });
    try {
      const meta = await askStream(
        {
          message: `Voici ce que voit la caméra de la borne (objets détectés sur place : ${dets.map((d) => `${d.class} ${Math.round(d.score * 100)}%`).join(", ") || "aucun"}). Décris ce que tu vois sur l'image, puis explique quel savoir-faire AGL s'applique (<100 mots).`,
          context: { ...k.getExperienceContext(), experience: "vision-lab" },
          image: img,
          lang: k.lang,
          model: preferredModel(),
        },
        (full) => setAiReply(full + "▍")
      );
      setAiReply(meta.reply);
      k.setLastAiReply(meta.reply);
      k.setAiState("speaking");
      const ok = await playServerVoice(meta.reply, k.lang);
      if (!ok) {
        try {
          const u = new SpeechSynthesisUtterance(meta.reply.slice(0, 400));
          u.lang = k.lang === "en" ? "en-US" : "fr-FR";
          speechSynthesis.cancel(); speechSynthesis.speak(u);
        } catch {}
      }
      k.setAiState("idle");
    } catch {
      setAiReply("Analyse image momentanément indisponible.");
      k.setAiState("idle");
    }
    setAiBusy(false);
  }

  const top = [...dets].sort((a, b) => b.score - a.score).slice(0, 3);

  return (
    <div className="absolute inset-0 overflow-y-auto kiosk-scroll" style={{ background: "linear-gradient(180deg,#00060f,#001D3D)" }}>
      <TopBar title="VISION LAB" subtitle={k.lang === "fr" ? "Montrez un objet, un plan, un équipement — l'IA voit et explique." : "Show an object, plan or equipment — AI sees and explains."} />
      <div className="max-w-6xl mx-auto px-6 md:px-10 pb-32 grid md:grid-cols-5 gap-5 mt-4">
        <div className="md:col-span-3 glass rounded-3xl p-4">
          {status !== "live" ? (
            <div className="min-h-[380px] flex flex-col items-center justify-center text-center gap-4 p-8">
              <div className="text-7xl">📷</div>
              <h2 className="text-2xl font-extrabold">Computer vision temps réel</h2>
              <p className="text-white/60 max-w-md">Détection d'objets sur la borne (camions, navires, personnes, trains…) + analyse Gemini Vision de ce que vous montrez.</p>
              {status === "loading" && <div className="text-[#F2D28B] animate-pulse">Démarrage caméra + chargement du modèle…</div>}
              {status === "error" && <div className="text-red-300">{errMsg}</div>}
              <button onClick={start} className="halo-btn h-16 px-10 rounded-full bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] font-extrabold text-lg touch-target">
                ▶ ACTIVER LA CAMÉRA
              </button>
              <div className="text-xs text-white/40">Caméra OFF par défaut • activation volontaire • rien n'est enregistré</div>
            </div>
          ) : (
            <>
            {/* barre conversation live */}
            <div className="rounded-2xl bg-black/50 border border-[#D6A84B]/40 p-4 mb-3">
              <div className="flex items-center gap-3">
                <button onClick={() => { convo ? stopConvo() : startConvo(); k.touch(); }}
                  className={`halo-btn shrink-0 h-16 w-16 rounded-full text-2xl ${convo ? "bg-red-500 animate-pulse" : "bg-gradient-to-br from-[#D6A84B] to-[#8a6420]"}`}>
                  {convo ? "⏹" : "🎙️"}
                </button>
                <div className="flex-1">
                  <button onClick={() => { convo ? stopConvo() : startConvo(); k.touch(); }}
                    className={`w-full h-14 rounded-xl font-extrabold text-base ${convo ? "bg-red-500/20 border border-red-400/50" : "bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D]"}`}>
                    {convo ? (k.lang === "fr" ? "⏹ STOPPER LA CONVERSATION" : "⏹ STOP CONVERSATION") : (k.lang === "fr" ? "🟢 CONVERSATION LIVE : elle voit + entend + répond" : "🟢 LIVE TALK: she sees + hears + answers")}
                  </button>
                  <div className="text-xs mt-1 h-5 text-[#F2D28B]">
                    {convo && phase === "listening" && (k.lang === "fr" ? "🎙️ Je vous écoute… parlez !" : "🎙️ Listening… speak!")}
                    {convo && phase === "thinking" && "⚡ Je regarde et je réfléchis…"}
                    {convo && phase === "speaking" && (k.lang === "fr" ? "🔊 Je parle — touchez l'orb pour m'interrompre" : "🔊 Speaking — tap the orb to interrupt")}
                  </div>
                </div>
                <button onClick={interrupt} title="Interrompre" className="shrink-0 touch-target">
                  <Orb state={convo ? (phase === "idle" ? "idle" : phase) : "idle"} size={52} />
                </button>
              </div>
              {transcript !== "" && (
                <div className="mt-2 ml-auto max-w-[90%] rounded-2xl px-4 py-2 bg-[#D6A84B] text-[#001D3D] font-semibold text-sm">🗣️ {transcript}</div>
              )}
            </div>
            <div className="relative rounded-2xl overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted className="w-full h-[380px] md:h-[440px] object-cover" />
              <canvas ref={overlayRef} className="absolute inset-0 w-full h-full pointer-events-none" />
              <div className="absolute top-3 left-3 flex gap-2">
                <span className="px-3 h-9 flex items-center rounded-full bg-red-600/90 text-xs font-extrabold animate-pulse">● LIVE</span>
                <span className="px-3 h-9 flex items-center rounded-full bg-black/70 text-xs font-mono text-[#5df2c8]">{dets.length} objets • ~{fps} fps</span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex gap-2">
                <button onClick={() => { setDetectOn(!detectOn); sfx("pop"); }} className={`flex-1 h-14 rounded-xl font-extrabold ${detectOn ? "bg-[#D6A84B] text-[#001D3D]" : "bg-black/70"}`}>
                  {detectOn ? "◉ DÉTECTION ON" : "○ DÉTECTION OFF"}
                </button>
                <button onClick={askGemini} disabled={aiBusy} className="flex-1 h-14 rounded-xl font-extrabold bg-gradient-to-r from-[#D6A84B] to-[#F2D28B] text-[#001D3D] disabled:opacity-50">
                  {aiBusy ? "⚡ ANALYSE…" : "🤖 ANALYSER AVEC GEMINI"}
                </button>
                <button onClick={stop} className="h-14 px-5 rounded-xl bg-black/70 font-bold">⏹</button>
              </div>
            </div>
            </>
          )}
          {/* video/canvas montés en permanence pour le flux */}
          <div className="hidden">
            {status === "idle" && (<><video ref={videoRef} playsInline muted /><canvas ref={overlayRef} /></>)}
          </div>
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="glass rounded-3xl p-6">
            <div className="text-xs tracking-[0.25em] text-[#D6A84B] font-bold">CE QUE VOIT LA BORNE</div>
            {top.length === 0 ? (
              <div className="text-white/50 mt-3">En attente de détection… montrez un camion, un conteneur, un plan.</div>
            ) : (
              <div className="space-y-2 mt-3">
                {top.map((d, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="rounded-2xl bg-black/40 border border-[#D6A84B]/40 p-3">
                    <div className="font-extrabold text-[#F2D28B]">{FR[d.class]?.[0] ?? d.class.toUpperCase()} <span className="text-white/60 text-sm">{Math.round(d.score * 100)}%</span></div>
                    <div className="text-sm text-white/70">{FR[d.class]?.[1] ?? "Élément du corridor logistique."}</div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
          {(aiReply || aiBusy) && (
            <div className="glass glass-selected rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-2"><Orb state={aiBusy ? "thinking" : "speaking"} size={40} /><span className="font-extrabold tracking-widest text-sm">GEMINI VISION</span></div>
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap">{aiReply}</div>
            </div>
          )}
          <button onClick={() => { k.setFinaleStats({ Objets: dets.length, Vision: "GEMINI 3.8" }); k.go("finale"); }} className="w-full h-14 rounded-2xl bg-white/10 font-bold">TERMINER →</button>
        </div>
      </div>
    </div>
  );
}
