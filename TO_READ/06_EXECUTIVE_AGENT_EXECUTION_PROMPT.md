# Executive Engineering Agent — Execution Prompt

## CRITICAL INSTRUCTIONS — READ ALL TO_READ FILES FIRST

You are the **Executive Engineering Agent**. Before writing any code, you MUST read every file in `TO_READ/` (00-10) plus `EVIDENCE/`. These contain the complete audit, market strategy, UX design, implementation plan, and handoff details for transforming LensCraft AI into a commercial SaaS product.

After reading all TO_READ files, inspect the actual project at `E:/Ulkhad Empire/Tech Empire/LensCraft`. Compare the current state against the audit findings before starting work. Verify every assumption by reading source files. Do NOT proceed with implementation until you have confirmed the baseline.

---

## MISSION

Transform **LensCraft AI** from a functional prototype into a **production-ready commercial SaaS product**. The application is an AI-powered music video production dossier generator. Current status: working but lacks authentication, cloud storage, landing page, billing, and performance optimization.

Target deployment platform: **Vercel** (Edge Functions for API routes, static + SSR for frontend).

---

## EXECUTION ORDER (Follow Strictly)

### WAVE 1: Foundation (Tasks F1-F5)
Do these first. Nothing else depends on them being broken; everything depends on them being correct.

1. **F1: Rename & Clean Config** — Fix package.json name, metadata.json typo, HTML lang attribute, add SEO meta tags to index.html
2. **F2: Dotenv Integration** — Import `dotenv.config()` in server.ts, validate GEMINI_API_KEY at startup with clear error message
3. **F3: Security Middleware** — Install helmet + cors, add helmet() + CORS middleware to Express, add request logging
4. **F4: Supabase Setup** — Create Supabase project, define tables (profiles, treatments), export URL/anon key, set env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
5. **F5: Supabase Client** — Create `src/lib/supabase.ts` (browser client) and `src/lib/supabase-server.ts` (server client), update context.tsx to use Supabase instead of localStorage

### WAVE 2: Authentication (Tasks A1-A3)
6. **A1: Auth UI Components** — LoginButton, GitHubLoginButton, LogoutButton components matching dark theme
7. **A2: Auth Wrapper** — AuthProvider component wrapping AppProvider, route guard HOC `withAuth`, modify App.tsx structure
8. **A3: Landing Page** — Create `Landing.tsx` with hero, how-it-works, features, pricing preview, CTA sections. Root path `/` shows landing. Dashboard moves behind auth.

### WAVE 3: Core Fixes (Tasks C1-C4)
9. **C1: Cloud Storage Migration** — Replace localStorage CRUD in context.tsx with Supabase API calls. Maintain localStorage as offline cache. Handle optimistic updates.
10. **C2: ShotList Bug Fix** — Fix field mismatch in ShotList.tsx line 49. Change addShot to produce fields matching Shot interface (sceneNumber, shotNumber as numbers, type, cameraMovement, lens, duration, description).
11. **C3: Error Boundaries** — Create ErrorBoundary class component, wrap Layout in it, show graceful error recovery UI.
12. **C4: Loading States** — Create LoadingOverlay component, react-hot-toast for notifications, full-page spinner during API calls, exponential backoff retry.

### WAVE 4: Performance (Tasks P1-P3)
13. **P1: Code Splitting** — Convert all page imports in App.tsx to `React.lazy()` + `Suspense`. Wrap each route's element in Suspense with loading fallback.
14. **P2: Vendor Chunk Optimization** — Add manualChunks config in vite.config.ts splitting vendor, ui, docs chunks.
15. **P3: Font Optimization** — Add Google Fonts preconnect links to index.html head, optionally add favicon.

### WAVE 5: Commercial Features (Tasks M1-M3)
16. **M1: Stripe Integration** — Set up Stripe products, create checkout session endpoint, webhook handler, Pricing page component.
17. **M2: Usage Tracking** — Add generation counter to profiles table, check quota in /api/generate middleware, return 429 when exceeded.
18. **M3: PDF Export** — Install @react-pdf/renderer, create exportPdf utility, add PDF export button alongside DOCX on all exportable pages.

