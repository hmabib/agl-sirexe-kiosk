import { NextRequest, NextResponse } from "next/server";
import { GEMINI_TTS_MODEL } from "@/lib/ai-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { text, lang } -> { audio: data:audio/wav;base64 } (voix studio Lara)
// 503 si indisponible -> le client bascule sur la synthèse locale.
export async function POST(req: NextRequest) {
  try {
    const { text, lang } = await req.json();
    const { resolveKey } = await import("@/lib/ai-server");
    const { key, provider } = resolveKey();
    if (!key || provider !== "gemini") return NextResponse.json({ ok: false }, { status: 503 });
    const models = [GEMINI_TTS_MODEL, "gemini-2.5-flash-preview-tts"];
    for (const m of [...new Set(models)]) {
      try {
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-goog-api-key": key },
          body: JSON.stringify({
            contents: [{ parts: [{ text: lang === "en" ? `Say in a warm, professional female voice, in English with a light French accent: ${(text as string).slice(0, 500)}` : `Lis avec une voix de femme française, chaleureuse et professionnelle, en français de France, accent standard : ${(text as string).slice(0, 500)}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } } },
            },
          }),
        });
        if (!r.ok) continue;
        const j = await r.json();
        const data = j.candidates?.[0]?.content?.parts?.find((p: {inlineData?:{data?:string}}) => p.inlineData)?.inlineData?.data;
        if (data) {
          const pcm=Buffer.from(data,"base64"); const header=Buffer.alloc(44);
          header.write("RIFF",0);header.writeUInt32LE(pcm.length+36,4);header.write("WAVEfmt ",8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write("data",36);header.writeUInt32LE(pcm.length,40);
          return NextResponse.json({ ok: true, model: m, audio: `data:audio/wav;base64,${Buffer.concat([header,pcm]).toString("base64")}` });
        }
      } catch { /* try next */ }
    }
    return NextResponse.json({ ok: false }, { status: 503 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
