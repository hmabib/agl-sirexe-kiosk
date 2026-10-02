export type Lang = "fr" | "en";

export const STRINGS: Record<string, Record<Lang, string>> = {
  touch_to_explore: { fr: "TOUCHEZ POUR EXPLORER", en: "TOUCH TO EXPERIENCE AGL" },
  welcome: { fr: "BIENVENUE DANS L'EXPÉRIENCE AGL", en: "WELCOME TO THE AGL EXPERIENCE" },
  welcome_sub: {
    fr: "Explorez comment la logistique transforme les ressources africaines en opportunités économiques.",
    en: "Explore how logistics turns African resources into economic opportunities.",
  },
  mission: { fr: "MISSION CONTROL", en: "MISSION CONTROL" },
  mission_sub: { fr: "Pilotez une opération logistique complexe.", en: "Drive a complex logistics operation." },
  explore: { fr: "EXPLORE AGL", en: "EXPLORE AGL" },
  explore_sub: { fr: "Entrez dans la chaîne logistique.", en: "Step inside the supply chain." },
  build: { fr: "BUILD AFRICA", en: "BUILD AFRICA" },
  build_sub: { fr: "Construisez le corridor logistique de demain.", en: "Build tomorrow's logistics corridor." },
  talk_ai: { fr: "PARLER À AGL AI", en: "TALK TO AGL AI" },
  listening: { fr: "Je vous écoute…", en: "I'm listening…" },
  thinking: { fr: "Analyse en cours…", en: "Thinking…" },
  start_mission: { fr: "COMMENCER LA MISSION", en: "START MISSION" },
  simulation_note: { fr: "Simulation illustrative.", en: "Illustrative simulation." },
  new_experience: { fr: "NOUVELLE EXPÉRIENCE", en: "NEW EXPERIENCE" },
  talk_expert: { fr: "PARLER À UN EXPERT AGL", en: "TALK TO AN AGL EXPERT" },
  activate_corridor: { fr: "ACTIVER LE CORRIDOR", en: "ACTIVATE CORRIDOR" },
  ask_what_you_see: { fr: "EXPLIQUE-MOI CE QUE JE VOIS", en: "EXPLAIN WHAT I SEE" },
};

export function t(key: string, lang: Lang): string {
  return STRINGS[key]?.[lang] ?? key;
}
