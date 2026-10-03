# Africa Global Logistics × SIREXE — Borne immersive

Borne tactile Next.js, React et Tailwind : Mining, logistique, présentation Africa Global Logistics, préparation de rendez-vous et candidatures, cotation et enquête de satisfaction.

## Lancement

```bash
npm install
cp .env.example .env.local
# Renseigner les clés serveur dans .env.local.
npm run dev
```

## Variables d’environnement

| Variable | Usage |
|---|---|
| `GEMINI_API_KEY` | Clé serveur IA, jamais envoyée au navigateur. |
| `GEMINI_MODEL` | Modèle texte/image configuré ; repli `gemini-flash-latest` en cas d’indisponibilité. |
| `GEMINI_LIVE_MODEL` | Modèle compatible Live API pour l’audio natif et les images caméra. |
| `GEMINI_TTS_MODEL` | Modèle audio pour la lecture serveur des réponses texte ; synthèse navigateur en repli. |
| `NEXT_PUBLIC_ADMIN_PW` | Verrou d’interface `/admin`, vérifié côté client ; ne constitue pas une authentification serveur. |

Les noms de modèles sont configurables et leur disponibilité dépend du compte fournisseur. Un badge « configuré » indique la présence d’une clé, pas une connexion Live vérifiée. Les fichiers `.env*` contenant les valeurs et `.vercel/` sont exclus de Git.

## Parcours

| Route | Expérience |
|---|---|
| `/` | Écran d’arrivée, carte géographique de l’Afrique et Côte d’Ivoire mise en évidence |
| `/accueil` | Choix des intentions et accès Mining |
| `/experiences` | Mission Control, Explore, Build et Vision Lab |
| `/mining` | Cycle minier, cas Tokadeh Phase II et quiz |
| `/mission`, `/explore`, `/build` | Simulations logistiques interactives |
| `/vision` | Caméra opt-in, détection locale, voix en direct et scan de carte de visite |
| `/presentation` | Expertises Africa Global Logistics et fiche téléchargeable |
| `/rendez-vous`, `/emploi` | Préparation de demandes locales et téléchargement JSON |
| `/cotation` | Formulaire officiel Africa Global Logistics, lien direct et QR code |
| `/satisfaction` | Enquête officielle Microsoft Forms, lien direct et QR code |
| `/performance` | Croissance du PIB CI sourcée Banque mondiale et simulation séparée |
| `/canvas` | Canvas Lara : générations réelles (image, schéma, storyboard narré, document) |
| `/resultats` | Résultats et passage vers l’enquête |
| `/admin` | Demandes locales, export CSV et analytics avancées (sessions, entonnoir, graphiques) |
| `/demo` | Démonstration automatique |

Les boutons de fin d’expérience mènent à `/satisfaction`. Les formulaires externes proposent un lien direct et un QR code si leur hébergement empêche l’intégration en iframe.

## Données et limites

- Les rendez-vous et candidatures sont stockés dans le navigateur de la borne et exportables en JSON/CSV. Aucune réservation, transmission RH ou synchronisation CRM n’est réalisée.
- Les contours de l’Afrique proviennent de Natural Earth. Toutes les cartes utilisent des sources ouvertes et sans clé :
  - **Carte cinématique 3D** (Vue Live, Explore) : MapLibre GL (BSD-3) + OpenFreeMap (données OpenStreetMap / OpenMapTiles), relief Terrarium (AWS Open Data). Vol d’arrivée Afrique → Côte d’Ivoire, pays mis en lumière (contour GADM doré, reste du monde voilé), corridors tracés en or avec convoi animé, repères AGL pulsants (ports, hub), bâtiments 3D au port d’Abidjan, relief de Man, orbite lente au repos. Chaque maillon d’Explore fait voler la caméra vers son lieu.
  - **Cartes Leaflet** (Mission, Build) : tuiles OpenStreetMap teintées aux couleurs AGL.
  - Repli automatique : carte cinématique → Leaflet/OSM → schéma vectoriel hors ligne.
  - Le worker MapLibre est copié dans `public/maplibre/` par `predev`/`prebuild` (`scripts/copy-maplibre-worker.mjs`).
  - Les tuiles OpenStreetMap publiques conviennent à une borne au trafic modeste ; pour un déploiement à grande échelle, prévoir un serveur de tuiles dédié (politique d’usage OSM).
- Les liaisons, scores, délais, coûts, CO₂ et impacts des jeux sont illustratifs. Les villes sont réelles ; la faisabilité d’un transport exige une étude de route.
- Le cas Tokadeh reprend les éléments documentaires Africa Global Logistics : concentrateur à Tokadeh, chargeur à Buchanan et 34 navires affrétés déchargés. Les visuels du template sont des illustrations métier.
- `/api/market` récupère la croissance annuelle réelle du PIB de la Côte d’Ivoire, indicateur Banque mondiale `NY.GDP.MKTP.KD.ZG`. En cas d’indisponibilité, aucune donnée de substitution n’est inventée.
- Les demandes micro/caméra sont explicites. Les flux sont arrêtés à la fermeture. L’application n’enregistre pas les conversations ni les vidéos ; l’IA reçoit les données nécessaires pendant leur utilisation.
- Réinitialisation après 90 secondes d’inactivité, portée à 300 secondes pour les formulaires et Vision Lab.

## IA

`/api/gemini/stream` utilise le streaming natif du SDK IA et les derniers tours de conversation. Le contexte de l’écran et `knowledge/*.md` sont inclus dans les instructions. Les outils autorisés peuvent ouvrir un parcours, afficher un corridor ou une fiche téléchargeable.

