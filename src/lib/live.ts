"use client";
import { publishAction, type MaterialAction } from "./actions";

export interface StreamResult { reply: string; provider: string; model: string; error?: string | null; actions?: MaterialAction[]; degraded?: boolean }

// Streaming SSE natif : onToken reçoit le texte cumulé.
export async function askStream(
  payload: { message: string; context?: unknown; image?: string; lang?: string; model?: string; voice?: boolean; deepThink?: boolean; history?: {role:"user"|"ai";text:string}[] },
  onToken: (full: string) => void,
  signal?: AbortSignal
): Promise<StreamResult> {
  let res: Response;
  try {
    res = await fetch("/api/gemini/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch {
    throw new Error("stream failed");
  }
  if (!res.ok || !res.body) {
    let message = "stream failed";
    try {
      const err = await res.json();
      if (typeof err.message === "string" && err.message) message = err.message;
    } catch { /* ignore */ }
    throw new Error(message);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let meta: StreamResult = { reply: "", provider: "?", model: "?" };
  let buf = "";
  let streamed = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split("\n\n");
    buf = parts.pop() ?? "";
    for (const p of parts) {
      const line = p.trim().replace(/^data:\s*/, "");
      if (!line) continue;
      try {
        const j = JSON.parse(line);
        if (j.t) { full += j.t; onToken(full); }
        // Les vues sont publiées dès l’appel d’outil, avant la fin du texte.
        if (j.action) { streamed++; publishAction(j.action); }
        if (j.done) {meta = { reply: j.reply || full, provider: j.provider, model: j.model, actions: j.actions, degraded: j.degraded };if(!streamed)for(const action of j.actions??[])publishAction(action);}
      } catch { /* ignore */ }
    }
  }
  if (!meta.reply && !full) throw new Error("stream failed");
  meta.reply = meta.reply || full;
  return meta;
}

// Repli navigateur : toujours une voix féminine, française en FR.
const FEMALE_VOICES = /am[ée]lie|audrey|aur[ée]lie|marie|julie|c[ée]line|denise|eloise|vivienne|virginie|hortense|l[ée]a|chantal|google fran[çc]ais|samantha|victoria|karen|zira|aria|jenny|female|femme/i;
const MALE_VOICES = /thomas|daniel|henri|paul|claude|nicolas|jacques|alex|fred|male|homme/i;
export function speakLocal(text: string, lang: string) {
  if (typeof speechSynthesis === "undefined") return;
  const tag = lang === "en" ? "en" : "fr-FR";
  const voices = speechSynthesis.getVoices().filter(v => lang === "en" ? v.lang.startsWith("en") : v.lang.replace("_", "-").toLowerCase() === "fr-fr");
  const voice = voices.find(v => FEMALE_VOICES.test(v.name) && !/\bmale\b/i.test(v.name)) ?? voices.find(v => !MALE_VOICES.test(v.name));
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang === "en" ? "en-US" : tag;
  if (voice) u.voice = voice;
  u.pitch = 1.05;
  speechSynthesis.speak(u);
}

// Tente la voix studio serveur, sinon false -> synthèse locale.
let currentAudio: HTMLAudioElement | null = null;
export function stopServerVoice() {
  try {
    if (currentAudio) { currentAudio.pause(); currentAudio.src = ""; currentAudio = null; }
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
  } catch { /* silencieux */ }
}
export async function playServerVoice(text: string, lang: string): Promise<boolean> {
  try {
    const r = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 500), lang }),
    });
    if (!r.ok) return false;
    const j = await r.json();
    if (!j.ok || !j.audio) return false;
    await new Promise<void>((resolve) => {
      const a = new Audio(j.audio);
      currentAudio = a;
      a.onended = () => { if (currentAudio === a) currentAudio = null; resolve(); };
      a.onerror = () => { if (currentAudio === a) currentAudio = null; resolve(); };
      a.play().catch(() => resolve());
      setTimeout(resolve, 30000);
    });
    return true;
  } catch {
    return false;
  }
}

export function preferredModel(): string | undefined {
  try {
    return localStorage.getItem("agl_model") || undefined;
  } catch {
    return undefined;
  }
}
