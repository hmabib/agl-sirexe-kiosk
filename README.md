# AGL × SIREXE — Borne immersive kiosk

Expérience tactile premium (Next.js + Tailwind + Framer Motion + SVG + Gemini/Mistral Live).

## Lancement

```bash
npm install
cp .env.example .env.local   # renseignez GEMINI_API_KEY (ou clé Mistral AQ.…)
npm run dev                   # http://localhost:3000
```

## Variables d'environnement

| Var | Rôle |
|---|---|
| `GEMINI_API_KEY` | Clé Gemini **ou** Mistral (auto-détectée si `AQ.…`). Jamais exposée : utilisée uniquement dans `/api/gemini` côté serveur. |
| `GEMINI_MODEL` | Dernier modèle texte : `gemini-3.8-flash` (GA sept. 2026, 1M ctx, thinking LOW). Fallback auto → `gemini-3.7-flash` → `gemini-2.5-flash`. |
| `GEMINI_LIVE_MODEL` | Voix temps réel : `gemini-3.8-live` (natif audio, barge-in, 24 langues, transcription). |
| `GEMINI_TTS_MODEL` | Voix studio serveur `/api/tts` (`gemini-3.8-flash-tts`, repli navigateur si 503). |
| `NEXT_PUBLIC_ADMIN_PW` | Mot de passe `/admin` (défaut `agl2026`). |

> ⚠️ `gemini-2.0-flash` est **éteint depuis juin 2026**, `mistral-medium-2505/2508` sont **dépréciés** → la borne utilise désormais `gemini-3.8-flash` + `mistral-medium-latest` avec chaînes de repli automatiques.

La clé fournie (`AQ.Ab8RN6Ip…`) est une clé **Mistral** : collez-la dans `GEMINI_API_KEY`, l'API route la détecte et appelle Mistral automatiquement. Pour Gemini Live temps réel, ajoutez une clé `AIza…` et `GEMINI_MODEL=gemini-live-2.5-flash`.

## Parcours borne

- `/` — attract (particules dorées canvas, 45–55 s idle → reset) → accueil → Mission Control / Explore / Build → finale + lead.
- `/demo` — autoplay VIP 75 s (mine → 80 t → incident → multimodal → port → navire).
- `/admin` — config (modèle, idle, toggles) + analytics anonymes.
- Logo : remplacez `public/assets/agl-logo.svg` par `agl-logo.png` officiel (le composant accepte les deux).

## Kiosk

- Plein écran auto au premier toucher, scrollbars masquées, zones tactiles ≥ 64 px, zoom kiosque 100–140 % (bouton ⤢), zoom +/- sur chaque carte SVG, pinch via trackpad.
- FR/EN, 🔊 toggle, micro flottant + 👁️ ASK WHAT YOU SEE (contexte écran envoyé à l'IA), caméra OFF par défaut (opt-in), orb LISTENING/THINKING/SPEAKING.
- **Streaming SSE** (`/api/gemini/stream`) : réponse écrite mot-à-mot + voix studio serveur (`/api/tts`, repli local). Badge modèle branché visible (TopBar + assistant + admin).
- **WOW** : champ de particules, confettis dorés, anneau de score corridor/mission, comparatif animé A/B/C, live feed corridor, sound design WebAudio + nappe d'ambiance, **globe 3D temps réel** (Three.js, ports + arcs animés, point CI cliquable), ripples tactiles, flash warp entre écrans, alerte idle « Touchez pour continuer », bandeau KPI compteurs, chrono mission, moteur de calcul cargaison×scénario×route×incident, final Build en révélation séquentielle.
- Offline partiel : sans clé, l'IA répond en mode mock « AGL AI momentanément indisponible », les 3 expériences restent jouables.

## Build / Vercel

```bash
npm run build && npm start
```
Déployez sur Vercel, renseignez les env vars dans le dashboard. `knowledge/` : ajoutez vos .md AGL (V2 : injection RAG dans le system prompt).

## Micro / caméra

Navigateur : autoriser micro + caméra (HTTPS ou localhost). Voix : SpeechRecognition + synthèse vocale ; streaming texte via `/api/gemini`.