`/api/live/token` crée un jeton éphémère à usage unique. Le navigateur utilise ce jeton pour la voix en direct : micro PCM16/16 kHz, audio de sortie 24 kHz, transcriptions et images caméra réduites. La clé permanente reste côté serveur. HTTPS ou localhost et les autorisations navigateur sont nécessaires.

## Vue Live : une instruction, une solution à l’écran

Chaque instruction donnée à Lara (voix Gemini Live ou texte) se matérialise dans la **Vue Live**, affichée à côté de la conversation sans la masquer. L’outil `show_solution` produit une solution structurée : synthèse, étapes avec leur mode (port, douane, route, rail, heavy lift…), points à valider, corridor cartographié, visuel généré et parcours suivants. Une précision avec le même titre met la vue à jour ; les 6 dernières vues restent accessibles dans un historique. Les cartes, fiches et images utilisent la même vue.

En Live, chaque appel d’outil reçoit une réponse décrivant ce qui est réellement affiché, et le modèle lit l’écran à la demande (`get_screen_context`) au lieu de recevoir le contexte toutes les 2,5 s. Les sessions utilisent la compression de contexte et la reprise (`sessionResumption`) : à l’annonce de fin de session ou après une coupure, la conversation se reconnecte sans être perdue (3 tentatives). En mode texte, les vues apparaissent dès l’appel d’outil, sans attendre la fin du texte ni la génération d’image.

## Orchestration, internet et secours

Lara choisit l’outil selon la demande et peut en combiner plusieurs : vue solution, carte, image, film court, storyboard, graphique analytique, schéma logistique animé (`show_flow`), recherche web sourcée (`web_search`) et fil d’actualités (`get_news`, Google News RSS). Les recherches sont exécutées côté serveur, leurs sources datées s’affichent avec un QR code pour lire l’article sur téléphone, et le modèle répond à partir des résultats en citant source et date.

| Besoin | Principal | Secours automatique |
|---|---|---|
| Texte | Gemini | OpenAI (`OPENAI_TEXT_MODEL`, défaut `gpt-5.4-mini`) |
| Voix temps réel | Gemini Live | OpenAI Realtime en WebRTC (`OPENAI_REALTIME_MODEL`, défaut `gpt-realtime-2.1-mini`, voix féminine) |
| Voix lue | Gemini TTS | OpenAI `gpt-4o-mini-tts` |
| Images | OpenAI (`OPENAI_IMAGE_MODEL`) → Gemini (modèles découverts) | fal (`FAL_IMAGE_MODEL`) |
| Films | fal MiniMax H3 (`FAL_VIDEO_MODEL`) | — |
| Recherche web | OpenAI (recherche intégrée) | Google News RSS |
| Voix lue | ElevenLabs (voix féminine française, `ELEVENLABS_VOICE_ID`) | Gemini TTS, puis OpenAI |
| Voix off, ambiances, musique | ElevenLabs (`generate_audio`, narration et ambiance des films) | — |
| Pages web | Lecture serveur sécurisée (`open_page`, adresses publiques uniquement) | Fiche minimale + QR code |

Un fournisseur sans quota ou sans crédit est mis de côté 10 minutes. Aucun nom de modèle n’est affiché sur la borne. Variables serveur : `GEMINI_API_KEY`, `OPENAI_API_KEY`, `FAL_KEY`, `ELEVENLABS_API_KEY` (jamais exposées au navigateur).

Vue 3D éclatée (`show_3d`) : conteneur, convoi exceptionnel, portique de quai, porte-conteneurs, wagon, ou assemblage décrit par Lara ; pièces numérotées, explication au toucher, visite guidée lue à voix haute.

## Son et interactions

`src/lib/sound.ts` synthétise le design sonore en WebAudio, sans fichier audio : toucher, onglet, validation, fermeture, ouverture de Lara, transition d’écran, apparition d’une vue, connexion Live. Tous les boutons de la borne en bénéficient automatiquement (attribut `data-sfx` pour forcer un son, `data-sfx="off"` pour le couper), avec une micro-vibration si l’écran la gère. Le bouton Son coupe l’ensemble et l’état est conservé.

## Studio créatif et carte de visite

Le bouton « Parlons ensemble » ouvre Lara et démarre directement la voix. L’IA peut matérialiser : parcours (navigation), corridors, fiches, et espace créatif (`open_studio`, `generate_image`). Le Studio créatif propose 4 onglets : image générée à la demande avec animation, schéma logistique dessiné depuis une description, storyboard avec montage narré et musique d’ambiance, document transformable (schéma, lecture à voix haute, téléchargement). Chaque création propose des liens vers les parcours concernés de la borne.

« Filmer une carte de visite » (Vision Lab) capture la carte filmée et en lit les coordonnées par reconnaissance visuelle : vérifiez, puis pré-remplissez le rendez-vous ou téléchargez le JSON. Aucun fournisseur secondaire n’est utilisé : une seule clé IA principale.

## Charte et ressources

Charte extraite du template commercial fourni : bleu `#1B365F`, or `#EED58E`, Arial. Logo officiel extrait : `public/assets/template/image6.svg`. Les médias sont dans `public/assets/template/` ; les scripts d’extraction et de géographie sont dans `scripts/`.

## Vérification et publication

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run start -- --port 3120
# Dans un second terminal, navigateur Chromium Playwright installé :
npm run test:e2e
```

Les tests navigateur vérifient les parcours, exports, liens/QR codes, responsive et libération caméra. Les scénarios IA sont mockés : un contrôle fournisseur réel séparé est nécessaire pour valider la voix en direct, la génération d’images et la lecture de cartes.

Déploiement : configurer les variables Production du projet Vercel, puis `vercel --prod`. `next.config.ts` inclut `knowledge/` dans le tracing serveur.
