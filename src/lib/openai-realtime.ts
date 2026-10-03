"use client";
// Session temps réel OpenAI en WebRTC (secours de la voix Live) : audio natif dans les deux sens,
// événements (transcriptions, appels d’outils) sur le canal de données.
export interface RealtimeHandlers {
  onUserDelta: (text: string) => void;
  onReplyDelta: (text: string) => void;
  onTurnDone: () => void;
  onSpeaking: (speaking: boolean) => void;
  onUserSpeech: () => void;
  onToolCall: (name: string, args: Record<string, unknown>) => unknown | Promise<unknown>;
  onClose: () => void;
}
export interface RealtimeSession { send: (event: object) => void; interrupt: () => void; close: () => void }

export async function connectOpenAIRealtime(token: string, stream: MediaStream, greeting: string, h: RealtimeHandlers): Promise<RealtimeSession> {
  const pc = new RTCPeerConnection();
  const audio = new Audio(); audio.autoplay = true;
  pc.ontrack = e => { audio.srcObject = e.streams[0]; };
  for (const track of stream.getAudioTracks()) pc.addTrack(track, stream);
  const dc = pc.createDataChannel("oai-events");
  let closed = false; let pendingTools = 0; let responseDone = true;
  const send = (event: object) => { if (dc.readyState === "open") dc.send(JSON.stringify(event)); };
  const close = () => { if (closed) return; closed = true; try { dc.close(); } catch { /* déjà fermé */ } try { pc.close(); } catch { /* déjà fermé */ } audio.srcObject = null; };
  dc.onopen = () => { send({ type: "conversation.item.create", item: { type: "message", role: "user", content: [{ type: "input_text", text: greeting }] } }); send({ type: "response.create" }); };
  dc.onclose = () => { if (!closed) { close(); h.onClose(); } };
  dc.onmessage = e => {
    let ev: Record<string, unknown> & { type?: string };
    try { ev = JSON.parse(e.data); } catch { return; }
    switch (ev.type) {
      case "input_audio_buffer.speech_started": h.onUserSpeech(); break;
      case "conversation.item.input_audio_transcription.delta": if (typeof ev.delta === "string") h.onUserDelta(ev.delta); break;
      case "response.output_audio_transcript.delta": if (typeof ev.delta === "string") h.onReplyDelta(ev.delta); break;
      case "output_audio_buffer.started": h.onSpeaking(true); break;
      case "output_audio_buffer.stopped": h.onSpeaking(false); break;
      case "response.function_call_arguments.done": {
        let args: Record<string, unknown> = {};
        try { args = JSON.parse(String(ev.arguments ?? "{}")); } catch { /* arguments invalides */ }
        pendingTools++;
        // Les outils asynchrones (recherche en ligne) relancent la réponse une fois leur résultat envoyé.
        void Promise.resolve(h.onToolCall(String(ev.name ?? ""), args)).then(output => {
          send({ type: "conversation.item.create", item: { type: "function_call_output", call_id: ev.call_id, output: JSON.stringify(output) } });
          if (--pendingTools === 0 && responseDone) send({ type: "response.create" });
        });
        break;
      }
      case "response.created": responseDone = false; break;
      case "response.done": {
        // Après un appel d’outil, Lara commente ce qui vient de s’afficher (dès que tous les résultats sont prêts).
        const r = ev.response as { output?: { type?: string }[] } | undefined;
        const usedTools = (r?.output ?? []).some(o => o.type === "function_call");
        responseDone = true;
        if (usedTools) { if (pendingTools === 0) send({ type: "response.create" }); } else h.onTurnDone();
        break;
      }
    }
  };
  pc.onconnectionstatechange = () => { if (["failed", "closed"].includes(pc.connectionState) && !closed) { close(); h.onClose(); } };
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);
  const r = await fetch("https://api.openai.com/v1/realtime/calls", { method: "POST", body: offer.sdp, headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/sdp" } });
  if (!r.ok) { close(); throw new Error("realtime unavailable"); }
  await pc.setRemoteDescription({ type: "answer", sdp: await r.text() });
  return { send, close, interrupt: () => { send({ type: "response.cancel" }); send({ type: "output_audio_buffer.clear" }); } };
}
