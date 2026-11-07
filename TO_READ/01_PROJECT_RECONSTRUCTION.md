# Project Reconstruction — LensCraft AI

## 1. What This Application Actually Does

LensCraft AI takes music content (audio upload ≤20MB, YouTube URL, lyrics, or concept description) and produces a comprehensive **video production dossier** using Google Gemini AI. The output includes:

1. **Song Analysis** — Title suggestion, concept description, theme, rhythm/dynamics, visual vibe
2. **Full Script/Scenario** — Detailed text scenario for the music video
3. **Scene Table** — Structured scenes with action, set/location, actors, descriptions
4. **Technical Shot List** — Per-scene camera directions: shot type, movement, lens, duration, description
5. **Shooting Schedule** — Day-by-day shooting plan with locations, cast, equipment
6. **Production Planning** — Prep days, shoot days, post-prod days, location scouting details, rehearsal info
7. **Promo Strategy** — Social media strategy for Shorts/TikTok/Reels with virality scores

All sections are editable inline by the user after generation, and any section can be exported as a `.docx` file.

---

## 2. Technology Stack & Architecture

### Frontend
- **React 19** (Vite + esbuild tooling)
- **TypeScript** (strict-ish: `skipLibCheck: true`, no strict mode explicitly set)
- **Tailwind CSS 4** (`@tailwindcss/vite` plugin for dev-time compilation)
- **React Router 7** — Nested routes under `/` Layout shell
- **Framer Motion** (`motion/react`) — Page transitions, floating UI elements
- **Lucide React** — Icon library

### Backend (Express)
- **Express 4** — Runs alongside Vite in dev, serves static + API in prod
- **esbuild** — Bundles server.ts → `dist/server.cjs` (CommonJS)
- **Three API endpoints:**
  - `POST /api/generate` — Full treatment generation
  - `POST /api/generate-promo` — Promo strategy generation
  - `POST /api/assistant` — Chat-based treatment modification

### AI Layer
- **@google/genai** (v1.29.0+) — Google's official GenAI SDK
- **Model:** `gemini-3.5-flash` (default), `gemini-3.1-pro-preview` (alternate selectable)
- All calls use `responseMimeType: "application/json"` with strict `responseSchema` objects
- Audio files sent as base64 inline data to Gemini

### Data Persistence
- **localStorage only** — Projects stored as JSON in key `lenscraft_projects`
- Model preference persisted in `lenscraft_model`
- No server-side database, no cloud storage, no authentication

### Build System
```
npm run dev     → tsx server.ts (Vite HMR + Express middleware)
npm run build   → vite build && esbuild server.ts --bundle...
npm run start   → node dist/server.cjs
```

---

## 3. File Structure Map

```
├── index.html              # SPA entry point
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript config (skipLibCheck, alias @/)
├── vite.config.ts          # Vite + TailwindCSS plugin + alias
├── metadata.json           # App metadata ("lescraft ai 2")
├── .env.example            # GEMINI_API_KEY example
├── .gitignore              # node_modules/, dist/, .env*
│
├── src/
│   ├── main.tsx            # React entry (StrictMode wrapper)
│   ├── App.tsx             # Route definitions (8 pages under Layout)
│   ├── context.tsx         # Global state: treatment, projects, model selector
│   ├── types.ts            # TypeScript interfaces (VideoTreatment, Scene, Shot, etc.)
│   ├── index.css           # Only: @import "tailwindcss"
│   │
│   ├── components/
│   │   ├── Layout.tsx      # Header nav, mobile nav, floating chat assistant
│   │   └── ChatAssistant.tsx  # Floating AI chat panel (post-generation)
│   │
│   ├── pages/
│   │   ├── Dashboard.tsx       # Project list (localStorage CRUD), empty state
│   │   ├── Home.tsx            # New project form: audio upload, YouTube URL, lyrics, concept
│   │   ├── Analysis.tsx        # Song analysis display/edit (title, description, theme, rhythm, vibe)
│   │   ├── Script.tsx          # Free-form text editor for script with word count + DOCX export
│   │   ├── Scenes.tsx          # Editable table of scenes with add/remove
│   │   ├── ShotList.tsx        # Technical shot list table with add/remove
│   │   ├── Schedule.tsx        # Production overview + day-by-day schedule cards
│   │   └── Promo.tsx           # Promo strategy generation + version switching + ideas editing
│   │
│   └── utils/
│       └── export.ts           # docx Document builder (all sections, tables for scenes/shots)
│
└── server.ts               # Express server (3 API routes + Vite middleware/static serving)
```

