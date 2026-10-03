import type { Model3DKind } from "./actions";

// Réalisations d’Africa Global Logistics en Côte d’Ivoire — uniquement des faits publiés et sourcés.
export interface ProjectFact { value: string; label: string }
export interface Project {
  id: string;
  title: string;
  category: "Port" | "Rail" | "Énergie" | "Industrie" | "Santé" | "Mines" | "Logistique" | "Investissement";
  date: string;
  place: string;
  lat: number;
  lng: number;
  summary: string;
  facts: ProjectFact[];
  steps: string[];
  model?: Model3DKind;
  sources: { label: string; url: string }[];
}

export const PROJECTS: Project[] = [
  {
    id: "metro-locomotives",
    title: "Cinq locomotives pour le métro d’Abidjan",
    category: "Rail", date: "2 – 4 août 2026", place: "Port d’Abidjan → Abobo Sagbé", lat: 5.43, lng: -4.02,
    summary: "AGL Côte d’Ivoire a acheminé cinq locomotives, soit 332,28 tonnes au total, du Port autonome d’Abidjan jusqu’au site de réception d’Abobo Sagbé, pour la pose des voies de la ligne 1 du métro d’Abidjan, pour le compte de Colas Rail.",
    facts: [{ value: "5", label: "locomotives" }, { value: "332,28 t", label: "masse totale" }, { value: "400 t", label: "capacité de la grue" }, { value: "2", label: "remorques hydrauliques Nicolas" }],
    steps: ["Reconnaissance de l’itinéraire et analyse des risques", "Contrôle des équipements avant opération", "Levage au port par grue de 400 t", "Transport sur remorques hydrauliques modulaires, escorte et coordination avec les autorités", "Déchargement au site d’Abobo Sagbé dans le respect des normes HSE"],
    model: "locomotive_convoy",
    sources: [{ label: "AIP — équipements mobilisés pour les locomotives du métro", url: "https://www.aip.ci/cote-divoire-aip-transport-des-equipements-de-pointe-mobilises-pour-acheminer-cinq-locomotives-du-metro-dabidjan/" }, { label: "Agence Ecofin", url: "https://www.agenceecofin.com/actualites-infrastructures/2809-141953-agl-cote-d-ivoire-achemine-cinq-locomotives-de-332-tonnes-pour-le-chantier-du-metro-d-abidjan" }],
  },
  {
    id: "baleine-xmas-trees",
    title: "Projet Baleine : arbres de production de 70 tonnes",
    category: "Énergie", date: "21 mai 2024", place: "Quai 25, Port d’Abidjan → base AGL de Vridi", lat: 5.26, lng: -4.0,
    summary: "Réception à Abidjan de deux « Xmas-trees » de 70 tonnes chacun, d’un touret de câble sous-marin de 40 tonnes et d’équipements divers, environ 235 tonnes au total, venus du port de Montrose (Royaume-Uni) pour la phase 2 du projet Baleine, le plus grand gisement du secteur énergétique ivoirien.",
    facts: [{ value: "2 × 70 t", label: "arbres de production" }, { value: "40 t", label: "touret de câble sous-marin" }, { value: "≈ 235 t", label: "équipements au total" }, { value: "10 lignes", label: "remorque modulaire (160 t)" }],
    steps: ["Étude de route et levée des obstacles entre le quai 25 et Vridi", "Transit et déchargement au port", "Transport sur remorque hydraulique modulaire Nicolas 10 lignes et tracteur 6×6 de 500 ch", "Déchargement par grue automotrice de 400 t sur le site aménagé"],
    model: "xmas_tree",
    sources: [{ label: "AGL — 200+ tonnes d’équipements énergétiques", url: "https://www.aglgroup.com/en/news/agl-assure-la-logistique-de-plus-de-200-tonnes" }, { label: "Abidjan.net", url: "https://news.abidjan.net/articles/734210/cote-divoire-agl-assure-la-logistique-de-plus-de-200-tonnes-dequipements-lourds-destines-au-secteur-de-lenergie" }],
  },
  {
    id: "brakina-tanks",
    title: "Deux cuves géantes d’Abidjan à Ouagadougou",
    category: "Industrie", date: "Départ le 4 juillet 2026", place: "Port d’Abidjan → Ouagadougou (Burkina Faso)", lat: 9.6, lng: -5.2,
    summary: "Les filiales ivoirienne et burkinabè d’AGL ont transporté deux cuves industrielles hors gabarit, 50 tonnes au total, sur plus de 1 300 km jusqu’à la brasserie Brakina près de Ouagadougou, après environ huit mois de préparation.",
    facts: [{ value: "1 300 km", label: "parcours" }, { value: "15 jours", label: "de convoi" }, { value: "50 t", label: "deux cuves hors gabarit" }, { value: "40+", label: "spécialistes mobilisés" }],
    steps: ["Huit mois de préparation et d’études", "Détour de plus de 100 km par Agboville pour éviter les ouvrages incompatibles", "Franchissement de ponts, de péages et du réseau électrique", "Escorte et supervision jusqu’au site de la brasserie"],
    model: "tank_convoy",
    sources: [{ label: "Abidjan TV — transport exceptionnel de deux cuves géantes", url: "https://abidjantv.net/economie/agl-reussit-le-transport-exceptionnel-de-02-cuves-geantes-de-la-cote-divoire-au-faso/" }],
  },
  {
    id: "cit-terminal",
    title: "Côte d’Ivoire Terminal, 2e terminal à conteneurs",
    category: "Port", date: "En service depuis novembre 2022 · extension juillet 2025", place: "Port d’Abidjan", lat: 5.28, lng: -4.0,
    summary: "Concession signée en 2013 entre l’État et les actionnaires Africa Global Logistics et APM Terminals : 37,5 hectares, 1 100 mètres de quai, 16 mètres de tirant d’eau. En juillet 2025, deux portiques de quai et neuf portiques de parc entièrement électriques ont porté la flotte à 8 portiques de quai et 27 portiques de parc.",
    facts: [{ value: "1,5 M EVP", label: "capacité annuelle" }, { value: "1 100 m", label: "de quai" }, { value: "8 + 27", label: "portiques de quai / de parc" }, { value: "3 étoiles", label: "label Green Terminal (2023)" }],
    steps: ["Concession signée en 2013", "Mise en service en novembre 2022 (262 milliards FCFA d’investissement)", "Label Green Terminal 3 étoiles, Bureau Veritas, mai 2023", "Juillet 2025 : 2 portiques de quai et 9 portiques de parc électriques supplémentaires"],
    model: "terminal",
    sources: [{ label: "Côte d’Ivoire Terminal — à propos", url: "https://cotedivoireterminal.com/eng/a-propos/" }, { label: "AGL — 2 portiques de quai et 9 portiques de parc", url: "https://www.aglgroup.com/en/121598/" }, { label: "Abidjan.net", url: "https://news.abidjan.net/articles/743185/secteur-maritime-cote-divoire-terminal-se-dote-de-2-portiques-de-quai-et-9-portiques-de-parc" }],
  },
  {
    id: "sitarail-gl30",
    title: "Sitarail : quatre locomotives GL30",
    category: "Rail", date: "15 décembre 2025", place: "Corridor Abidjan – Ouagadougou – Kaya", lat: 7.69, lng: -5.03,
    summary: "Sitarail, filiale d’AGL qui exploite le réseau ferroviaire Abidjan – Ouagadougou, a réceptionné au Port d’Abidjan quatre locomotives diesel-électriques GL30 d’environ 3 000 chevaux, dans le cadre d’une modernisation qui comprend aussi 260 wagons plats.",
    facts: [{ value: "4", label: "locomotives GL30" }, { value: "≈ 3 000 ch", label: "par locomotive" }, { value: "1 500 t", label: "brutes remorquées" }, { value: "260", label: "wagons plats commandés" }],
    steps: ["Réception au Port autonome d’Abidjan", "Systèmes de commande informatisés et diagnostic embarqué", "Mise en service sur le corridor Abidjan – Ouagadougou", "Premier lot de wagons plats opérationnel depuis novembre 2025"],
    model: "locomotive",
    sources: [{ label: "AGL — mise en service des locomotives GL30", url: "https://www.aglgroup.com/news/mise-en-service-locomotives-gl30-sitarail" }, { label: "Agence Ecofin", url: "https://www.agenceecofin.com/actualites-infrastructures/1712-134376-sitarail-renforce-son-parc-de-materiel-avec-quatre-nouvelles-locomotives-de-type-gl30" }],
  },
  {
    id: "chu-mri",
    title: "Trois IRM pour les CHU d’Abidjan",
    category: "Santé", date: "26 – 29 octobre 2024", place: "Aéroport d’Abidjan → CHU de Cocody, Treichville et Angré", lat: 5.35, lng: -3.98,
    summary: "Logistique de bout en bout de trois IRM et de leurs équipements annexes, plus de 32 tonnes venues des États-Unis, commandés par le ministère de la Santé pour les CHU de Cocody, Treichville et Angré.",
    facts: [{ value: "3", label: "IRM" }, { value: "32+ t", label: "d’équipements" }, { value: "3", label: "CHU équipés" }, { value: "4 jours", label: "d’opération" }],
    steps: ["Dédouanement à l’arrivée à l’aéroport", "Stockage sécurisé à l’Aérohub, base de logistique contractuelle", "Transport, levage et positionnement par un service dédié aux colis lourds", "Livraison et installation dans les trois CHU"],
    model: "mri",
    sources: [{ label: "AGL — logistique de plusieurs IRM", url: "https://www.aglgroup.com/agl-assure-la-logistique-de-plusieurs-irm-pour-lequipement-des-hopitaux-en-cote-divoire/" }, { label: "Minutes Éco", url: "https://www.minutes-eco.com/news/3028-equipement-des-hopitaux-agl-cote-d-ivoire-gere-la-logistique-d-irm-destines-a-3-chu-d-abidjan" }],
  },
  {
    id: "lafigue-convoy",
    title: "Convoi de 61 camions vers la mine de Lafigué",
    category: "Mines", date: "Septembre 2023", place: "Sanankoroba (Mali) → mine de Lafigué", lat: 8.62, lng: -4.48,
    summary: "AGL Mali a coordonné un convoi exceptionnel de 61 camions transportant plus d’une douzaine d’engins sur plus de 760 km, jusqu’à la mine d’or de Lafigué, dans le centre-nord de la Côte d’Ivoire.",
    facts: [{ value: "61", label: "camions" }, { value: "760+ km", label: "de parcours" }, { value: "12+", label: "engins miniers" }, { value: "2", label: "pays traversés" }],
    steps: ["Préparation du convoi à Sanankoroba", "Passage de frontière Mali – Côte d’Ivoire", "Acheminement des engins jusqu’au site minier", "Livraison sur la mine de Lafigué"],
    model: "haul_truck",
    sources: [{ label: "Agence Ecofin — expédition vers la mine de Lafigué", url: "https://www.agenceecofin.com/mines/1509-111767-agl-mali-reussit-une-expedition-vers-la-mine-de-lafigue-en-co-te-d-ivoire-sur-plus-de-760-km" }],
  },
  {
    id: "aerohub",
    title: "Aérohub, base logistique aérienne",
    category: "Logistique", date: "Phase 2 inaugurée le 21 octobre 2022", place: "Zone aéroportuaire d’Abidjan", lat: 5.26, lng: -3.93,
    summary: "Plateforme de réception, de stockage et de distribution en zone aéroportuaire. La phase 2 (9 000 m², 3,4 milliards FCFA, 18 mois de travaux) a été présentée comme la plus grande base logistique aérienne d’Afrique de l’Ouest.",
    facts: [{ value: "9 000 m²", label: "phase 2" }, { value: "3,4 Md FCFA", label: "investissement phase 2" }, { value: "18 mois", label: "de travaux" }, { value: "2019", label: "phase 1" }],
    steps: ["Phase 1 inaugurée en 2019", "Phase 2 mise en service en octobre 2022", "Stockage sécurisé, notamment des IRM des CHU en 2024"],
    sources: [{ label: "Abidjan.net — nouvelle base logistique aérienne", url: "https://news.abidjan.net/articles/713573/entrepot-aerien-de-bollore-transport-logistics-en-cote-divoire-une-nouvelle-base-logistique-entre-innovation-et-protection-de-lenvironnement" }],
  },
  {
    id: "investissements",
    title: "Investir dans la logistique intérieure",
    category: "Investissement", date: "2025 – 2030", place: "Ferkessédougou, Bouaké, San Pedro", lat: 8.2, lng: -5.6,
    summary: "AGL prévoit d’investir plus de 60 millions d’euros dans la logistique intérieure sur cinq ans, avec des hubs et entrepôts secs équipés de froid à Ferkessédougou, Bouaké et San Pedro, et un engagement de 800 milliards FCFA dans le cadre du PND 2026 – 2030.",
    facts: [{ value: "60+ M€", label: "logistique intérieure (5 ans)" }, { value: "800 Md FCFA", label: "engagement PND 2026 – 2030" }, { value: "3", label: "hubs régionaux" }, { value: "1 500+", label: "collaborateurs en Côte d’Ivoire" }],
    steps: ["Hubs opérationnels et entrepôts secs réfrigérés", "Connectivité vers les pays sans littoral du Sahel", "Rail, plateformes logistiques régionales et numérisation"],
    sources: [{ label: "Financial Afrik — 67 M$ dans la logistique intérieure", url: "https://www.financialafrik.com/2025/05/15/cote-divoire-agl-envisage-dinvestir-plus-de-67-millions-de-dollars-dans-la-logistique-interieure/" }, { label: "Log Update Africa — 800 milliards FCFA", url: "https://www.logupdateafrica.com/financial/agl-plans-to-invest-800-billion-cfa-francs-in-cte-divoire-1359913" }],
  },
];
