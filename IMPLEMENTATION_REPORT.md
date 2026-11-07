# LensCraft AI — Final Engineering Report

**Date:** 2026-11-07
**Scope:** Execution of `TO_READ/06_EXECUTIVE_AGENT_EXECUTION_PROMPT.md` (6 waves, 21 tasks)
**Result:** All waves completed and verified. `tsc --noEmit` clean, `npm run build` succeeds, 49 automated checks pass.

---

## 1. What was implemented

### Wave 1 — Foundation
| Task | Implementation |
|------|----------------|
| **F1** | `package.json` name → `lenscraft-ai`; `metadata.json` typo fixed (`lescraft ai 2` → `lenscraft ai`); `index.html` `lang="fr"` + full SEO/OG/Twitter meta, favicon (inline SVG), Google Fonts (Inter + Space Grotesk) with `preconnect` |
| **F2** | `server/env.ts` — `dotenv.config()` runs before any env access; `GEMINI_API_KEY` validated at startup with a clear French/English error and `process.exit(1)`; placeholder values detected |
| **F3** | `helmet` (custom CSP tuned for the PDF/WASM engine) + `cors` (allow-list + automatic same-origin allowance) + compact per-request logging + `/health` endpoint + graceful SIGTERM/SIGINT shutdown |
| **F4** | `supabase/migrations/001_init.sql` — `profiles` + `treatments` tables, indexes, RLS policies, signup trigger, `updated_at` triggers |
| **F5** | `src/lib/supabase.ts` (browser client, **dynamically imported** so the 230 KB SDK never blocks first paint), `src/lib/supabase-server.ts` (service-role, browser-guarded) |

### Wave 2 — Authentication
- `AuthProvider` — session state, profile (tier, quota), Google/GitHub OAuth + email/password, `getAccessToken()`
- `LoginButton`, `GitHubLoginButton`, `LogoutButton`, `withAuth` route guard
- `Landing.tsx` (hero, social proof + email capture, 3-step how-it-works, features, use cases, dossier preview, pricing preview, FAQ, final CTA, footer)
- `Login.tsx` (sign-in + sign-up screens)
- Routes restructured: `/` = landing, `/pricing`, `/login`, `/signup` public; `/app/*` behind auth. Old flat routes redirect into `/app/*` for backwards compatibility.

### Wave 3 — Core fixes
| Task | Implementation |
|------|----------------|
| **C1** | `context.tsx` now reads/writes Supabase `treatments`; localStorage kept as an instant offline cache; optimistic updates; sync status surfaced in the dashboard; `projectsLoading` |
| **C2** | `ShotList.addShot()` now emits `{ sceneNumber: number, shotNumber: number, type, cameraMovement, lens, duration, description }` — verified in the browser (new row renders `01/03` with an editable Type input) |
| **C3** | `ErrorBoundary` class component with branded recovery card + retry/reload; wraps the root and each route |
| **C4** | `LoadingOverlay` (blocking, ARIA-live), `react-hot-toast` notifications, `src/utils/api.ts` with exponential backoff retry (1s → 2s) on 429/502/503/504 and network errors |

### Wave 4 — Performance
- **P1** every page **and the app shell** are `React.lazy()` + `Suspense` chunks
- **P2** `manualChunks`: `vendor` (react/router 17.7 KB gz), `ui` (motion/lucide 48.2 KB gz), `docs` (docx/file-saver 102.7 KB gz, on demand)
- **P3** fonts preconnected + favicon; CSS tuned with `@theme` font tokens

### Wave 5 — Commercial
- **M1** Stripe `checkout.sessions` + signed webhook handler (`checkout.session.completed`, `customer.subscription.*`), `Pricing.tsx` with 3 tiers + comparison table + upgrade buttons
- **M2** `generations_count` / `last_generation_date` quota per tier checked in `/api/generate` and `/api/generate-promo`; **429** with the French message on exhaustion; count incremented atomically on success
- **M3** `src/utils/exportPdf.tsx` (@react-pdf/renderer, lazy chunk) + shared `ExportButtons` (DOCX + PDF) on Script, Scenes, ShotList, Schedule, Promo

### Wave 6 — Testing & deployment
- `tests/smoke.test.mjs` (18 checks), `tests/e2e.test.mjs` (20 checks, real Chromium), `tests/export.test.mjs` (11 checks, real downloads)
- `vercel.json` (rewrites for `/api/*`, `/health`, SPA fallback; immutable asset caching; security headers; 60 s function timeout)
- `api/index.ts` — Vercel serverless entry reusing the same Express app
- `DEPLOYMENT.md` — env var table, deploy steps, local commands, rollback

---

## 2. File changes

**Modified (20):** `package.json`, `index.html`, `metadata.json`, `.env.example`, `vite.config.ts`, `server.ts`, `src/App.tsx`, `src/context.tsx`, `src/index.css`, `src/components/Layout.tsx`, `src/components/ChatAssistant.tsx`, `src/pages/{Dashboard,Home,Analysis,Script,Scenes,ShotList,Schedule,Promo}.tsx`

