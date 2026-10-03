// ElevenLabs côté serveur : voix premium de Lara, voix off, effets sonores et musique.
const API = "https://api.elevenlabs.io/v1";
const VOICE = process.env.ELEVENLABS_VOICE_ID || "WeAAwKYcS06VmXw086yZ"; // voix féminine parisienne, chaleureuse et calme
const MODEL = process.env.ELEVENLABS_TTS_MODEL || "eleven_multilingual_v2";
const key = () => (process.env.ELEVENLABS_API_KEY || "").trim();
export const elevenAvailable = () => !!key();

async function audio(path: string, body: object, timeout: number): Promise<string | null> {
  const k = key(); if (!k) return null;
  try {
    const r = await fetch(`${API}${path}`, { method: "POST", headers: { "xi-api-key": k, "Content-Type": "application/json", Accept: "audio/mpeg" }, body: JSON.stringify(body), signal: AbortSignal.timeout(timeout) });
    if (!r.ok) { console.warn("Lara audio unavailable", path, r.status, (await r.text()).slice(0, 160)); return null; }
    return `data:audio/mpeg;base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch (e) { console.warn("Lara audio unavailable", path, e instanceof Error ? e.message : "unknown"); return null; }
}
export function elevenSpeech(text: string, lang = "fr") {
  return audio(`/text-to-speech/${VOICE}?output_format=mp3_44100_128`, { text: text.slice(0, 2500), model_id: MODEL, language_code: lang === "en" ? "en" : "fr", voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2 } }, 25000);
}
export function elevenSound(prompt: string, seconds = 8) {
  return audio("/sound-generation", { text: prompt.slice(0, 450), duration_seconds: Math.min(22, Math.max(1, seconds)) }, 30000);
}
export function elevenMusic(prompt: string, seconds = 20) {
  return audio("/music", { prompt: `${prompt.slice(0, 600)}. Instrumental, no vocals.`, music_length_ms: Math.round(Math.min(60, Math.max(10, seconds)) * 1000) }, 55000);
}
