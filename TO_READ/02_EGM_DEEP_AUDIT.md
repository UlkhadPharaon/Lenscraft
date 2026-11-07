# EGM Deep Audit

## Methodology Applied

This audit uses the **Elephant-Goldfish Model (EGM)** workflow from `C:/Users/ulric/hermes-plugins/elephant-goldfish-model/`. The following Goldfish personas were evaluated against the LensCraft codebase:

| Persona | File | Focus |
|---------|------|-------|
| **Design Critic** | `design_critic.md` | Architecture, scalability, infrastructure economics, unmitigated risks |
| **Zoom Out** | `zoom_out.md` | High-level simplicity, YAGNI, codebase reuse, anti-complexity |
| **Comprehension** | `comprehension.md` | Naive reader clarity, undefined terms, self-containment |
| **Structural** | `structural.md` | Code organization, coupling, tech debt, maintainability |
| **Style** | `style.md` | API design consistency, naming, error handling patterns |
| **Implementation Readiness** | `implementation_readiness.md` | Migration safety, backward compatibility, rollout risks |
| **Codebase Details** | `codebase_details.md` | Pedantic compliance audit, undocumented edge cases, contradictions |

The **Synthesizer** persona aggregated all findings into this unified report.

---

## Scoring Scorecard (1–10)

### A. Product Quality — 4/10
- ✅ Solves a real creative problem for music artists
- ✅ Comprehensive output dossier is genuinely useful
- ❌ No user identity — can't build a business or retention loop
- ❌ No pricing, no freemium, no conversion path
- ❌ Single-use tool pattern, not a platform
- ⚠️ Target audience exists but has no defined ICP

### B. UX/UI — 7/10
- ✅ Polished dark-mode aesthetic, good visual hierarchy
- ✅ Smooth animations via Framer Motion
- ✅ Responsive layout (mobile nav works)
- ✅ Inline editing on every page saves context switching
- ✅ DOCX export adds real professional value
- ❌ Root route shows internal dashboard, not a landing page
- ❌ No empty/loading/error state variety on routes beyond Home
- ❌ Chat Assistant floating widget competes with nav interactions

### C. Functional Engineering — 5/10
- ✅ TypeScript compiles clean
- ✅ Three well-structured API endpoints with Gemini schemas
- ✅ Error handling covers 429, 503, timeouts (server side)
- ❌ `dotenv` imported as dependency but never used in server.ts
- ❌ No Express middleware security (helmet, CORS, rate-limit)
- ❌ React: zero error boundaries — any render crash kills entire app
- ❌ No loading states in frontend during API calls (only spinner button text)
- ❌ ShotList addShot creates wrong field names (`shotNumber` string vs int, missing `type`, `angle` fields)
- ⚠️ localStorage-only persistence = fragile data model

### D. AI & Automation — 6/10
- ✅ Structured JSON output via Gemini responseSchema enforces typed responses
- ✅ Audio inline data sent to Gemini correctly
- ✅ Multi-model selector (flash/pro)
- ❌ Monolithic prompt sends everything at once — quality degrades for large inputs
- ❌ No prompt versioning, no A/B testing of prompts
- ❌ Assistant endpoint sends treatment as prompt text (not structured), risking schema drift
- ❌ No fallback model if primary fails
- ❌ No token cost estimation or latency monitoring

### E. Commercial Readiness — 2/10
- ❌ Zero conversion funnel
- ❌ No landing page
- ❌ No free/paid tier distinction
- ❌ No email capture, no trial, no demo
- ❌ No social proof, testimonials, or trust signals
- ⚠️ Product itself is compelling enough to have commercial potential if wrapped properly

### F. Production Readiness — 3/10
- ✅ Build pipeline works (vite + esbuild)
- ✅ Static file serving in production mode
- ❌ No `.env` loading (`dotenv` dependency unused)
- ❌ No health check endpoint
- ❌ No environment variable validation at startup
- ❌ No deployment config (no `vercel.json`, no `Dockerfile`)
- ❌ No monitoring, logging, error tracking (Sentry/Datadog)
- ❌ Bundle size warning ignored (810KB vendor chunk)
- ⚠️ Server runs single-threaded Express, no graceful shutdown

