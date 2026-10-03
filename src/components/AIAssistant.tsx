"use client";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, X, Send, Eye, Camera, VolumeX, Brain, History } from "lucide-react";
import { useKiosk, logEvent } from "@/lib/store";
import { useLiveVoice, LIVE_PHASE_LABEL } from "@/lib/use-gemini-live";
import { askStream, playServerVoice, stopServerVoice, preferredModel, speakLocal } from "@/lib/live";
import { Orb } from "./Orb";
import { sfx } from "@/lib/sound";

interface Msg { role:"user"|"ai"; text:string }
export function AIAssistant(){
  const k=useKiosk();const en=k.lang==="en";const [messages,setMessages]=useState<Msg[]>([]);const [input,setInput]=useState("");const [busy,setBusy]=useState(false);const [deep,setDeep]=useState(false);const [status,setStatus]=useState("");const bottom=useRef<HTMLDivElement>(null);const controller=useRef<AbortController|null>(null);const busyRef=useRef(false);const msgs=useRef(messages);msgs.current=messages;const current=useRef(k);current.current=k;const pending=useRef("");const liveUser=useRef(-1);const liveReply=useRef(-1);const [writing,setWriting]=useState(-1);const [history,setHistory]=useState(false);
  const live=useLiveVoice({lang:k.lang,getContext:()=>current.current.getExperienceContext(),onActivity:()=>current.current.touch(),onUser:(text)=>{if(liveUser.current<0){liveUser.current=msgs.current.length;setMessages(m=>[...m,{role:"user",text}]);}else setMessages(m=>m.map((v,i)=>i===liveUser.current?{role:"user",text}:v));},onReply:(text,done)=>{setWriting(done||!text?-1:liveReply.current<0?msgs.current.length:liveReply.current);if(text){if(liveReply.current<0){liveReply.current=msgs.current.length;setMessages(m=>[...m,{role:"ai",text}]);}else setMessages(m=>m.map((v,i)=>i===liveReply.current?{role:"ai",text}:v));}if(done){liveReply.current=-1;liveUser.current=-1;}}});
  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth"});},[messages]);
  useEffect(()=>{const state=live.phase==="connecting"?"thinking":live.phase;k.setAiState(state);},[live.phase,k.setAiState]);
  const prevPhase=useRef(live.phase);useEffect(()=>{if(prevPhase.current==="connecting"&&live.phase==="listening")sfx("live");prevPhase.current=live.phase;},[live.phase]);
  useEffect(()=>{if(k.aiOpen)sfx("open");},[k.aiOpen]);
  useEffect(()=>{if(k.pendingQuestion&&pending.current!==k.pendingQuestion){pending.current=k.pendingQuestion;void ask(k.pendingQuestion.replace(/^\d+::/,""));}},[k.pendingQuestion]);
  useEffect(()=>()=>{controller.current?.abort();stopServerVoice();},[]);
  useEffect(()=>{if(!k.aiOpen){live.stop();controller.current?.abort();stopServerVoice();}},[k.aiOpen]);
  const greetings=en?"Hi, I’m Lara. Ask me about Mining, see a corridor come alive or prepare your next step with Africa Global Logistics.":"Bonjour, je suis Lara. Parlons Mining, donnons vie à un corridor ou préparons votre prochaine étape avec Africa Global Logistics.";
  async function ask(text:string){
    if(!text.trim()||busyRef.current)return;live.stop();stopServerVoice();k.touch();busyRef.current=true;setBusy(true);setInput("");setStatus(en?"Connecting to Lara…":"Connexion à Lara…");k.setAiState("thinking");logEvent("ai_question",{screen:k.screen,deep});
    const history=msgs.current.slice(-12);const index=history.length;setMessages([...history,{role:"user",text},{role:"ai",text:""}]);const abort=new AbortController();controller.current=abort;setWriting(index+1);
    try{const meta=await askStream({message:text,context:k.getExperienceContext(),history,lang:k.lang,model:preferredModel(),deepThink:deep},full=>{setStatus(en?"Lara is answering":"Lara répond");setMessages(m=>m.map((v,i)=>i===index+1?{role:"ai",text:full}:v));},abort.signal);if(abort.signal.aborted)return;setMessages(m=>m.map((v,i)=>i===index+1?{role:"ai",text:meta.reply}:v));k.setLastAiReply(meta.reply);setStatus(meta.degraded?(en?"AI unavailable — experiences remain accessible":"IA indisponible — les expériences restent accessibles"):(en?"Ready":"Prêt"));if(k.soundOn&&!meta.degraded){k.setAiState("speaking");const ok=await playServerVoice(meta.reply,k.lang);if(!ok&&!abort.signal.aborted)speakLocal(meta.reply,k.lang);}}
    catch{if(!abort.signal.aborted){setStatus(en?"Connection unavailable. Please try again.":"Connexion indisponible. Réessayez dans un instant.");setMessages(m=>m.filter((v,i)=>i!==index+1||v.text));}}
    finally{busyRef.current=false;setBusy(false);setWriting(-1);k.setAiState("idle");}
  }
  const suggestions=k.screen==="mining"?(en?["Explain this mining stage","Show the construction stage","Open the Tokadeh case"]:["Explique cette étape minière","Affiche l’étape construction","Explique le cas Tokadeh"]):(en?["Plan 80 t of mining equipment to Korhogo","Show the multimodal corridor","What can Africa Global Logistics do for my mine?"]:["Organise 80 t d’équipement minier vers Korhogo","Affiche le corridor multimodal","Que peut faire Africa Global Logistics pour ma mine ?"]);
  const orbState=live.active?(live.phase==="connecting"?"thinking":live.phase):k.aiState;
  const statusLine=live.active?LIVE_PHASE_LABEL[live.phase][en?"en":"fr"]:(status||(en?"Your logistics guide":"Votre guide logistique"));
  const lastAi=(()=>{for(let i=messages.length-1;i>=0;i--)if(messages[i].role==="ai")return i;return -1;})();
  const lastUser=(()=>{for(let i=messages.length-1;i>=0;i--)if(messages[i].role==="user")return i;return -1;})();
  return <><button className="ai-launcher" onClick={()=>{k.setAiOpen(true);k.touch();logEvent("voice_used",{mode:"launcher"});void live.start();}} aria-label="Ouvrir Lara"><Orb size={36} state={orbState}/><span>Lara · {en?"Let’s talk":"Parlons ensemble"}</span></button>
  <AnimatePresence>{k.aiOpen&&<motion.div key="hud" className={`lara-hud ${live.active?"live":""}`} initial={{opacity:0,y:30}} animate={{opacity:1,y:0}} exit={{opacity:0,y:30}} transition={{duration:.4,ease:[0.22,1,0.36,1]}} role="region" aria-label="Assistante Lara">
    {/* Repères HUD aux coins de l’écran pendant la conversation vocale */}
    {live.active&&<div className="hud-frame" aria-hidden="true"><i/><i/><i/><i/><div className="hud-live"><b/>{en?"LARA · LIVE":"LARA · EN DIRECT"}<span className="hud-meter">{[0,1,2,3,4].map(n=><em key={n} style={{transform:`scaleY(${Math.max(.15,Math.min(1,live.level*3-n*.12))})`}}/>)}</span></div></div>}
    <Captions key={lastAi} userIndex={lastUser} userText={lastUser>lastAi||writing===lastAi?messages[lastUser]?.text??"":""} aiText={lastAi>=0?messages[lastAi].text:""} streaming={writing>=0&&writing===lastAi} thinking={busy&&lastAi>=0&&!messages[lastAi].text} greeting={messages.length?"":greetings} en={en}/>
    {live.error&&<p className="hud-error" role="status">{live.error}</p>}
    {!messages.length&&!busy&&<div className="hud-suggestions">{suggestions.map(s=><button key={s} onClick={()=>ask(s)}>{s}</button>)}</div>}
    <div className={`hud-dock ${writing>=0||orbState==="speaking"?"is-writing":""}`}>
      <button className={`hud-mic ${live.active?"on":""}`} disabled={busy} aria-label={en?"Voice conversation":"Conversation vocale"} title={en?"Voice conversation":"Conversation vocale"} onClick={()=>{k.touch();live.active?live.stop():live.start();logEvent("voice_used",{mode:"native-live"});}}>{live.active?<MicOff size={20}/>:<Mic size={20}/>}</button>
      <div className="hud-id"><Orb size={18} state={orbState}/><div><strong>LARA</strong><span className="ai-live-status"><i className={`ai-pulse ${orbState}`}/>{statusLine}</span></div></div>
      <div className="hud-input"><input aria-label="Question à Lara" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")ask(input);}} placeholder={en?"Type to Lara…":"Écrire à Lara…"}/><button className="hud-send" disabled={busy||!input.trim()} aria-label="Envoyer la question" onClick={()=>ask(input)}><Send size={17}/></button></div>
      <div className="hud-tools">
        <button className="ai-ghost" aria-pressed={deep} disabled={busy} aria-label={en?"Deep thinking":"Réflexion approfondie"} title={en?"Deep thinking":"Réflexion approfondie"} onClick={()=>setDeep(!deep)}><Brain size={18}/></button>
        <button className="ai-ghost" disabled={busy} aria-label={en?"This screen":"Cet écran"} title={en?"This screen":"Cet écran"} onClick={()=>ask(en?"Explain what is on my screen.":"Explique ce que je vois à l’écran.")}><Eye size={18}/></button>
        <button className="ai-ghost" aria-label={en?"Camera & voice":"Caméra & voix"} title={en?"Camera & voice":"Caméra & voix"} onClick={()=>{live.stop();k.setAiOpen(false);k.go("vision");}}><Camera size={18}/></button>
        <button className="ai-ghost" aria-pressed={history} aria-label={en?"Conversation history":"Historique de la conversation"} title={en?"History":"Historique"} onClick={()=>setHistory(v=>!v)}><History size={18}/></button>
        <button className="ai-ghost" aria-label="Interrompre la réponse" title={en?"Stop":"Interrompre"} onClick={()=>{live.interrupt();stopServerVoice();controller.current?.abort();}}><VolumeX size={18}/></button>
        <button className="ai-ghost" aria-label="Fermer Lara" title={en?"Close":"Fermer"} onClick={()=>{live.stop();setHistory(false);k.setAiOpen(false);}}><X size={18}/></button>
      </div>
    </div>
    {/* Historique complet, à la demande */}
    <AnimatePresence>{history&&<motion.aside className="hud-history" initial={{opacity:0,x:30}} animate={{opacity:1,x:0}} exit={{opacity:0,x:30}} transition={{duration:.3}} aria-label={en?"Conversation history":"Historique de la conversation"}>
      <header><span className="eyebrow">{en?"CONVERSATION":"CONVERSATION"}</span><button className="ai-ghost" aria-label={en?"Close history":"Fermer l’historique"} onClick={()=>setHistory(false)}><X size={18}/></button></header>
      <div className="ai-messages"><div className="ai-message lead"><span className="ai-sign">Lara</span>{greetings}</div>{messages.map((m,i)=>{const prev=i===0?"ai":messages[i-1].role;const lead=prev!==m.role;return <div key={i} className={`ai-message ${m.role==="user"?"user":""} ${lead?"lead":"follow"}`}>{lead&&m.role==="ai"&&<span className="ai-sign">Lara</span>}{m.text}</div>;})}<div ref={bottom}/></div>
      <p className="ai-note">{en?"No conversation is saved":"Aucune conversation enregistrée"}</p>
    </motion.aside>}</AnimatePresence>
  </motion.div>}</AnimatePresence></>;
}