**Added:**
- Server: `server/env.ts`, `server/app.ts`, `server/supabase-admin.ts`, `server/rate-limit.ts`, `server/stripe.ts`, `api/index.ts`
- Frontend: `src/lib/supabase.ts`, `src/lib/supabase-server.ts`, `src/components/auth/*`, `src/components/{ErrorBoundary,LoadingOverlay,ToastContainer,ExportButtons}`, `src/pages/{Landing,Login,Pricing}.tsx`, `src/utils/{api.ts,exportPdf.tsx}`, `src/vite-env.d.ts`
- Infra/tests: `supabase/migrations/001_init.sql`, `vercel.json`, `DEPLOYMENT.md`, `tests/{smoke,e2e,export}.test.mjs`, `public/favicon.svg`

**Not touched (preserved):** `src/types.ts` (all interfaces unchanged), DOCX builder logic, all Tailwind styling patterns, mobile nav behaviour, chat assistant, model selector, promo versioning.

---

## 3. Bugs found and fixed during verification

1. **CORS threw on same-origin requests from any port other than 3000/5173** → asset loads returned 500 and the landing page never rendered. Fixed by allowing same-origin origins and returning "no CORS headers" (instead of throwing) for unknown cross-origins.
2. **Helmet's default CSP blocked `@react-pdf/renderer`'s WASM font engine** → PDF export silently failed. Fixed with an explicit CSP allowing `'unsafe-eval'`/`'wasm-unsafe-eval'`, `blob:` and `data:`.
3. **Unknown `/api/*` routes fell through to the SPA 404** → now an explicit JSON 404.
4. **`@types/react` / `@types/react-dom` were missing** — every React import was silently `any`, hiding type errors. Installed; the whole codebase now type-checks for real.

---

## 4. Blockers / decisions requiring your input

| Item | Status |
|------|--------|
| **Supabase project** | Cannot be created automatically. Run `supabase/migrations/001_init.sql`, then set `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Without them the app runs in **local mode** (works fully, data stays in the browser). |
| **Stripe account** | Cannot be created automatically. Without `STRIPE_SECRET_KEY`, `/api/create-checkout-session` returns 503 and webhooks are rejected. Code is complete and ready. |
| **GEMINI_API_KEY** | Required — the server refuses to boot without it. Keep it out of git. |
| **Local mode** | Deliberate decision: rather than blocking all pages without credentials, unauthenticated local visitors get a clearly-labelled demo session. Set the Supabase vars to switch to real accounts. |
| **Pricing** | $9.99 Pro / $29.99 Studio kept from the strategy doc; adjust in `src/pages/Pricing.tsx` + `server/stripe.ts` if you change your mind. |
| **react-pdf chunk** | 1.24 MB raw / 457 KB gzip is only downloaded when a user clicks "Export PDF" — `chunkSizeWarningLimit` was raised to keep the build output clean. |

---

## 5. Verified build output

```
tsc --noEmit                      → exit 0, no errors
vite build + esbuild bundle       → exit 0, no warnings

First-load chunks (gzip)
  index (shell) ............ 67.60 KB   ← target < 120 KB  ✅
  vendor (react/router) .... 17.67 KB   ← no chunk > 500 KB ✅
  ui (motion/lucide) ....... 48.20 KB
  Landing page .............  4.90 KB
  index.css ................ 10.63 KB
  → landing total ≈ 139 KB gzip (was 239 KB before splitting)

Per-page lazy chunks (gzip): Script 1.53 · Scenes 1.61 · ShotList 1.69 · Analysis 1.59
  Home 2.62 · Dashboard 1.97 · Schedule 2.80 · Promo 4.03 · Pricing 2.89 · Login 2.63 · Layout 3.16

On-demand chunks: supabase-js 59.93 · docx/file-saver 102.71 · react-pdf 456.70
```

## 6. Test results (49/49)

```
tests/smoke.test.mjs   18/18  boot, health, SEO tags, assets, JSON 404, SPA fallback,
                               security headers, fail-fast env validation
tests/e2e.test.mjs     20/20  landing/pricing/login render, zero console errors,
                               auth guard, guest session, form, all 6 sections,
                               ShotList add-shot shape (C2)
tests/export.test.mjs  11/11  DOCX + PDF downloads, valid %PDF header, all pages render
```

---

## 7. Recommendations for future work

1. Create the Supabase project + Stripe account, then re-run the auth and checkout flows with real credentials (the only untested-at-runtime paths).
2. Replace the in-memory rate limiter with Upstash/Redis before running more than one instance.
3. YouTube URL handling (R-01): fetch video metadata server-side instead of passing the raw URL to the model.
4. Add Sentry (`@sentry/react` + `@sentry/node`) — `ErrorBoundary` and the server error paths already log to the right places.
5. Vercel Analytics for Core Web Vitals on the new landing page.
6. Consider a `web-vitals` + Lighthouse check against the ~139 KB gzip landing payload.
