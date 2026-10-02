import type { Screen } from "./store";
export type MaterialAction =
  | { type: "show_route"; route: "route-A" | "route-B" | "route-C" }
  | { type: "show_mining"; stage: "exploration" | "construction" | "production" | "export" | "closure" }
  | { type: "sheet"; title: string; body: string }
  | { type: "go"; screen: Screen };
export const ALLOWED_SCREENS = ["home", "games", "mission", "explore", "build", "vision", "mining", "corporate", "appointment", "careers", "quotation", "satisfaction", "market"];
export function parseToolAction(name?:string, args:Record<string,unknown>={ }):MaterialAction|null {
  if(name==="navigate"&&ALLOWED_SCREENS.includes(String(args.screen)))return {type:"go",screen:args.screen as Screen};
  if(name==="show_route"&&["route-A","route-B","route-C"].includes(String(args.route)))return {type:"show_route",route:args.route as "route-A"|"route-B"|"route-C"};
  if(name==="show_mining"&&["exploration","construction","production","export","closure"].includes(String(args.stage)))return {type:"show_mining",stage:args.stage as "exploration"|"construction"|"production"|"export"|"closure"};
  if(name==="open_brief"&&typeof args.title==="string"&&typeof args.body==="string")return {type:"sheet",title:args.title.slice(0,150),body:args.body.slice(0,2000)};
  return null;
}
export function publishAction(action:MaterialAction) { if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("agl-action",{detail:action})); }
