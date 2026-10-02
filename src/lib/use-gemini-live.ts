"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Session, LiveConnectConfig, LiveServerMessage } from "@google/genai";
import { describeAction, parseToolAction, publishAction } from "./actions";

export type LivePhase="idle"|"connecting"|"listening"|"thinking"|"speaking";
export const LIVE_PHASE_LABEL:Record<LivePhase,{fr:string;en:string}>={
  idle:{fr:"En pause",en:"Paused"},
  connecting:{fr:"Connexion…",en:"Connecting…"},
  listening:{fr:"À l’écoute",en:"Listening"},
  thinking:{fr:"Réflexion",en:"Thinking"},
  speaking:{fr:"Réponse",en:"Speaking"},
};
const FALLBACK_ERROR={fr:"Conversation vocale momentanément indisponible. Le mode texte reste disponible.",en:"Voice conversation temporarily unavailable. Text mode remains available."};
const MAX_RECONNECTS=3;
interface LiveOptions { getContext:()=>unknown; lang:string; video?:()=>HTMLVideoElement|null; onUser?:(text:string)=>void; onReply?:(text:string,done:boolean)=>void; onActivity?:()=>void; }

function toBase64(buffer:ArrayBuffer){
  const bytes=new Uint8Array(buffer);let binary="";
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
  return btoa(binary);
}

