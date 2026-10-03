import type { Screen } from "./store";
export type RouteId = "route-A" | "route-B" | "route-C";
export type MiningStage = "exploration" | "construction" | "production" | "export" | "closure";
export type StepMode = "road" | "rail" | "sea" | "air" | "port" | "warehouse" | "customs" | "heavy_lift" | "mining" | "digital" | "people";
export interface SolutionStep { label: string; detail: string; mode?: StepMode }
export interface SolutionPoint { label: string; text: string }
export type ChartKind = "bar" | "line" | "donut";
export interface Chart { title: string; kind: ChartKind; labels: string[]; values: number[]; unit?: string; source?: string }
export interface WebItem { title: string; url: string; source?: string; date?: string }
export interface WebView { kind: "search" | "news"; query: string; summary?: string; items: WebItem[] }
// Outils de données : exécutés côté serveur, leur résultat revient au modèle avant la réponse.
export const WEB_TOOLS = ["web_search", "get_news", "open_page"];
export interface PageData { url: string; title: string; site: string; description?: string; image?: string; paragraphs: string[]; embeddable: boolean }
export type AudioKind = "voiceover" | "sound" | "music";
export type Model3DKind = "container" | "truck" | "crane" | "ship" | "wagon" | "locomotive" | "locomotive_convoy" | "xmas_tree" | "tank_convoy" | "terminal" | "mri" | "haul_truck" | "custom";
export const MODEL_3D: Model3DKind[] = ["container", "truck", "crane", "ship", "wagon", "locomotive", "locomotive_convoy", "xmas_tree", "tank_convoy", "terminal", "mri", "haul_truck", "custom"];
export type PartShape = "box" | "cylinder" | "sphere" | "cone";
export interface Part3D { name: string; explanation: string; shape?: PartShape; size?: [number, number, number]; position?: [number, number, number]; color?: string }
export type FlowKind = "mine" | "plant" | "truck" | "rail" | "port" | "ship" | "plane" | "warehouse" | "customs" | "hub" | "market";
export interface FlowNode { label: string; kind: FlowKind; detail?: string }
export interface FlowLink { from: number; to: number; mode: StepMode; label?: string }
export interface Flow { title: string; nodes: FlowNode[]; links: FlowLink[]; info: string[] }
export const FLOW_KINDS: FlowKind[] = ["mine", "plant", "truck", "rail", "port", "ship", "plane", "warehouse", "customs", "hub", "market"];
// Mode d’une liaison déduit de ses deux extrémités (rail si l’une est ferroviaire, mer entre port et navire…).
export function inferMode(a: FlowKind, b: FlowKind): StepMode {
  if (a === "rail" || b === "rail") return "rail";
  if (a === "plane" || b === "plane") return "air";
  if ((a === "port" || a === "ship") && (b === "ship" || b === "port" || b === "market")) return "sea";
  if (a === "customs" || b === "customs") return "customs";
  return "road";
}
export interface Solution { title: string; summary: string; steps: SolutionStep[]; considerations: SolutionPoint[]; route?: RouteId; miningStage?: MiningStage; imagePrompt?: string; next: Screen[] }
export type MaterialAction =
  | { type: "show_route"; route: RouteId }
  | { type: "show_mining"; stage: MiningStage }
  | { type: "sheet"; title: string; body: string }
  | { type: "open_studio"; tab: "image" | "schema" | "storyboard" | "doc"; title: string; body: string }
  | { type: "show_image"; title: string; image: string; text: string }
  | { type: "render_image"; title: string; prompt: string }
  | { type: "solution"; solution: Solution }
  | { type: "render_video"; title: string; prompt: string; narration?: string; soundscape?: string }
  | { type: "chart"; chart: Chart }
  | { type: "flow"; flow: Flow }
  | { type: "web"; title: string; web: WebView }
  | { type: "page"; page: PageData }
  | { type: "project"; id: string }
  | { type: "render_audio"; title: string; kind: AudioKind; text: string; seconds?: number }
  | { type: "model3d"; title: string; object: Model3DKind; parts: Part3D[]; intro?: string }
  | { type: "go"; screen: Screen };