### WAVE 6: Testing & Deployment (Tasks T1-T3)
19. **T1: Smoke Tests** — Create automated test script verifying landing renders, auth redirect, treatment generation, DOCX export.
20. **T2: Vercel Config** — Create vercel.json with correct build/output/rewrite rules. Document required environment variables.
21. **T3: Build Verification** — Run npm run build end-to-end, verify no errors, check bundle sizes meet targets.

---

## PRESERVE EXISTING FUNCTIONALITY

DO NOT BREAK or remove these working features:
- All 6 editable page sections (Analysis, Script, Scenes, ShotList, Schedule, Promo)
- Inline editing on every page
- DOCX export functionality (enhance with PDF, don't replace)
- AI Chat Assistant floating widget
- Model selector dropdown (flash/pro)
- Promo multi-version system
- Audio file upload (drag-and-drop ≤20MB)
- YouTube URL input
- All existing TypeScript interfaces in types.ts (extend, don't break)
- Existing Tailwind CSS styling patterns (dark zinc theme with color-coded accents)
- Mobile horizontal scroll navigation

---

## SPECIFIC IMPLEMENTATION GUIDELINES

### Supabase Schema (Execute Exactly)
```sql
-- profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'studio')),
  generations_count INTEGER DEFAULT 0,
  last_generation_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- treatments table  
CREATE TABLE public.treatments (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data JSONB NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_treatments_user_id ON public.treatments(user_id);
CREATE INDEX idx_treatments_created_at ON public.treatments(created_at DESC);
```

### Environment Variables Required
```
GEMINI_API_KEY=<your-gemini-key>
VITE_SUPABASE_URL=<supabase-project-url>
VITE_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>
STRIPE_SECRET_KEY=<stripe-secret>
STRIPE_WEBHOOK_SECRET=<stripe-webhook-secret>
NEXT_PUBLIC_APP_URL=https://lenscraft.vercel.app
```

### Rate Limiting Logic
```typescript
// In /api/generate and /api/generate-promo endpoints:
const tierLimits = { free: 1, pro: Infinity, studio: Infinity };
const monthlyLimit = tierLimits[profile.subscription_tier] || 1;
if (profile.generations_count >= monthlyLimit && isSameMonth(profile.last_generation_date)) {
  return res.status(429).json({ error: "Limite mensuelle atteinte pour votre plan gratuit." });
}
// On success: increment count, update date
```

### Bundle Size Targets
- Initial JS chunk (Layout shell): < 120KB gzipped
- Per-page lazy chunk: ~50-100KB gzipped
- Total vendor split across chunks (no single chunk > 500KB)

---

## TESTING REQUIREMENTS

Every feature must pass these checks:
1. **TypeScript compiles clean** — `npx tsc --noEmit` returns exit code 0
2. **Production build succeeds** — `npm run build` completes without errors
3. **No console errors** on fresh load of landing page
4. **All editable pages render** without crashes when treatment data exists
5. **DOCX export works** for all sections (unchanged behavior verified)
6. **New PDF export works** for all sections
7. **Auth flow works**: unauthenticated → see landing → click "Try Free" → redirected to login → sign in → see dashboard
8. **Cloud persistence works**: create project → refresh → project still visible
9. **ShotList add-shot produces correct shape** per Shot interface
10. **Error boundary catches** simulated crash and shows recovery UI

---

## DEFINITION OF DONE

The implementation is done when ALL of the following are true:
- [ ] All 6 implementation waves completed
- [ ] `npx tsc --noEmit` passes clean
- [ ] `npm run build` succeeds
- [ ] Production bundle inspected and meets size targets
- [ ] Landing page at root renders correctly
- [ ] Auth flow fully operational (sign up, sign in, logout)
- [ ] Projects persist to Supabase and survive page refresh
- [ ] All original features preserved and tested
- [ ] PDF export added alongside DOCX
- [ ] Stripe checkout + webhook integration functional
- [ ] Generation quotas enforced correctly
- [ ] vercel.json present with correct configuration
- [ ] No regressions in existing page rendering

---

## STOP CONDITION

When ALL phases are complete and verified, produce a final engineering report summarizing:
1. What was implemented
2. File changes made
3. Any blockers or decisions made along the way
4. Remaining recommendations for future work
5. Verified bundle sizes and build output

Then STOP. Do not begin further iterations without explicit direction.
