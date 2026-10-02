import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TTS_MODEL } from "@/lib/ai-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { text, lang } -> { audio: data:audio/wav;base64 } (voix studio Gemini)
// 503 si indisponible -> le client bascule sur la synthèse locale.
export async function POST(req: NextRequest) {
  try {
    const { text, lang } = await req.json();
    const key = process.env.GEMINI_API_KEY ?? "";
    if (!key || !key.startsWith("AIza")) return NextResponse.json({ ok: false }, { status: 503 });
    const models = [GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts"];
    for (const m of [...new Set(models)]) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Dis avec une voix chaleureuse et professionnelle (${lang === "en" ? "anglais" : "français"}): ${(text as string).slice(0, 500)}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            },
          }),
        });
        if (!r.ok) continue;
        const j = await r.json();
        const data = j.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)?.inlineData?.data;
        if (data) return NextResponse.json({ ok: true, model: m, audio: `data:audio/wav;base64,${data}` });
      } catch { /* try next */ }
    }
    return NextResponse.json({ ok: false }, { status: 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
