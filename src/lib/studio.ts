"use client";
import type { Screen } from "./store";

export type StudioTab = "image" | "schema" | "storyboard" | "doc";
export interface StudioResult { image: string; raw: string; text: string; model: string }

export const STUDIO_LINKS: { screen: Screen; fr: string; en: string }[] = [
  { screen: "mission", fr: "Mission Control", en: "Mission Control" },
  { screen: "mining", fr: "Mining Journey", en: "Mining Journey" },
  { screen: "explore", fr: "Explore Africa Global Logistics", en: "Explore Africa Global Logistics" },
  { screen: "build", fr: "Build Africa", en: "Build Africa" },
  { screen: "vision", fr: "Vision Lab", en: "Vision Lab" },
  { screen: "appointment", fr: "Rendez-vous", en: "Appointment" },
  { screen: "quotation", fr: "Cotation", en: "Quotation" },
];

const LOGO_URL = "/assets/template/image6.svg";
let logoPromise: Promise<HTMLImageElement | null> | null = null;
function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src; });
}
export function aglLogo() {
  logoPromise ??= loadImage(LOGO_URL).catch(() => null);
  return logoPromise;
}

// Habillage charte AGL : bandeau navy dégradé, filet or, logo officiel en bas à droite.
export function drawBrand(ctx: CanvasRenderingContext2D, W: number, H: number, logo: HTMLImageElement | null) {
  const band = H * 0.24;
  const g = ctx.createLinearGradient(0, H - band, 0, H);
  g.addColorStop(0, "rgba(27,54,95,0)"); g.addColorStop(0.55, "rgba(27,54,95,.72)"); g.addColorStop(1, "rgba(10,26,51,.94)");
  ctx.fillStyle = g; ctx.fillRect(0, H - band, W, band);
  ctx.fillStyle = "#EED58E"; ctx.fillRect(0, H - Math.max(3, H * 0.006), W, Math.max(3, H * 0.006));
  const pad = W * 0.035;
  if (logo) { const lw = W * 0.15, lh = lw * (logo.naturalHeight || 178) / (logo.naturalWidth || 324); ctx.drawImage(logo, W - pad - lw, H - pad - lh, lw, lh); }
  ctx.font = `600 ${Math.round(W * 0.016)}px Arial, sans-serif`; ctx.fillStyle = "rgba(238,213,142,.92)"; ctx.textBaseline = "bottom";
  ctx.fillText("AFRICA GLOBAL LOGISTICS · VISUEL INDICATIF", pad, H - pad);
}

export async function brandImage(raw: string): Promise<string> {
  try {
    const [img, logo] = await Promise.all([loadImage(raw), aglLogo()]);
    const cv = document.createElement("canvas");
    cv.width = img.naturalWidth || 1024; cv.height = img.naturalHeight || 1024;
    const ctx = cv.getContext("2d"); if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    drawBrand(ctx, cv.width, cv.height, logo);
    return cv.toDataURL("image/jpeg", 0.92);
  } catch { return raw; }
}

// Orchestration : une même demande n’est générée qu’une fois (partagée entre vues),
// une relance automatique couvre les échecs passagers, l’annulation ne touche que l’appelant.
const inflight = new Map<string, Promise<StudioResult>>();
async function requestImage(prompt: string, lang: string): Promise<StudioResult> {
  for (let attempt = 0; ; attempt++) {
    let res: Response | null = null;
    let j: { ok?: boolean; image?: string; text?: string; model?: string; message?: string } = {};
    try {
      res = await fetch("/api/studio/image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: prompt.slice(0, 800), lang }) });
      try { j = await res.json(); } catch { /* ignore */ }
    } catch { /* réseau : relance ci-dessous */ }
    if (res?.ok && j.ok && j.image) {
      aglLogo();
      return { image: await brandImage(j.image), raw: j.image, text: j.text ?? "", model: j.model ?? "" };
    }
    if (attempt >= 1 || res?.status === 400) throw new Error(j.message || "image failed");
    await new Promise(r => setTimeout(r, 1200));
  }
}
export function generateStudioImage(prompt: string, lang: string, signal?: AbortSignal): Promise<StudioResult> {
  const key = `${lang}|${prompt.trim()}`;
  let job = inflight.get(key);
  if (!job) {
    aglLogo();
    job = requestImage(prompt, lang);
    inflight.set(key, job);
    job.catch(() => inflight.delete(key));
  }
  if (!signal) return job;
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(new Error("aborted"));
    signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    job.then(resolve, reject);
  });
}

export function splitSteps(body: string): string[] {
  return body.split(/\n|→|>|→/).map(s => s.replace(/^[\s\d.)\-•*]+/, "").trim()).filter(Boolean).slice(0, 8);
}

export function splitScenes(body: string): string[] {
  const parts = body.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean);
  if (parts.length > 1) return parts.slice(0, 6);
  const numbered = body.split(/(?=^\d+[.)]\s)/m).map(s => s.trim()).filter(Boolean);
  return (numbered.length > 1 ? numbered : [body.trim()].filter(Boolean)).slice(0, 6);
}

// Film : lancement puis suivi de la file d’attente ; onStatus fait vivre la vue pendant le tournage.
export async function generateStudioVideo(prompt: string, onStatus?: (s: "queued" | "filming") => void, signal?: AbortSignal): Promise<string> {
  const start = await fetch("/api/studio/video", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt }), signal });
  const j = await start.json().catch(() => ({}));
  if (!start.ok || !j.job) throw new Error(j.message || "video failed");
  const deadline = Date.now() + 180000;
  for (let wait = 2500; Date.now() < deadline; wait = Math.min(4000, wait + 500)) {
    await new Promise(r => setTimeout(r, wait));
    if (signal?.aborted) throw new Error("aborted");
    const r = await fetch(`/api/studio/video?job=${encodeURIComponent(j.job)}`, { signal });
    const s = await r.json().catch(() => ({}));
    if (!r.ok || !s.ok) throw new Error(s.message || "video failed");
    if (s.status === "done" && s.url) return s.url;
    onStatus?.(s.status);
  }
  throw new Error("video timeout");
}
