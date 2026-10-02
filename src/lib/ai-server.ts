import { promises as fs } from "fs";
import path from "path";
import { AGL_SYSTEM_PROMPT, VISION_VOICE_PROMPT } from "@/lib/prompt";

// ---- Derniers modèles (vérifié oct. 2026) ----
export const GEMINI_TEXT_DEFAULT = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const GEMINI_FALLBACKS = ["gemini-3.8-flash", "gemini-3.7-flash"];
export const GEMINI_LIVE_MODEL = process.env.GEMINI_LIVE_MODEL || "gemini-3.8-live";
export const GEMINI_TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-3.8-flash-tts";
export const MISTRAL_DEFAULT = "mistral-medium-latest";
export const MISTRAL_FALLBACKS = ["mistral-medium-latest", "mistral-large-latest"];

export type Provider = "gemini" | "mistral" | "mock-offline" | "mock-fallback";

export function detectProvider(key: string): "gemini" | "mistral" | "none" {
  if (!key) return "none";
  // Mistral uniquement si la clé vient explicitement de MISTRAL_API_KEY.
  // Les clés Gemini existent en 2 formats : AIza (legacy) et AQ. (nouveau format Auth Key).
  if (process.env.MISTRAL_API_KEY && key === process.env.MISTRAL_API_KEY) return "mistral";
  return "gemini";
}

export function resolveKey(): { key: string; provider: "gemini" | "mistral" | "none" } {
  if (process.env.MISTRAL_API_KEY) return { key: process.env.MISTRAL_API_KEY, provider: "mistral" };
  const key = process.env.GEMINI_API_KEY ?? "";
  return { key, provider: detectProvider(key) };
}

let knowledgeCache: string | null = null;
export async function getKnowledge(): Promise<string> {
  if (knowledgeCache !== null) return knowledgeCache;
  try {
    const dir = path.join(process.cwd(), "knowledge");
    const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".md"));
    const parts: string[] = [];
    for (const f of files.slice(0, 8)) {
      const txt = await fs.readFile(path.join(dir, f), "utf8");
      parts.push(`--- ${f} ---\n${txt.slice(0, 3000)}`);
    }
    knowledgeCache = parts.join("\n").slice(0, 9000);
  } catch {
    knowledgeCache = "";
  }
  return knowledgeCache;
}

export function mockReply(_message: string, context: unknown) {
  const c: any = context ?? {};
  const what = c.selectedNode ?? c.selectedScenario ?? c.route ?? c.cargo ?? "ce corridor";
  return `Vous regardez « ${what} » (expérience ${c.experience ?? "AGL"}). 1) Ce qui se passe : le flux relie la ressource au port puis au marché. 2) Pourquoi c'est important : chaque rupture coûte temps et fiabilité. 3) Savoir-faire AGL : multimodal route + rail, terminal ops et coordination douanière. (Simulation illustrative — AGL AI hors-ligne, ajoutez GEMINI_API_KEY pour le temps réel.)`;
}

async function callGemini(key: string, model: string, message: string, context: unknown, lang: string, image?: string, voice?: boolean) {
  const knowledge = await getKnowledge();
  const sys = voice ? `${VISION_VOICE_PROMPT}\n\n${AGL_SYSTEM_PROMPT}` : AGL_SYSTEM_PROMPT;
  const parts: any[] = [{
    text: `${sys}\n\nBase de connaissances AGL:\n${knowledge || "(vide — parler en termes généraux)"}\n\nContexte écran JSON:\n${JSON.stringify(context ?? {}).slice(0, 4000)}\n\nLangue: ${lang}\n${voice ? "Transcription visiteur (oral)" : "Question visiteur"}: ${message}`,
  }];
  if (image) {
    const b64 = image.includes(",") ? image.split(",")[1] : image;
    parts.push({ inline_data: { mime_type: "image/jpeg", data: b64.slice(0, 1500000) } });
  }
  const body: any = {
    contents: [{ parts }],
    generationConfig: { maxOutputTokens: 400, temperature: 0.6 },
  };
  // Retry anti-saturation (503/429 passagers) avant de changer de modèle
  let lastErr = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 700 * attempt));
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": key, // les clés AQ. exigent parfois le header plutôt que ?key=
      },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const j = await r.json();
      const reply = j.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("");
      if (reply) return reply as string;
      lastErr = `gemini:${model}:empty`;
      break; // réponse vide = inutile de réessayer
    }
    lastErr = `gemini:${model}:${r.status}:${(await r.text()).slice(0, 200)}`;
    console.error(lastErr.slice(0, 300));
    if (!/^(429|500|502|503)/.test(String(r.status))) break; // erreur dure = changer de modèle
  }
  throw new Error(lastErr);
}

