"use client";
import { useEffect, useRef, useState } from "react";
import type { Session, LiveConnectConfig, LiveServerMessage } from "@google/genai";
import { parseToolAction, publishAction } from "./actions";

export type LivePhase="idle"|"connecting"|"listening"|"thinking"|"speaking";
interface LiveOptions { getContext:()=>unknown; lang:string; video?:()=>HTMLVideoElement|null; onUser?:(text:string)=>void; onReply?:(text:string,done:boolean)=>void; onActivity?:()=>void; }
export function useGeminiLive(opts:LiveOptions){
  const [phase,setPhase]=useState<LivePhase>("idle");const [error,setError]=useState("");const [model,setModel]=useState("");const [level,setLevel]=useState(0);
  const options=useRef(opts);useEffect(()=>{options.current=opts;});
  const session=useRef<Session|null>(null);const input=useRef<AudioContext|null>(null);const output=useRef<AudioContext|null>(null);const mic=useRef<MediaStream|null>(null);const worklet=useRef<AudioWorkletNode|null>(null);const timers=useRef<ReturnType<typeof setInterval>[]>([]);const sources=useRef(new Set<AudioBufferSourceNode>());const nextTime=useRef(0);const reply=useRef("");const user=useRef("");const alive=useRef(false);const generation=useRef(0);
  const stopAudio=()=>{for(const s of sources.current)try{s.stop();}catch{}sources.current.clear();nextTime.current=0;};
  function stop(){alive.current=false;generation.current++;session.current?.close();session.current=null;timers.current.forEach(clearInterval);timers.current=[];worklet.current?.disconnect();worklet.current=null;mic.current?.getTracks().forEach(t=>t.stop());mic.current=null;input.current?.close().catch(()=>{});input.current=null;stopAudio();output.current?.close().catch(()=>{});output.current=null;setPhase("idle");setLevel(0);}
  function interrupt(){stopAudio();if(session.current)setPhase("listening");}
  function receive(m:LiveServerMessage){
    if(!alive.current)return;const c=m.serverContent;
    if(c?.interrupted){stopAudio();reply.current="";setPhase("listening");}
    if(c?.inputTranscription?.text){if(user.current==="")reply.current="";user.current+=c.inputTranscription.text;options.current.onUser?.(user.current);options.current.onActivity?.();setPhase("thinking");}
    if(c?.outputTranscription?.text){reply.current+=c.outputTranscription.text;options.current.onReply?.(reply.current,false);}
    for(const p of c?.modelTurn?.parts??[]){if(p.inlineData?.data&&p.inlineData.mimeType?.startsWith("audio/pcm")){const ac=output.current;if(!ac)continue;const bytes=Uint8Array.from(atob(p.inlineData.data),ch=>ch.charCodeAt(0));const pcm=new DataView(bytes.buffer);const buffer=ac.createBuffer(1,Math.floor(bytes.length/2),24000);const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=pcm.getInt16(i*2,true)/32768;const source=ac.createBufferSource();source.buffer=buffer;source.connect(ac.destination);const start=Math.max(ac.currentTime+.02,nextTime.current);source.start(start);nextTime.current=start+buffer.duration;sources.current.add(source);source.onended=()=>{sources.current.delete(source);if(sources.current.size===0&&alive.current)setPhase("listening");};setPhase("speaking");}}
    if(c?.turnComplete){options.current.onReply?.(reply.current,true);user.current="";reply.current="";if(sources.current.size===0)setPhase("listening");}
    if(m.toolCall?.functionCalls){const responses=m.toolCall.functionCalls.map(call=>{const action=parseToolAction(call.name,call.args);if(action)publishAction(action);return {id:call.id,name:call.name,response:{ok:!!action}};});session.current?.sendToolResponse({functionResponses:responses});}
    if(m.goAway){setError("La session arrive à son terme. Relancez la conversation.");stop();}
  }
  async function start(){
    stop();setError("");setPhase("connecting");alive.current=true;const attempt=generation.current;
    try {
      // Request permissions and resume audio on the user's gesture, before network waits.
      input.current=new AudioContext();output.current=new AudioContext({sampleRate:24000});await Promise.all([input.current.resume(),output.current.resume()]);if(!alive.current||generation.current!==attempt)return false;
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});if(!alive.current||generation.current!==attempt){stream.getTracks().forEach(t=>t.stop());return false;}mic.current=stream;
      const r=await fetch("/api/live/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang:options.current.lang,context:options.current.getContext()})});const j=await r.json();if(!alive.current||generation.current!==attempt)return false;if(!r.ok)throw new Error(j.message??"Live indisponible");
      const {GoogleGenAI}=await import("@google/genai");if(!alive.current||generation.current!==attempt)return false;const ai=new GoogleGenAI({apiKey:j.token,httpOptions:{apiVersion:"v1alpha"}});
      const connected=await ai.live.connect({model:j.model,config:j.config as LiveConnectConfig,callbacks:{onmessage:m=>{if(generation.current===attempt)receive(m);},onerror:()=>{if(alive.current&&generation.current===attempt){setError("La connexion Live a été interrompue. Réessayez ou utilisez le texte.");stop();}},onclose:()=>{if(alive.current&&generation.current===attempt){setError("Conversation terminée. Vous pouvez la relancer.");stop();}}}});
      if(!alive.current||generation.current!==attempt){connected.close();return false;}session.current=connected;
      setModel(j.model);const ac=input.current!;await ac.audioWorklet.addModule("/audio/pcm-worklet.js");if(!alive.current||generation.current!==attempt)return false;const node=new AudioWorkletNode(ac,"agl-pcm-input");worklet.current=node;
      node.port.onmessage=(e:MessageEvent<ArrayBuffer>)=>{if(!session.current||!alive.current)return;const bytes=new Uint8Array(e.data);let binary="";let power=0;const pcm=new Int16Array(e.data);for(const v of pcm)power+=v*v;setLevel(Math.min(1,Math.sqrt(power/pcm.length)/10000));for(const b of bytes)binary+=String.fromCharCode(b);session.current.sendRealtimeInput({audio:{data:btoa(binary),mimeType:"audio/pcm;rate=16000"}});};
      const source=ac.createMediaStreamSource(stream);source.connect(node);const mute=ac.createGain();mute.gain.value=0;node.connect(mute);mute.connect(ac.destination);
      timers.current.push(setInterval(()=>{const v=options.current.video?.();if(v&&v.readyState>=2&&session.current){const cv=document.createElement("canvas");cv.width=640;cv.height=Math.round(640*v.videoHeight/v.videoWidth);cv.getContext("2d")?.drawImage(v,0,0,cv.width,cv.height);session.current.sendRealtimeInput({video:{data:cv.toDataURL("image/jpeg",.65).split(",")[1],mimeType:"image/jpeg"}});}},1200));
      let context=JSON.stringify(options.current.getContext()).replace(/"timestamp":"[^"]*",?/g,"");timers.current.push(setInterval(()=>{if(!session.current)return;const next=JSON.stringify(options.current.getContext()).replace(/"timestamp":"[^"]*",?/g,"");if(next!==context){context=next;session.current.sendClientContent({turns:[{role:"user",parts:[{text:`Mise à jour silencieuse du contexte écran : ${next}. Attends la demande orale.`}]}],turnComplete:false});}},2500));
      setPhase("listening");session.current.sendClientContent({turns:[{role:"user",parts:[{text:"Salue brièvement le visiteur et indique que tu es à son écoute. La caméra n’est visible que si des images arrivent."}]}],turnComplete:true});return true;
    }catch(e){if(generation.current===attempt){setError(e instanceof Error?e.message:"Caméra/micro indisponible");stop();}return false;}
  }
  useEffect(()=>()=>stop(),[]);
  return {phase,error,model,level,start,stop,interrupt,active:phase!=="idle"};
}