---

## Five Most Critical Weaknesses

1. **NO AUTHENTICATION OR USER ACCOUNT SYSTEM** ([context.tsx:24-42](src/context.tsx:24-42)) — Everything is localStorage-bound. No way to identify users, enforce usage limits, charge money, or persist across devices. This is the single biggest blocker to commercial viability.

2. **UNLOADED ENVIRONMENT VARIABLES** ([server.ts:17](server.ts:17) — reads `process.env.GEMINI_API_KEY` directly; [dotenv] listed but never required) — Server reads env vars but never calls `dotenv.config()`. Works locally with manual env set but fails in any deployment that doesn't inject system-level env vars.

3. **FRONTEND ROUTE CODE-SPLITTING ABSENT** ([App.tsx:24-32](src/App.tsx:24-32) — all 8 pages statically imported) — The 810KB bundle includes ALL page code whether the user visits `/analysis` or just `/new`. No lazy imports, no dynamic routing chunks. Every new route requires downloading the full JS.

4. **DATA MODEL INCONSISTENCIES** — [ShotList.tsx:49](src/pages/ShotList.tsx:49) generates shots with fields `{shotNumber, sceneNumber, shotType, angle, movement, action, equipment}` which do NOT match the `Shot` interface in types.ts (`sceneNumber, shotNumber, type, cameraMovement, lens, duration, description`). The saved data shape will silently mismatch the schema.

5. **MONOLITHIC AI GENERATION** ([server.ts:31-144](server.ts:31-144) — one giant prompt generating analysis + script + scenes + shots + schedule + production in a single Gemini call) — While efficient, sending all five sections in one prompt wastes tokens on early-failure sections and prevents independent iteration. Also increases timeout risk on large inputs.

---

## Detailed Findings by Category

### 🔴 BLOCKERS

- **B1:** `dotenv` dependency installed but never imported in `server.ts`. Any deployment without pre-injected GEMINI_API_KEY will serve 500 errors.
- **B2:** ShotList "Add Shot" creates incorrect field mapping vs `Shot` interface. New shots won't serialize to `treatment.shotList` correctly.
- **B3:** No React Error Boundary anywhere. One null-reference in a page component crashes the whole SPA.
- **B4:** App name metadata says `"lescraft ai 2"` instead of `"lenscraft ai"` — typo in `metadata.json:2`.

### 🟡 MAJOR ISSUES

- **M1:** All pages statically imported in `App.tsx` — no code-splitting. Vendor chunk is 810KB.
- **M2:** YouTube URL input accepted but never fetched or parsed — treated as raw text in the prompt.
- **M3:** Promo generation endpoint doesn't send audio data (unlike main generate), wasting an integration opportunity.
- **M4:** No server-side rate limiting. Open to API abuse / Gemini quota exhaustion.
- **M5:** No health check or readiness probe. Monitoring systems can't verify service status.
- **M6:** Vite dev server HMR may be disabled via `DISABLE_HMR` env var but this is an artifact of AI Studio — should be removed for standalone deployment.
- **M7:** Export only produces `.docx`; no PDF option despite the professional nature of the content.

### 🟢 NITS

- **N1:** Title says "LensCraft AI" but metadata.json says "lescraft ai 2" (typo).
- **N2:** Script page word count regex `/\s+/` counts whitespace-separated tokens, not true words. French ligatures or hyphenated words miscounted.
- **N3:** CSS font-family inheritance undefined. Uses Tailwind defaults, but no custom font loaded.
- **N4:** `react-example` name in package.json instead of `lenscraft`.
- **N5:** HTML lang="en" but all UI is in French. Should be `lang="fr"`.
- **N6:** ChatAssistant welcome message hardcoded as French but uses generic greeting — could include the song title dynamically.
