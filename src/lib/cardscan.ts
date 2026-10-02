"use client";

export interface CardData { name: string; company: string; role: string; email: string; phone: string; }
export const EMPTY_CARD: CardData = { name: "", company: "", role: "", email: "", phone: "" };

const PROMPT = `Lis cette carte de visite et réponds UNIQUEMENT avec un objet JSON, sans markdown ni explication : {"name":"nom complet","company":"société","role":"fonction","email":"email","phone":"téléphone"}. Chaîne vide pour tout champ illisible. / Read this business card and reply ONLY with a JSON object, no markdown: {"name":"...","company":"...","role":"...","email":"...","phone":"..."}. Empty string for any unreadable field.`;

export async function extractCard(image: string, lang: string, signal?: AbortSignal): Promise<CardData> {
  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: PROMPT, image, lang }),
    signal,
  });
  if (!res.ok) throw new Error("cardscan failed");
  const j = await res.json();
  const text = typeof j.reply === "string" ? j.reply : "";
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("cardscan failed");
  const p = JSON.parse(m[0]);
  const s = (v: unknown) => (typeof v === "string" ? v.slice(0, 120) : "");
  return { name: s(p.name), company: s(p.company), role: s(p.role), email: s(p.email), phone: s(p.phone) };
}

export function saveCardPrefill(card: CardData) {
  try {
    localStorage.setItem("agl_card_prefill", JSON.stringify({ name: card.name, company: card.company, email: card.email, phone: card.phone }));
  } catch { /* stockage indisponible */ }
}

export function takeCardPrefill(): Record<string, string> | null {
  try {
    const raw = localStorage.getItem("agl_card_prefill");
    if (!raw) return null;
    localStorage.removeItem("agl_card_prefill");
    const p = JSON.parse(raw);
    if (!p || typeof p !== "object") return null;
    return p;
  } catch {
    return null;
  }
}