async function callMistral(key: string, model: string, message: string, context: unknown, lang: string, image?: string, voice?: boolean) {
  const knowledge = await getKnowledge();
  const sys = voice ? `${VISION_VOICE_PROMPT}\n\n${AGL_SYSTEM_PROMPT}` : AGL_SYSTEM_PROMPT;
  const content = `${sys}\n\nBase AGL:\n${knowledge.slice(0, 3000)}\n\nContexte écran JSON: ${JSON.stringify(context ?? {}).slice(0, 4000)}\nLangue: ${lang}\nQuestion: ${message}${image ? "\n[Image jointe côté client — reste prudent.]" : ""}`;
  const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: sys },
        { role: "user", content },
      ],
      max_tokens: 400,
      temperature: 0.6,
    }),
  });
  if (!r.ok) throw new Error(`mistral:${model}:${r.status}:${(await r.text()).slice(0, 200)}`);
  const j = await r.json();
  const reply = j.choices?.[0]?.message?.content;
  if (!reply) throw new Error(`mistral:${model}:empty`);
  return reply as string;
}

export interface ReplyResult { reply: string; provider: Provider | "gemini" | "mistral"; model: string; error?: string }

export async function getReply(opts: {
  message: string; context?: unknown; image?: string; lang?: string; modelOverride?: string; voice?: boolean;
}): Promise<ReplyResult> {
  const { message, context, image, lang = "fr", modelOverride, voice } = opts;
  const { key, provider } = resolveKey();
  if (!key) return { reply: mockReply(message, context), provider: "mock-offline", model: "offline" };

  if (provider === "mistral") {
    const chain = [modelOverride, ...MISTRAL_FALLBACKS].filter(Boolean) as string[];
    let lastErr = "";
    for (const m of [...new Set(chain)]) {
      try {
        const reply = await callMistral(key, m, message, context, lang, image, voice);
        return { reply, provider: "mistral", model: m };
      } catch (e: any) { lastErr = String(e?.message ?? e); console.error(lastErr.slice(0, 300)); }
    }
    return { reply: mockReply(message, context), provider: "mock-fallback", model: chain[0] ?? MISTRAL_DEFAULT, error: lastErr };
  }

  const chain = [modelOverride, GEMINI_TEXT_DEFAULT, ...GEMINI_FALLBACKS].filter(Boolean) as string[];
  let lastErr = "";
  for (const m of [...new Set(chain)]) {
    try {
      const reply = await callGemini(key, m, message, context, lang, image, voice);
      return { reply, provider: "gemini", model: m };
    } catch (e: any) { lastErr = String(e?.message ?? e); console.error(lastErr.slice(0, 300)); }
  }
  return { reply: mockReply(message, context), provider: "mock-fallback", model: chain[0] ?? GEMINI_TEXT_DEFAULT, error: lastErr };
}

export function getModelInfo() {
  const { key, provider } = resolveKey();
  void key;
  return {
    provider,
    connected: provider !== "none",
    textModel: provider === "mistral" ? MISTRAL_DEFAULT : GEMINI_TEXT_DEFAULT,
    liveModel: GEMINI_LIVE_MODEL,
    ttsModel: GEMINI_TTS_MODEL,
    mistralModels: MISTRAL_FALLBACKS,
    geminiChain: GEMINI_FALLBACKS,
    knowledge: knowledgeCache ? knowledgeCache.length : 0,
  };
}