// ——— Sous-titres ———
// Répliques de 2 lignes (≈ 84 caractères), coupées aux fins de phrase ou aux virgules, affichées
// le temps de lecture (≈ 17 caractères/s, entre 1,6 et 7 s) puis effacées en fondu.
function toCues(text:string){
  const words=text.replace(/\s+/g," ").trim().split(" ").filter(Boolean);const cues:string[]=[];let cur="";
  for(const w of words){const next=cur?`${cur} ${w}`:w;if(next.length>84&&cur){cues.push(cur);cur=w;}else{cur=next;if(/[.!?…]$/.test(w)&&cur.length>40){cues.push(cur);cur="";}}}
  if(cur)cues.push(cur);return cues;
}
const readTime=(cue:string)=>Math.min(7000,Math.max(1600,cue.length/17*1000));
// Ce que dit le visiteur : petite ligne au-dessus, effacée quelques secondes après.
function UserCaption({text,en}:{text:string;en:boolean}){
  const [visible,setVisible]=useState(true);
  useEffect(()=>{const id=setTimeout(()=>setVisible(false),3500+text.length*40);return()=>clearTimeout(id);},[text]);
  return <AnimatePresence>{text&&visible&&<motion.p className="cap-user" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} transition={{duration:.3}}><span>{en?"You":"Vous"}</span>{text.length>110?`…${text.slice(-110)}`:text}</motion.p>}</AnimatePresence>;
}
function Captions({userIndex,userText,aiText,streaming,thinking,greeting,en}:{userIndex:number;userText:string;aiText:string;streaming:boolean;thinking:boolean;greeting:string;en:boolean}){
  const text=aiText||greeting;
  const cues=toCues(text);
  const [index,setIndex]=useState(0);const [hidden,setHidden]=useState(false);
  const shown=Math.min(index,Math.max(0,cues.length-1));const cue=cues[shown]??"";
  const isLast=shown>=cues.length-1;
  useEffect(()=>{
    if(!cue)return;
    // Réplique suivante après son temps de lecture ; la dernière s’efface une fois la réponse terminée.
    if(!isLast){const id=setTimeout(()=>setIndex(shown+1),readTime(cue));return()=>clearTimeout(id);}
    if(!streaming){const id=setTimeout(()=>setHidden(true),readTime(cue)+800);return()=>clearTimeout(id);}
  },[cue,isLast,shown,streaming]);
  const words=cue.split(" ");const tail=streaming&&isLast?Math.min(4,words.length):0;
  return <div className="hud-captions" aria-live="polite">
    <UserCaption key={userIndex} text={userText} en={en}/>
    <AnimatePresence mode="wait">{thinking?<motion.p key="dots" className="cap-lara" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}><span className="ai-dots" aria-label={en?"Thinking":"Je réfléchis"}><i/><i/><i/></span></motion.p>
      :cue&&!hidden&&<motion.p key={`${shown}`} className="cap-lara" initial={{opacity:0,y:14,filter:"blur(6px)"}} animate={{opacity:1,y:0,filter:"blur(0px)"}} exit={{opacity:0,y:-10,filter:"blur(4px)"}} transition={{duration:.45,ease:[0.22,1,0.36,1]}}>
        {words.map((w,i)=><span key={i} className={i>=words.length-tail?"fresh":undefined}>{w}{i<words.length-1?" ":""}</span>)}
      </motion.p>}</AnimatePresence>
  </div>;
}
