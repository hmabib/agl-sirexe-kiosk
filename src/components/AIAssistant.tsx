"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useKiosk, logEvent } from "@/lib/store";
import { Orb } from "./Orb";
import { ModelBadge, sfx } from "./Fx";
import { askStream, playServerVoice, preferredModel } from "@/lib/live";

interface Msg { role: "user" | "ai"; text: string }

export function AIAssistant() {
  const k = useKiosk();
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Bonjour, je suis AGL AI. Touchez le micro et demandez-moi ce que vous voyez, le meilleur trajet, ou ce qu'AGL ferait ici." },
  ]);
  const [input, setInput] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: "smooth" });
  }, [msgs, k.aiState]);

  // Voix studio serveur (Gemini TTS) -> repli navigateur
  async function speak(text: string, meta?: { provider: string; model: string }) {
    try {
      k.setAiState("speaking");
      const serverOk = await playServerVoice(text, k.lang);
      if (!serverOk) {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text.slice(0, 400));
        u.lang = k.lang === "en" ? "en-US" : "fr-FR";
        u.rate = 1.02;
        await new Promise<void>((resolve) => {
          u.onend = () => resolve();
          u.onerror = () => resolve();
          speechSynthesis.speak(u);
          setTimeout(resolve, 25000);
        });
      }
    } catch { /* silencieux */ }
    k.setAiState("idle");
  }

  // Streaming temps réel : la réponse s'écrit au fil de l'eau
  async function ask(text: string, opts?: { whatYouSee?: boolean }) {
    if (!text.trim()) return;
    const userText = opts?.whatYouSee ? `Explique-moi ce que je vois. Contexte écran : ${JSON.stringify(k.getExperienceContext())}. Question : ${text}` : text;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    k.setAiState("thinking");
    sfx("whoosh");
    logEvent("ai_question", { text: text.slice(0, 200), ctx: k.getExperienceContext() });
    const aiIndex: number = -1;
    void aiIndex;
    setMsgs((m) => [...m, { role: "ai", text: "▍" }]);
    try {
      const meta = await askStream(
        {
          message: userText,
          context: k.getExperienceContext(),
          image: photo ?? undefined,
          lang: k.lang,
          model: preferredModel(),
        },
        (full) => {
          setMsgs((m) => {
            const c = [...m];
            c[c.length - 1] = { role: "ai", text: full + "▍" };
            return c;
          });
        }
      );
      const finalReply = meta.reply || "AGL AI est momentanément indisponible. Les expériences restent accessibles.";
      setMsgs((m) => {
        const c = [...m];
        c[c.length - 1] = { role: "ai", text: finalReply };
        return c;
      });
      k.setLastAiReply(finalReply);
      logEvent("voice_used", { mode: "text", provider: meta.provider, model: meta.model });
      speak(finalReply, { provider: meta.provider, model: meta.model });
    } catch {
      const fallback = "AGL AI est momentanément indisponible. Je peux toutefois vous guider : suivez le flux doré, du site vers le port puis le navire.";
      setMsgs((m) => [...m, { role: "ai", text: fallback }]);
      k.setAiState("idle");
    }
  }

  function startVoice() {
    k.touch();
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      // fallback: simulate listening 2s then prompt typed
      k.setAiState("listening");
      setTimeout(() => k.setAiState("idle"), 2000);
      return;
    }
    try { recRef.current?.stop(); } catch {}
    const rec = new SR();
    rec.lang = k.lang === "en" ? "en-US" : "fr-FR";
    rec.interimResults = false;
    k.setAiState("listening");
    logEvent("voice_used", { mode: "mic" });
    rec.onresult = (e: any) => {
      const txt = e.results?.[0]?.[0]?.transcript ?? "";
      if (txt) ask(txt);
    };
    rec.onend = () => { if (k.aiState === "listening") k.setAiState("idle"); };
    rec.onerror = () => k.setAiState("idle");
    recRef.current = rec;
    rec.start();
    // auto stop 8s
    setTimeout(() => { try { rec.stop(); } catch {} }, 8000);
  }

  async function enableCamera() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraOn(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 200);
    } catch { alert("Caméra indisponible sur cette borne."); }
  }

  function capturePhoto() {
    try {
      const v = videoRef.current;
      if (!v) return;
      const c = document.createElement("canvas");
      c.width = v.videoWidth; c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0);
      setPhoto(c.toDataURL("image/jpeg", 0.7));
    } catch {}
  }

  const suggestions = [
    "Qu'est-ce que je regarde ?",
    "Pourquoi ce trajet ?",
    "Que ferait AGL ici ?",
    "80 tonnes : route ou rail ?",
    "Impact environnemental ?",
  ];

  return (
    <>
      {/* floating mic + ask-what-you-see */}
      <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
        <button
          onClick={() => { k.touch(); ask(k.lang === "fr" ? "Explique-moi ce que je vois." : "Explain what I see.", { whatYouSee: true }); k.setAiOpen(true); }}
          className="touch-target glass rounded-full px-5 h-16 flex items-center gap-2 text-sm font-bold text-[#F2D28B]"
        >
          👁️🎙️ {k.lang === "fr" ? "ASK WHAT YOU SEE" : "ASK WHAT YOU SEE"}
        </button>
        <button
          onClick={() => { k.setAiOpen(true); startVoice(); }}
          className="halo-btn touch-target rounded-full w-20 h-20 bg-gradient-to-br from-[#D6A84B] to-[#8a6420] text-3xl shadow-2xl"
          aria-label="Parler à AGL AI"
        >
          🎙️
        </button>
      </div>

      <AnimatePresence>
        {k.aiOpen && (
          <motion.div
            initial={{ x: 480, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 480, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 260 }}
            className="fixed top-0 right-0 h-full w-full max-w-[440px] z-50 glass border-l border-[#D6A84B]/40 flex flex-col"
          >
            <div className="p-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <Orb state={k.aiState} size={54} />
                <div>
                  <div className="font-extrabold tracking-widest">AGL AI</div>
                  <div className="text-xs text-[#F2D28B]">
                    {k.aiState === "listening" ? (k.lang === "fr" ? "Je vous écoute…" : "I'm listening…") : k.aiState === "thinking" ? (k.lang === "fr" ? "Analyse en cours…" : "Thinking…") : k.aiState === "speaking" ? "● speaking" : "● online"}
                  </div>
                  <div className="mt-1 flex"><ModelBadge /></div>
                </div>
              </div>
              <button onClick={() => { k.setAiOpen(false); try { speechSynthesis.cancel(); } catch {} k.setAiState("idle"); }} className="touch-target w-12 h-12 rounded-full bg-white/10 text-xl">✕</button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 kiosk-scroll">
              {msgs.map((m, i) => (
                <div key={i} className={`max-w-[90%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${m.role === "ai" ? "bg-[#003F73]/70 border border-[#D6A84B]/30" : "ml-auto bg-[#D6A84B] text-[#001D3D] font-semibold"}`}>
                  {m.text}
                </div>
              ))}
              {k.aiState === "thinking" && <div className="text-sm text-white/60 animate-pulse">⚡ Le dernier modèle analyse le contexte écran en streaming…</div>}
              {cameraOn && (
                <div className="rounded-2xl overflow-hidden border border-[#D6A84B]/40">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-48 object-cover bg-black" />
                  <div className="flex gap-2 p-2">
                    <button onClick={capturePhoto} className="flex-1 h-12 rounded-xl bg-[#D6A84B] text-[#001D3D] font-bold">📸 Capturer</button>
                    <button onClick={() => setCameraOn(false)} className="h-12 px-4 rounded-xl bg-white/10">Off</button>
                  </div>
                  {photo && <div className="p-2 text-xs text-emerald-300">✓ Image jointe — posez votre question, Gemini la verra.</div>}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-white/10 space-y-3">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {suggestions.map((s) => (
                  <button key={s} onClick={() => ask(s)} className="shrink-0 text-xs px-3 h-10 rounded-full bg-white/10 border border-white/15 hover:border-[#D6A84B]">
                    {s}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={startVoice} className={`touch-target w-16 h-16 rounded-2xl text-2xl ${k.aiState === "listening" ? "bg-red-500 animate-pulse" : "bg-gradient-to-br from-[#D6A84B] to-[#8a6420]"}`}>🎙️</button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") ask(input); }}
                  placeholder={k.lang === "fr" ? "Écrivez ou parlez…" : "Type or speak…"}
                  className="flex-1 h-16 rounded-2xl bg-black/40 border border-white/15 px-4 outline-none focus:border-[#D6A84B]"
                />
                <button onClick={() => ask(input)} className="touch-target w-16 h-16 rounded-2xl bg-white text-[#001D3D] text-xl font-bold">➤</button>
              </div>
              <div className="flex gap-2 text-xs">
                <button onClick={cameraOn ? capturePhoto : enableCamera} className="flex-1 h-11 rounded-xl bg-white/10 border border-white/15">
                  📷 {cameraOn ? (k.lang === "fr" ? "Analyser l'image" : "Analyse image") : (k.lang === "fr" ? "Activer la caméra" : "Enable camera")}
                </button>
                <button onClick={() => ask("Explique-moi ce que je vois.", { whatYouSee: true })} className="flex-1 h-11 rounded-xl bg-white/10 border border-[#D6A84B]/40 text-[#F2D28B] font-bold">
                  👁️ {k.lang === "fr" ? "CE QUE JE VOIS" : "WHAT I SEE"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
