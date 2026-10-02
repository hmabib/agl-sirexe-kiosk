"use client";
import type { Screen } from "./store";

export type StudioTab = "image" | "schema" | "storyboard" | "doc";
export interface StudioResult { image: string; text: string; model: string }

export const STUDIO_LINKS: { screen: Screen; fr: string; en: string }[] = [
  { screen: "mission", fr: "Mission Control", en: "Mission Control" },
  { screen: "mining", fr: "Mining Journey", en: "Mining Journey" },
  { screen: "explore", fr: "Explore AGL", en: "Explore AGL" },
  { screen: "build", fr: "Build Africa", en: "Build Africa" },
  { screen: "vision", fr: "Vision Lab", en: "Vision Lab" },
  { screen: "appointment", fr: "Rendez-vous", en: "Appointment" },
  { screen: "quotation", fr: "Cotation", en: "Quotation" },
];

export async function generateStudioImage(prompt: string, lang: string, signal?: AbortSignal): Promise<StudioResult> {
  let res: Response;
  try {
    res = await fetch("/api/studio/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: prompt.slice(0, 800), lang }),
      signal,
    });
  } catch {
    throw new Error("image failed");
  }
  let j: { ok?: boolean; image?: string; text?: string; model?: string; message?: string } = {};
  try { j = await res.json(); } catch { /* ignore */ }
  if (!res.ok || !j.ok || !j.image) throw new Error(j.message || "image failed");
  return { image: j.image, text: j.text ?? "", model: j.model ?? "" };
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