export const ALLOWED_SCREENS = ["home", "games", "mission", "explore", "build", "vision", "mining", "corporate", "appointment", "careers", "quotation", "satisfaction", "market", "canvas", "projects"];
export const ROUTES: RouteId[] = ["route-A", "route-B", "route-C"];
export const MINING_STAGES: MiningStage[] = ["exploration", "construction", "production", "export", "closure"];
export const STEP_MODES: StepMode[] = ["road", "rail", "sea", "air", "port", "warehouse", "customs", "heavy_lift", "mining", "digital", "people"];
const STYLE_HINT: Record<string, string> = { photorealiste: "photorealistic", schema: "clean technical diagram", aquarelle: "watercolor", infographie: "flat infographic illustration" };
const str = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";
const list = (v: unknown, max: number) => Array.isArray(v) ? v.slice(0, max).filter((x): x is Record<string, unknown> => !!x && typeof x === "object") : [];
function parseSolution(args: Record<string, unknown>): Solution | null {
  const title = str(args.title, 150), summary = str(args.summary, 900);
  if (!title || !summary) return null;
  const steps = list(args.steps, 8).map(s => ({ label: str(s.label, 80), detail: str(s.detail, 300), mode: STEP_MODES.includes(s.mode as StepMode) ? s.mode as StepMode : undefined })).filter(s => s.label);
  const considerations = list(args.considerations, 6).map(c => ({ label: str(c.label, 80), text: str(c.text, 300) })).filter(c => c.label && c.text);
  const next = (Array.isArray(args.next) ? args.next : []).filter((s): s is Screen => ALLOWED_SCREENS.includes(String(s))).slice(0, 4);
  return { title, summary, steps, considerations, next, route: ROUTES.includes(args.route as RouteId) ? args.route as RouteId : undefined, miningStage: MINING_STAGES.includes(args.mining_stage as MiningStage) ? args.mining_stage as MiningStage : undefined, imagePrompt: str(args.image_prompt, 800) || undefined };
}
export function parseToolAction(name?:string, args:Record<string,unknown>={ }):MaterialAction|null {
  if(name==="navigate"&&ALLOWED_SCREENS.includes(String(args.screen)))return {type:"go",screen:args.screen as Screen};
  if(name==="show_route"&&ROUTES.includes(args.route as RouteId))return {type:"show_route",route:args.route as RouteId};
  if(name==="show_mining"&&MINING_STAGES.includes(args.stage as MiningStage))return {type:"show_mining",stage:args.stage as MiningStage};
  if(name==="show_solution"){const solution=parseSolution(args);return solution?{type:"solution",solution}:null;}
  if(name==="generate_video"&&typeof args.prompt==="string"&&args.prompt.trim())return {type:"render_video",title:str(args.title,150)||"Film Africa Global Logistics",prompt:args.prompt.slice(0,1500),narration:str(args.narration,600)||undefined,soundscape:str(args.soundscape,300)||undefined};
  if(name==="generate_audio"&&typeof args.text==="string"&&args.text.trim()){const kind=(["voiceover","sound","music"].includes(String(args.kind))?args.kind:"voiceover") as AudioKind;return {type:"render_audio",title:str(args.title,150)||(kind==="music"?"Musique":kind==="sound"?"Ambiance sonore":"Voix off"),kind,text:args.text.slice(0,2000),seconds:Number.isFinite(Number(args.seconds))?Math.min(60,Math.max(3,Number(args.seconds))):undefined};}
  if(name==="show_3d"&&MODEL_3D.includes(args.object as Model3DKind)){const shapes=["box","cylinder","sphere","cone"];const vec=(v:unknown,min:number,max:number):[number,number,number]|undefined=>Array.isArray(v)&&v.length===3&&v.every(x=>Number.isFinite(Number(x)))?v.map(x=>Math.min(max,Math.max(min,Number(x)))) as [number,number,number]:undefined;
    const parts=list(args.parts,14).map(p=>({name:str(p.name,40),explanation:str(p.explanation,300),shape:shapes.includes(String(p.shape))?p.shape as PartShape:undefined,size:vec(p.size,0.05,12),position:vec(p.position,-12,12),color:/^#[0-9a-f]{6}$/i.test(String(p.color))?String(p.color):undefined})).filter(p=>p.name);
    if(args.object==="custom"&&parts.length<2)return null;
    return {type:"model3d",title:str(args.title,150)||"Vue éclatée",object:args.object as Model3DKind,parts,intro:str(args.intro,400)||undefined};}
  if(name==="show_project"&&typeof args.id==="string"&&/^[a-z0-9-]{2,40}$/.test(args.id))return {type:"project",id:args.id};
  if(name==="show_flow"){
    const title=str(args.title,150);
    const nodes=list(args.nodes,8).map(n=>({label:str(n.label,40),kind:(FLOW_KINDS.includes(n.kind as FlowKind)?n.kind:"hub") as FlowKind,detail:str(n.detail,120)||undefined})).filter(n=>n.label);
    if(!title||nodes.length<2)return null;
    let links=list(args.links,12).map(l=>({from:Number(l.from),to:Number(l.to),mode:(STEP_MODES.includes(l.mode as StepMode)?l.mode:"road") as StepMode,label:str(l.label,40)||undefined})).filter(l=>Number.isInteger(l.from)&&Number.isInteger(l.to)&&l.from!==l.to&&l.from>=0&&l.to>=0&&l.from<nodes.length&&l.to<nodes.length);
    if(!links.length)links=nodes.slice(1).map((n,i)=>({from:i,to:i+1,mode:inferMode(nodes[i].kind,n.kind),label:undefined}));
    const info=(Array.isArray(args.info)?args.info:[]).slice(0,5).map(x=>String(x).slice(0,40)).filter(Boolean);
    return {type:"flow",flow:{title,nodes,links,info}};
  }
  if(name==="show_chart"){const labels=(Array.isArray(args.labels)?args.labels:[]).slice(0,12).map(l=>String(l).slice(0,40));const values=(Array.isArray(args.values)?args.values:[]).slice(0,labels.length).map(Number);const title=str(args.title,150);if(title&&labels.length>=2&&values.length===labels.length&&values.every(Number.isFinite))return {type:"chart",chart:{title,kind:(["bar","line","donut"].includes(String(args.kind))?args.kind:"bar") as ChartKind,labels,values,unit:str(args.unit,20)||undefined,source:str(args.source,200)||undefined}};return null;}
  if(name==="open_brief"&&typeof args.title==="string"&&typeof args.body==="string")return {type:"sheet",title:args.title.slice(0,150),body:args.body.slice(0,2000)};
  if(name==="generate_image"&&typeof args.prompt==="string"&&args.prompt.trim()){const style=typeof args.style==="string"?args.style:"";return {type:"render_image",title:style?`Illustration · ${style}`:"Illustration",prompt:`${args.prompt.slice(0,700)}${STYLE_HINT[style]?` (${STYLE_HINT[style]})`:""}`};}
  if(name==="open_studio"&&["image","schema","storyboard","doc"].includes(String(args.tab))&&typeof args.title==="string"&&typeof args.body==="string")return {type:"open_studio",tab:args.tab as "image"|"schema"|"storyboard"|"doc",title:args.title.slice(0,150),body:args.body.slice(0,4000)};
  if(name==="show_image"&&typeof args.title==="string"&&typeof args.image==="string"&&args.image.startsWith("data:image/")&&args.image.length<6000000)return {type:"show_image",title:args.title.slice(0,150),image:args.image,text:typeof args.text==="string"?args.text.slice(0,600):""};
  return null;
}
// Résumé court renvoyé au modèle Live : il sait ce qui est réellement affiché.
export function describeAction(a: MaterialAction): string {
  switch (a.type) {
    case "solution": return `Vue solution « ${a.solution.title} » affichée : ${a.solution.steps.length} étapes${a.solution.route ? `, carte ${a.solution.route}` : ""}${a.solution.imagePrompt ? ", visuel en cours de création" : ""}.`;
    case "render_video": return "Film en cours de tournage, il s’affiche dans la vue dans une vingtaine de secondes avec le logo Africa Global Logistics.";
    case "project": return `Page Projets ouverte sur « ${a.id} » : chiffres clés, étapes, expérience 3D éclatée et sources.`;
    case "page": return `Page « ${a.page.title} » (${a.page.site}) ouverte en mode lecture${a.page.embeddable ? ", page d’origine disponible" : ""}.`;
    case "render_audio": return a.kind === "music" ? "Musique en cours de composition, elle se lit dans la vue." : a.kind === "sound" ? "Ambiance sonore en cours de création, elle se lit dans la vue." : "Voix off en cours d’enregistrement, elle se lit dans la vue.";
    case "model3d": return `Vue 3D éclatée « ${a.title} » affichée : ${a.object}, pièces numérotées avec leurs explications, visite guidée disponible.`;
    case "web": return `${a.web.kind === "news" ? "Fil d’actualités" : "Résultats web"} « ${a.title} » affiché (${a.web.items.length} sources).`;
    case "flow": return `Schéma animé « ${a.flow.title} » affiché : ${a.flow.nodes.length} maillons, ${a.flow.links.length} liaisons.`;
    case "chart": return `Graphique « ${a.chart.title} » affiché (${a.chart.labels.length} valeurs${a.chart.source?`, source ${a.chart.source}`:", illustratif"}).`;
    case "render_image": return "Illustration en cours de création, elle s’affiche dans la vue dans quelques secondes.";
    case "show_route": return `Carte du corridor ${a.route} affichée.`;
    case "show_mining": return `Parcours Mining ouvert sur l’étape ${a.stage}.`;
    case "sheet": return `Fiche « ${a.title} » affichée.`;
    case "go": return `Écran ${a.screen} ouvert.`;
    case "open_studio": return `Studio créatif ouvert sur l’onglet ${a.tab}.`;
    case "show_image": return "Image affichée.";
  }
}
export function publishAction(action:MaterialAction) { if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("agl-action",{detail:action})); }