export function useLiveVoice(opts:LiveOptions){
  const [phase,setPhase]=useState<LivePhase>("idle");const [error,setError]=useState("");const [model,setModel]=useState("");const [level,setLevel]=useState(0);
  const options=useRef(opts);useEffect(()=>{options.current=opts;});
  const session=useRef<Session|null>(null);const input=useRef<AudioContext|null>(null);const output=useRef<AudioContext|null>(null);const mic=useRef<MediaStream|null>(null);const worklet=useRef<AudioWorkletNode|null>(null);const timers=useRef<ReturnType<typeof setInterval>[]>([]);const sources=useRef(new Set<AudioBufferSourceNode>());const nextTime=useRef(0);const reply=useRef("");const user=useRef("");const alive=useRef(false);const generation=useRef(0);const levelRef=useRef(0);
  // Une connexion = un identifiant : les rappels d’une session remplacée sont ignorés.
  const connection=useRef(0);const resumeHandle=useRef<string|undefined>(undefined);const reconnects=useRef(0);const reconnectRef=useRef<()=>void>(()=>{});
  const lang=()=>options.current.lang==="en"?"en":"fr";
  const stopAudio=useCallback(()=>{for(const s of sources.current)try{s.stop();}catch{}sources.current.clear();nextTime.current=0;},[]);
  const stop=useCallback(()=>{alive.current=false;generation.current++;connection.current++;resumeHandle.current=undefined;reconnects.current=0;try{session.current?.sendRealtimeInput({audioStreamEnd:true});}catch{}session.current?.close();session.current=null;timers.current.forEach(clearInterval);timers.current=[];worklet.current?.disconnect();worklet.current=null;mic.current?.getTracks().forEach(t=>t.stop());mic.current=null;if(input.current){input.current.close().catch(()=>{});input.current=null;}stopAudio();if(output.current){output.current.close().catch(()=>{});output.current=null;}levelRef.current=0;setPhase("idle");setLevel(0);},[stopAudio]);
  const interrupt=useCallback(()=>{stopAudio();if(session.current)setPhase("listening");},[stopAudio]);

  const handleToolCall=useCallback((m:LiveServerMessage)=>{
    const responses=(m.toolCall?.functionCalls??[]).map(call=>{
      if(call.name==="get_screen_context")return {id:call.id,name:call.name,response:{context:options.current.getContext()}};
      const action=parseToolAction(call.name,call.args);
      if(!action)return {id:call.id,name:call.name,response:{ok:false,error:"Arguments invalides : rien n’a été affiché."}};
      publishAction(action);options.current.onActivity?.();
      return {id:call.id,name:call.name,response:{ok:true,displayed:describeAction(action)}};
    });
    if(responses.length)try{session.current?.sendToolResponse({functionResponses:responses});}catch{}
  },[]);

  const receive=useCallback((m:LiveServerMessage)=>{
    if(!alive.current)return;const c=m.serverContent;
    if(m.sessionResumptionUpdate?.resumable&&m.sessionResumptionUpdate.newHandle)resumeHandle.current=m.sessionResumptionUpdate.newHandle;
    if(c?.interrupted){stopAudio();reply.current="";setPhase("listening");}
    if(c?.inputTranscription?.text){if(user.current==="")reply.current="";user.current+=c.inputTranscription.text;options.current.onUser?.(user.current);options.current.onActivity?.();setPhase("thinking");}
    if(c?.outputTranscription?.text){reply.current+=c.outputTranscription.text;options.current.onReply?.(reply.current,false);}
    for(const p of c?.modelTurn?.parts??[]){if(p.inlineData?.data&&p.inlineData.mimeType?.startsWith("audio/pcm")){const ac=output.current;if(!ac)continue;const bytes=Uint8Array.from(atob(p.inlineData.data),ch=>ch.charCodeAt(0));const pcm=new DataView(bytes.buffer);const buffer=ac.createBuffer(1,Math.floor(bytes.length/2),24000);const samples=buffer.getChannelData(0);for(let i=0;i<samples.length;i++)samples[i]=pcm.getInt16(i*2,true)/32768;const source=ac.createBufferSource();source.buffer=buffer;source.connect(ac.destination);const start=Math.max(ac.currentTime+.02,nextTime.current);source.start(start);nextTime.current=start+buffer.duration;sources.current.add(source);source.onended=()=>{sources.current.delete(source);if(sources.current.size===0&&alive.current)setPhase("listening");};setPhase("speaking");}}
    if(c?.turnComplete){options.current.onReply?.(reply.current,true);user.current="";reply.current="";reconnects.current=0;if(sources.current.size===0)setPhase("listening");}
    if(m.toolCall?.functionCalls)handleToolCall(m);
    // Fin de session annoncée : on enchaîne sur une nouvelle connexion avec la poignée de reprise.
    if(m.goAway)reconnectRef.current();
  },[stopAudio,handleToolCall]);

  const fail=useCallback((attempt:number,message:string)=>{if(generation.current!==attempt)return false;setError(message);stop();return false;},[stop]);

  // Ouvre une session Live (jeton éphémère à usage unique) ; resume = reprise après coupure.
  const connect=useCallback(async(attempt:number,resume?:string)=>{
    const r=await fetch("/api/live/token",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lang:options.current.lang,context:options.current.getContext(),resume})});
    let j:{token?:string;model?:string;config?:LiveConnectConfig;message?:string}={};try{j=await r.json();}catch{}
    if(!alive.current||generation.current!==attempt)return null;
    if(!r.ok)throw new Error(j.message||FALLBACK_ERROR[lang()]);if(!j.token||!j.model)throw new Error(FALLBACK_ERROR[lang()]);
    const {GoogleGenAI}=await import("@google/genai");if(!alive.current||generation.current!==attempt)return null;
    const ai=new GoogleGenAI({apiKey:j.token,httpOptions:{apiVersion:"v1alpha"}});
    const id=++connection.current;
    const connected=await ai.live.connect({model:j.model,config:j.config as LiveConnectConfig,callbacks:{
      onmessage:m=>{if(connection.current===id)receive(m);},
      onerror:()=>{if(alive.current&&connection.current===id)reconnectRef.current();},
      onclose:()=>{if(alive.current&&connection.current===id)reconnectRef.current();},
    }});
    if(!alive.current||generation.current!==attempt||connection.current!==id){connected.close();return null;}
    setModel(j.model);return connected;
  },[receive]);

  const reconnect=useCallback(async()=>{
    const attempt=generation.current;const handle=resumeHandle.current;
    if(!alive.current)return;
    if(!handle||reconnects.current>=MAX_RECONNECTS){fail(attempt,lang()==="en"?"Voice connection interrupted. Try again or use text.":"La connexion vocale a été interrompue. Réessayez ou utilisez le texte.");return;}
    reconnects.current++;connection.current++;const old=session.current;session.current=null;try{old?.close();}catch{}
    stopAudio();setPhase("connecting");
    try{const next=await connect(attempt,handle);if(!next)return;session.current=next;setPhase("listening");}
    catch(e){fail(attempt,e instanceof Error&&e.message?e.message:FALLBACK_ERROR[lang()]);}
  },[connect,fail,stopAudio]);
  useEffect(()=>{reconnectRef.current=()=>{void reconnect();};},[reconnect]);

  const start=useCallback(async ()=>{
    stop();setError("");setPhase("connecting");alive.current=true;const attempt=generation.current;
    if(typeof AudioContext==="undefined"||!navigator.mediaDevices?.getUserMedia)return fail(attempt,FALLBACK_ERROR[lang()]);
    try {
      input.current=new AudioContext();output.current=new AudioContext({sampleRate:24000});await Promise.all([input.current.resume(),output.current.resume()]);if(!alive.current||generation.current!==attempt)return false;
      // Micro et jeton en parallèle : la connexion démarre plus vite.
      const [stream,connected]=await Promise.all([navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false}),connect(attempt)]);
      if(!alive.current||generation.current!==attempt||!connected){stream.getTracks().forEach(t=>t.stop());connected?.close();return false;}
      mic.current=stream;session.current=connected;
      const ac=input.current;if(!ac)return fail(attempt,FALLBACK_ERROR[lang()]);await ac.audioWorklet.addModule("/audio/pcm-worklet.js");if(!alive.current||generation.current!==attempt)return false;const node=new AudioWorkletNode(ac,"agl-pcm-input");worklet.current=node;
      node.port.onmessage=(e:MessageEvent<ArrayBuffer>)=>{if(!session.current||!alive.current)return;let power=0;const pcm=new Int16Array(e.data);for(const v of pcm)power+=v*v;levelRef.current=Math.min(1,Math.sqrt(power/pcm.length)/10000);try{session.current.sendRealtimeInput({audio:{data:toBase64(e.data),mimeType:"audio/pcm;rate=16000"}});}catch{}};
      const source=ac.createMediaStreamSource(stream);source.connect(node);const mute=ac.createGain();mute.gain.value=0;node.connect(mute);mute.connect(ac.destination);
      timers.current.push(setInterval(()=>{setLevel(levelRef.current);levelRef.current*=0.5;},200));
      timers.current.push(setInterval(()=>{const v=options.current.video?.();if(v&&v.readyState>=2&&session.current){const cv=document.createElement("canvas");cv.width=640;cv.height=Math.round(640*v.videoHeight/v.videoWidth);cv.getContext("2d")?.drawImage(v,0,0,cv.width,cv.height);try{session.current.sendRealtimeInput({video:{data:cv.toDataURL("image/jpeg",.65).split(",")[1],mimeType:"image/jpeg"}});}catch{}}},1200));
      setPhase("listening");try{session.current.sendClientContent({turns:[{role:"user",parts:[{text:"Salue brièvement le visiteur et indique que tu es à son écoute : chaque instruction s’affichera à l’écran. La caméra n’est visible que si des images arrivent."}]}],turnComplete:true});}catch{}return true;
    }catch(e){
      // Erreurs navigateur (micro refusé, non pris en charge) : message lisible plutôt que le texte technique.
      if(e instanceof DOMException)return fail(attempt,e.name==="NotAllowedError"?(lang()==="en"?"Microphone access was refused. Allow it or use text.":"L’accès au micro a été refusé. Autorisez-le ou utilisez le texte."):FALLBACK_ERROR[lang()]);
      return fail(attempt,e instanceof Error&&e.message?e.message:FALLBACK_ERROR[lang()]);
    }
  },[connect,fail,stop]);
  useEffect(()=>()=>stop(),[stop]);
  return {phase,error,model,level,start,stop,interrupt,active:phase!=="idle"};
}