---

## 4. Routes & Navigation

| Route | Component | Shown When | Purpose |
|-------|-----------|------------|---------|
| `/` | Layout > Dashboard | Always (root) | Project list, "Create new" button |
| `/new` | Layout > Home | Always | New project creation form |
| `/analysis` | Layout > Analysis | After generation | View/edit song analysis |
| `/script` | Layout > Script | After generation | View/edit full script |
| `/scenes` | Layout > Scenes | After generation | View/edit scene table |
| `/shotlist` | Layout > ShotList | After generation | View/edit technical shot list |
| `/schedule` | Layout > Schedule | After generation | View/edit shooting schedule + production planning |
| `/promo` | Layout > Promo | After generation | View/edit promo strategy, trigger AI regrowth |

**Nav Logic:**
- Without active treatment: header shows logo + "Nouveau" button → goes to `/new`
- With active treatment: header shows all section tabs + back to dashboard button
- Mobile: horizontal scrolling nav bar below header

---

## 5. Data Model (VideoTreatment)

```typescript
interface VideoTreatment {
  id?: string;                    // crypto.randomUUID()
  createdAt?: number;             // Date.now()
  analysis: {
    title: string;
    description: string;
    theme: string;
    rhythm: string;
    vibe: string;
  };
  script: string;                 // Raw text scenario
  scenes: Array<{
    sceneNumber: number;
    action: string;
    set: string;
    actors: string;
    actionDescription: string;
  }>;
  shotList?: Array<{
    sceneNumber: number | string;
    shotNumber: number | string;
    type: string;
    cameraMovement: string;
    lens: string;
    duration: string;
    description: string;
  }>;
  schedule?: Array<{
    day: number;
    location: string;
    estimatedTime: string;
    scenesToShoot: number[];
    castNeeded: string[];
    equipmentNeeded: string[];
  }>;
  production?: {
    prepDays: number;
    shootDays: number;
    postProdDays: number;
    locationScouting: string;
    rehearsals: string;
    otherPrep: string;
  };
  promoStrategy?: PromoStrategy;
  promoVersions?: PromoStrategy[];
  activePromoVersionId?: string;
}
```

---

## 6. What Currently Exists (Verified Facts)

- ✅ 8 routes defined and rendering
- ✅ 3 backend API endpoints wired to Gemini AI
- ✅ Audio file upload via drag-and-drop (≤20MB, audio/* MIME check)
- ✅ YouTube URL input (parsed but not actually fetched — treated as reference text)
- ✅ LocalStorage project persistence (create, read, update, delete)
- ✅ Inline editing on every page (Analysis, Script, Scenes, ShotList, Schedule, Promo)
- ✅ DOCX export covering all sections via `docx` library
- ✅ AI Chat Assistant (floating widget, modifies treatment via LLM)
- ✅ Model selector dropdown (flash vs pro-preview)
- ✅ Promo multi-version system with switcher
- ✅ Production build succeeds
- ✅ TypeScript compiles clean

---

## 7. What Is Missing or Broken

- ❌ No user authentication or registration
- ❌ No server-side database or cloud persistence
- ❌ No landing page — root path is an internal dashboard
- ❌ No SEO, meta tags, Open Graph tags
- ❌ No rate limiting, CORS headers, or security middleware on Express
- ❌ No error boundaries in React
- ❌ No analytics/tracking
- ❌ No loading/error states for API failures (limited — mostly just console.log)
- ❌ Bundle not code-split (single 810KB vendor chunk)
- ❌ No PDF export option
- ❌ No image/media generation capability (Gemini vision for YouTube thumbnails would be valuable)
- ❌ Environment variables not properly loaded in server.ts (`dotenv` is a dependency but never imported/called)
