import { Type, type FunctionDeclaration } from "@google/genai";
import { ALLOWED_SCREENS, MINING_STAGES, ROUTES, STEP_MODES } from "./actions";
export const AGL_TOOLS: FunctionDeclaration[] = [
  { name:"show_solution",description:"Matérialise à l’écran la solution à l’instruction du visiteur (organiser un transport, comparer des options, expliquer un processus, préparer un projet). La vue s’affiche aussitôt à côté de la conversation. À appeler dès qu’une demande appelle une réponse structurée, avant de la commenter. Pas de chiffres, prix ou délais inventés.",parameters:{type:Type.OBJECT,properties:{
    title:{type:Type.STRING,description:"Titre court de la solution."},
    summary:{type:Type.STRING,description:"Synthèse de la recommandation, 2 à 3 phrases."},
    steps:{type:Type.ARRAY,description:"3 à 7 étapes ordonnées de la chaîne proposée.",items:{type:Type.OBJECT,properties:{label:{type:Type.STRING},detail:{type:Type.STRING},mode:{type:Type.STRING,enum:STEP_MODES}},required:["label","detail"]}},
    considerations:{type:Type.ARRAY,description:"Points à valider ou atouts : gabarit, douane, QHSE, saison, etc.",items:{type:Type.OBJECT,properties:{label:{type:Type.STRING},text:{type:Type.STRING}},required:["label","text"]}},
    route:{type:Type.STRING,enum:ROUTES,description:"Corridor illustratif à cartographier si pertinent : A Abidjan-Korhogo, B Abidjan-Ferkessédougou, C San Pedro-Man."},
    mining_stage:{type:Type.STRING,enum:MINING_STAGES},
    image_prompt:{type:Type.STRING,description:"Prompt visuel en anglais si une illustration aide à comprendre."},
    next:{type:Type.ARRAY,items:{type:Type.STRING,enum:ALLOWED_SCREENS},description:"Parcours de la borne à proposer ensuite."},
  },required:["title","summary","steps"]}},
  { name:"navigate",description:"Ouvre le parcours demandé sur la borne Africa Global Logistics.",parameters:{type:Type.OBJECT,properties:{screen:{type:Type.STRING,enum:ALLOWED_SCREENS}},required:["screen"]}},
  { name:"show_route",description:"Affiche une fiche cartographique interactive d’un corridor illustratif de Côte d’Ivoire. A Abidjan-Korhogo, B Abidjan-Ferkessédougou, C San Pedro-Man.",parameters:{type:Type.OBJECT,properties:{route:{type:Type.STRING,enum:ROUTES}},required:["route"]}},
  { name:"show_mining",description:"Ouvre le parcours Mining sur une étape précise du cycle minier.",parameters:{type:Type.OBJECT,properties:{stage:{type:Type.STRING,enum:MINING_STAGES}},required:["stage"]}},
  { name:"open_brief",description:"Affiche une fiche texte courte quand une solution structurée n’est pas nécessaire. Contenu professionnel, pas de chiffres inventés.",parameters:{type:Type.OBJECT,properties:{title:{type:Type.STRING},body:{type:Type.STRING}},required:["title","body"]}},
  { name:"generate_image",description:"Crée immédiatement une illustration qui s’affiche directement au visiteur. Visuel indicatif, jamais une photo contractuelle. Prompt visuel précis, en anglais si possible.",parameters:{type:Type.OBJECT,properties:{prompt:{type:Type.STRING},style:{type:Type.STRING,enum:["photorealiste","schema","aquarelle","infographie"]}},required:["prompt"]}},
  { name:"generate_video",description:"Tourne un court film (5 s) aux couleurs Africa Global Logistics quand le visiteur demande une vidéo, un film, une animation ou de « voir bouger » une scène. Il s’affiche aussitôt avec le logo AGL. Décris le mouvement de caméra, l’action et la lumière, en anglais.",parameters:{type:Type.OBJECT,properties:{title:{type:Type.STRING},prompt:{type:Type.STRING,description:"Plan filmé : mouvement de caméra, action du sujet, évolution de la lumière."}},required:["prompt"]}},
  { name:"show_chart",description:"Affiche un graphique analytique (barres, courbe ou anneau) quand le visiteur demande des chiffres, une analyse, une comparaison ou une tendance. Uniquement des valeurs issues de la documentation, de l’écran ou données par le visiteur, avec leur source ; sinon une répartition explicitement illustrative.",parameters:{type:Type.OBJECT,properties:{title:{type:Type.STRING},kind:{type:Type.STRING,enum:["bar","line","donut"]},labels:{type:Type.ARRAY,items:{type:Type.STRING}},values:{type:Type.ARRAY,items:{type:Type.NUMBER}},unit:{type:Type.STRING},source:{type:Type.STRING,description:"Source des chiffres, ou vide si illustratif."}},required:["title","kind","labels","values"]}},
  { name:"open_studio",description:"Ouvre l’espace créatif Lara sur un onglet précis : image (illustration à générer depuis un prompt visuel), schema (chaîne logistique, étapes séparées par des flèches ou des lignes), storyboard (scènes numérotées avec mouvements de caméra et narration), doc (document à transformer ou à lire).",parameters:{type:Type.OBJECT,properties:{tab:{type:Type.STRING,enum:["image","schema","storyboard","doc"]},title:{type:Type.STRING},body:{type:Type.STRING}},required:["tab","title","body"]}},
];
// En Live le contexte écran n’est plus réinjecté en continu : le modèle le lit à la demande.
export const LIVE_TOOLS: FunctionDeclaration[] = [
  ...AGL_TOOLS,
  { name:"get_screen_context",description:"Lit l’état actuel de la borne : écran ouvert, cargaison, corridor, étape, vue affichée. À appeler quand le visiteur parle de « ça », « ici », « cet écran » ou après une navigation.",parameters:{type:Type.OBJECT,properties:{}}},
];

// Mêmes outils au format JSON Schema pour le secours OpenAI (texte et temps réel).
function toJsonSchema(s:unknown):unknown{
  if(Array.isArray(s))return s.map(toJsonSchema);
  if(!s||typeof s!=="object")return s;
  const out:Record<string,unknown>={};
  for(const [k,v] of Object.entries(s))out[k]=k==="type"&&typeof v==="string"?v.toLowerCase():toJsonSchema(v);
  return out;
}
export const REALTIME_TOOLS=LIVE_TOOLS.map(t=>({type:"function",name:t.name,description:t.description,parameters:toJsonSchema(t.parameters??{type:"OBJECT",properties:{}})}));
export const OPENAI_TOOLS=AGL_TOOLS.map(t=>({type:"function",function:{name:t.name,description:t.description,parameters:toJsonSchema(t.parameters)}}));
