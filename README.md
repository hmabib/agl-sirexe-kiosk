# AGL × SIREXE — Borne immersive

Borne tactile Next.js, React et Tailwind : Mining, logistique, présentation AGL, préparation de rendez-vous et candidatures, cotation et enquête de satisfaction.

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
| `GEMINI_API_KEY` | Clé serveur Gemini, jamais envoyée au navigateur. Aucun routage selon son préfixe. |
| `GEMINI_MODEL` | Modèle texte/image configuré ; repli `gemini-flash-latest` en cas d’indisponibilité. |
| `GEMINI_LIVE_MODEL` | Modèle compatible Live API pour l’audio natif et les images caméra. |
| `GEMINI_TTS_MODEL` | Modèle audio pour la lecture serveur des réponses texte ; synthèse navigateur en repli. |
| `MISTRAL_API_KEY` | Alternative texte uniquement si aucune clé Gemini n’est configurée. |
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
| `/vision` | Caméra opt-in, détection locale et conversation Gemini Live |
| `/presentation` | Expertises AGL et fiche téléchargeable |
| `/rendez-vous`, `/emploi` | Préparation de demandes locales et téléchargement JSON |
| `/cotation` | Formulaire officiel AGL, lien direct et QR code |
| `/satisfaction` | Enquête officielle Microsoft Forms, lien direct et QR code |
| `/performance` | Croissance du PIB CI sourcée Banque mondiale et simulation séparée |
| `/resultats` | Résultats et passage vers l’enquête |
| `/admin` | Demandes locales, export CSV et analytics |
| `/demo` | Démonstration automatique |

Les boutons de fin d’expérience mènent à `/satisfaction`. Les formulaires externes proposent un lien direct et un QR code si leur hébergement empêche l’intégration en iframe.

## Données et limites

- Les rendez-vous et candidatures sont stockés dans le navigateur de la borne et exportables en JSON/CSV. Aucune réservation, transmission RH ou synchronisation CRM n’est réalisée.
- Les contours de l’Afrique proviennent de Natural Earth. Les fonds interactifs utilisent OpenStreetMap/CARTO ; un mode vectoriel sert de repli si les tuiles sont indisponibles.
- Les liaisons, scores, délais, coûts, CO₂ et impacts des jeux sont illustratifs. Les villes sont réelles ; la faisabilité d’un transport exige une étude de route.
- Le cas Tokadeh reprend les éléments documentaires AGL : concentrateur à Tokadeh, chargeur à Buchanan et 34 navires affrétés déchargés. Les visuels du template sont des illustrations métier.
- `/api/market` récupère la croissance annuelle réelle du PIB de la Côte d’Ivoire, indicateur Banque mondiale `NY.GDP.MKTP.KD.ZG`. En cas d’indisponibilité, aucune donnée de substitution n’est inventée.
- Les demandes micro/caméra sont explicites. Les flux sont arrêtés à la fermeture. L’application n’enregistre pas les conversations ni les vidéos ; l’IA reçoit les données nécessaires pendant leur utilisation.
- Réinitialisation après 90 secondes d’inactivité, portée à 300 secondes pour les formulaires et Vision Lab.

## IA

`/api/gemini/stream` utilise le streaming natif du SDK Google et les derniers tours de conversation. Le contexte de l’écran et `knowledge/*.md` sont inclus dans les instructions. Les outils autorisés peuvent ouvrir un parcours, afficher un corridor ou une fiche téléchargeable.

`/api/live/token` crée un jeton éphémère à usage unique. Le navigateur utilise ce jeton pour la Live API : micro PCM16/16 kHz, audio de sortie 24 kHz, transcriptions et images caméra réduites. La clé permanente reste côté serveur. HTTPS ou localhost et les autorisations navigateur sont nécessaires.

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

Les tests navigateur vérifient les parcours, exports, liens/QR codes, responsive et libération caméra. Les scénarios IA sont mockés : un contrôle fournisseur réel séparé est nécessaire pour valider Gemini Live.

Déploiement : configurer les variables Production du projet Vercel, puis `vercel --prod`. `next.config.ts` inclut `knowledge/` dans le tracing serveur.
