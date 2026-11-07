# Master Implementation Plan — LensCraft AI

## Target Outcome

LensCraft AI becomes a **commercial SaaS product** with:
- A public landing page at `/` that converts visitors into users
- User authentication (Google + GitHub OAuth) via Supabase
- Cloud-persisted projects accessible across devices
- Route-level code-splitting reducing initial bundle to <150KB
- A freemium billing model with Stripe integration
- Full production deployment to Vercel with HTTPS, domain, monitoring

---

## Phase 1 — Foundation & Infrastructure

### Task F1: Project Renaming & Configuration Cleanup
**Priority:** P0 | **Dependencies:** None
- Change `package.json` name from `"react-example"` to `"lenscraft-ai"`
- Fix metadata.json title from `"lescraft ai 2"` to `"lenscraft ai"`
- Fix index.html lang attribute from `"en"` to `"fr"`
- Add proper SEO `<meta>` tags to index.html (description, OG tags, Twitter cards)
- Define file affected: `package.json`, `metadata.json`, `index.html`

### Task F2: Dotenv Integration in Server
**Priority:** P0 | **Dependencies:** F1
- Import and call `dotenv.config()` at top of `server.ts` before any env access
- Validate `GEMINI_API_KEY` exists on startup; log clear error if missing
- Add runtime validation block:
```typescript
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
  console.error('❌ GEMINI_API_KEY is not set or has placeholder value.');
  process.exit(1);
}
```
- Define file affected: `server.ts` lines 1-4

### Task F3: Express Security Middleware
**Priority:** P0 | **Dependencies:** F2
- Install `helmet` and `cors` packages
- Add `helmet()` middleware to server.ts before API routes
- Configure CORS with allowed origin from `NEXT_PUBLIC_APP_URL` env var
- Add basic request logging middleware
- Define file affected: `server.ts` after imports

### Task F4: Database Setup (Supabase)
**Priority:** P0 | **Dependencies:** None
- Create new Supabase project `lenscraft-ai`
- Create tables:
  - `profiles` — id (UUID, PK, refs auth.users), email, full_name, avatar_url, subscription_tier (enum: free/pro/studio), created_at
  - `treatments` — id (UUID, PK), user_id (FK → profiles.id), data (JSONB), version (integer), created_at, updated_at
  - Indexes on `treatments(user_id)`, `profiles(id)`
- Export Supabase URL and anon key for `.env` setup
- Environment variables needed: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server only)

### Task F5: Supabase Client Setup
**Priority:** P0 | **Dependencies:** F4
- Install `@supabase/supabase-js`
- Create `src/lib/supabase.ts` — browser client using env vars
- Create `src/lib/supabase-server.ts` — server client using service role key
- Update `src/context.tsx` to accept user session from context provider rather than localStorage
- Define file affected: `src/lib/supabase.ts`, `src/lib/supabase-server.ts` (new), `src/context.tsx`

---

## Phase 2 — Authentication System

### Task A1: Auth Provider UI Components
**Priority:** P0 | **Dependencies:** F5
- Create `src/components/auth/LoginButton.tsx` — Google sign-in button
- Create `src/components/auth/GitHubLoginButton.tsx` — GitHub sign-in button
- Create `src/components/auth/LogoutButton.tsx`
- Use Supabase Auth UI patterns or build custom branded buttons matching dark theme
- Define files affected: new components in `src/components/auth/`

### Task A2: Auth Wrapper & Protected Routes
**Priority:** P0 | **Dependencies:** A1
- Create `src/components/auth/AuthProvider.tsx` — wraps AppProvider, provides session + user state
- Modify `App.tsx` to wrap all routes in AuthProvider
- Create route guard HOC: `withAuth(Component)` — redirects to `/login` if unauthenticated
- Apply `withAuth` to all `/app/*` pages (Dashboard, Home, Analysis, etc.)
- Root path `/` should show landing page even when unauthenticated
- Define file affected: `src/App.tsx` (new structure), `src/components/auth/`

### Task A3: Landing Page Shell
**Priority:** P1 | **Dependencies:** A2
- Create `src/pages/Landing.tsx` — the new root landing page (see 04_UX_UI_AND_LANDING_PAGE.md for structure)
- Sections: Hero, How It Works, Feature Showcase, Preview/Demo teaser, Pricing preview, CTA, Footer
- "Try Free" button links to `/app/new` (redirects to login if no session)
- "See Demo" button opens an inline modal with a stripped-down generation form
- "Login" / "Sign Up" buttons in header
- Keep existing Dashboard as `src/pages/DashboardClient.tsx` behind auth
- Define file affected: new `src/pages/Landing.tsx`, modified `src/App.tsx`

---

## Phase 3 — Core Functional Improvements

### Task C1: Cloud-Persistent Project Storage
**Priority:** P0 | **Dependencies:** F5, A2
- Replace `localStorage.getItem/setItem` in `src/context.tsx` with Supabase API calls
- On load: fetch `treatments WHERE user_id = current_user ORDER BY created_at DESC LIMIT 20`
- On save/upsert: `supabase.from('treatments').upsert({ user_id, id, data, version })`
- On delete: `supabase.from('treatments').delete().eq('id', projectId).eq('user_id', current_user)`
- Maintain localStorage as offline cache with auto-sync
- Handle optimistic updates with loading spinners during sync
- Define file affected: `src/context.tsx` (major refactor), `src/types.ts` add userId field

### Task C2: Fix ShotList Field Mismatch
**Priority:** P0 | **Dependencies:** None
- In `src/pages/ShotList.tsx` line 49, the `addShot` function creates wrong fields. Fix to match `Shot` interface:
```typescript
// FROM:
{ shotNumber: newShotNumber.toString(), sceneNumber: '', shotType: '', angle: '', movement: '', action: '', equipment: '' }
// TO:
{ sceneNumber: 1, shotNumber: newShotNumber, type: '', cameraMovement: '', lens: '', duration: '', description: '' }
```
- Also fix: `sceneNumber` and `shotNumber` should be numbers not strings per the interface
- Define file affected: `src/pages/ShotList.tsx` line 48-58

### Task C3: Frontend Error Boundaries
**Priority:** P0 | **Dependencies:** None
- Create `src/components/ErrorBoundary.tsx` — class component wrapping children with error state
- Wrap Layout component in ErrorBoundary
- Show graceful error state with "Something went wrong" message and retry button
- Log errors to console (future: Sentry integration)
- Define file affected: new `src/components/ErrorBoundary.tsx`, modified `src/App.tsx`

### Task C4: Loading States & API Retry Logic
**Priority:** P1 | **Dependencies:** C3
- Add loading overlay component `src/components/LoadingOverlay.tsx`
- In every page that calls APIs (`Home.tsx`, `Promo.tsx`, `ChatAssistant.tsx`):
  - Show full-page spinner with message during API call
  - Implement exponential backoff retry (max 3 attempts) for 429/503 errors
  - Show toast notification on success/failure
- Add react-hot-toast package for toast notifications
- Define files affected: `src/components/LoadingOverlay.tsx` (new), `src/components/ToastContainer.tsx` (new), `Home.tsx`, `Promo.tsx`, `ChatAssistant.tsx`

---

## Phase 4 — Performance Optimization

### Task P1: Route Code-Splitting
**Priority:** P0 | **Dependencies:** None
- Replace all static imports in `src/App.tsx` with dynamic `lazy()` imports:
```typescript
import { lazy, Suspense } from 'react';
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Home = lazy(() => import('./pages/Home'));
// ... repeat for all 8 pages
```
- Wrap each `<Route element={<Suspense fallback={<LoadingSpinner />}>...</Suspense>}>`
- This splits the 810KB bundle into ~8 chunks of ~100KB each
- Initial download will be just the Layout shell (~50KB + shared deps)
- Define file affected: `src/App.tsx` (major refactor)

### Task P2: Vendor Chunk Optimization
**Priority:** P1 | **Dependencies:** P1
- In `vite.config.ts`, add manual chunk splitting:
```typescript
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom', 'react-router-dom'],
        ui: ['motion/react', 'lucide-react', 'file-saver'],
        docs: ['docx'],
      }
    }
  }
}
```
- This isolates React core from the heavy docx library
- Expected result: initial chunk < 120KB gzipped
- Define file affected: `vite.config.ts`

### Task P3: Image & Font Optimization
**Priority:** P2 | **Dependencies:** None
- Add Google Fonts Inter + Space Grotesk via preconnect link in index.html head
- Add `<link rel="preconnect" href="https://fonts.googleapis.com">`
- Optionally add favicon.ico
- Define file affected: `index.html`

---

## Phase 5 — Commercial Features

### Task M1: Stripe Integration
**Priority:** P1 | **Dependencies:** A2 (auth working)
- Set up Stripe account + create products:
  - "Pro Monthly" — $9.99
  - "Studio Monthly" — $29.99
- Install `stripe` package on server
- Create server endpoint `POST /api/create-checkout-session`:
  - Takes `tier` ('pro' or 'studio')
  - Creates Stripe Checkout session with return URL
  - Returns checkout URL to frontend
- Create webhook handler `POST /api/webhook/stripe` to handle payment events:
  - `checkout.session.completed` → update profile.subscription_tier
  - `customer.subscription.updated` → update tier or cancel
- Create frontend component `src/components/Pricing.tsx` with interactive pricing cards
- Define files affected: new `src/components/Pricing.tsx`, modified `server.ts` (new endpoints), `src/pages/Pricing.tsx` (new)

### Task M2: Usage Tracking & Rate Limits
**Priority:** P1 | **Dependencies:** C1 (cloud storage)
- Track `generations_count` and `last_generation_date` in Supabase `profiles` table
- On `/api/generate` request: check `profiles.generations_count < limit_by_tier[tier]`
- Increment count on successful generation
- Free tier: 1/month, Pro: unlimited, Studio: unlimited + priority models
- Return 429 with clear message when quota exceeded
- Define file affected: Supabase schema (new columns), `server.ts` (middleware check)

### Task M3: Export PDF Support
**Priority:** P2 | **Dependencies:** None
- Install `@react-pdf/renderer` package
- Create `src/utils/exportPdf.ts` — generates PDF treatment dossier
- Use existing DOCX export logic as source but format for PDF page layout
- Add "Export .pdf" button alongside DOCX button on Script, Scenes, Schedule, Promo pages
- Each page's export button gets two options (DOCX + PDF) or a dropdown selector
- Define files affected: `src/utils/exportPdf.ts` (new), `Script.tsx`, `Scenes.tsx`, `Schedule.tsx`, `Promo.tsx`

---

## Phase 6 — Testing, Monitoring & Deployment

### Task T1: Smoke Tests
**Priority:** P1 | **Dependencies:** All earlier phases complete
- Create `tests/smoke.test.ts` with Playwright or simple Node script:
  1. Start dev server
  2. Navigate to `/` → verify landing page renders
  3. Navigate to `/app` → verify auth redirect if unauthenticated
  4. Generate one treatment → verify all 6 sections render without error
  5. Click DOCX export → verify file downloads
- If Playwright available: full E2E suite
- If not: simple curl-based smoke test
- Define file affected: new `tests/smoke.test.ts`

### Task T2: Vercel Deployment Config
**Priority:** P1 | **Dependencies:** Build pipeline verified
- Create `vercel.json` configuration:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/server.cjs" }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```
- Or alternatively use Vercel Edge Functions for API routes
- Ensure environment variables are configured in Vercel dashboard:
  - `GEMINI_API_KEY`
  - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Define file affected: new `vercel.json`

### Task T3: Production Build Verification
**Priority:** P1 | **Dependencies:** All phases
- Run `npm run build` and verify:
  - No TypeScript errors
  - Vite build completes without warnings (or expected warnings documented)
  - esbuild bundles server successfully
  - `dist/index.html` loads correctly in fresh Node environment
  - `dist/server.cjs` starts and responds to health check requests
- Verify bundle sizes post-code-splitting
- Define file affected: verification step, no file changes

---

## Dependencies Map

```
F1 ─→ F2 ─→ F3 ─┐
                  ├── F4 ─→ F5 ─→ C1
A1 ──→ A2 ────→ A3 (Landing)
F1 ─────────────────────→ T2 (Vercel)
C1 ──→ T1 (Smoke Tests) ──→ T3 (Build Verify)
P1 ──→ P2 (Chunk Optimize)
M2 (Usage tracking) requires C1 + A2
M1 (Stripe) requires A2 + M2
```

---

## Acceptance Criteria by Phase

### Phase 1 Complete When:
- [ ] Package renamed, metadata fixed, HTML lang corrected
- [ ] `dotenv.config()` called in server.ts, GEMINI_API_KEY validated
- [ ] Helmet + CORS middleware active
- [ ] Supabase project created with tables defined above
- [ ] Browser and server Supabase clients operational

### Phase 2 Complete When:
- [ ] Users can sign in via Google or GitHub
- [ ] Unauthenticated users see landing page; authenticated users see dashboard
- [ ] Login/signup pages exist with branded UI
- [ ] Landing page renders with hero, features, how-it-works, CTA

### Phase 3 Complete When:
- [ ] Projects persist to Supabase (not just localStorage)
- [ ] ShotList "Add Shot" produces correct field structure
- [ ] Error boundary catches crashes and shows recovery UI
- [ ] Loading overlays appear during all API calls
- [ ] Toast notifications on success/failure

### Phase 4 Complete When:
- [ ] Each page loads on demand (lazy import)
- [ ] Initial JS bundle < 150KB gzipped (verified in dev tools)
- [ ] Google Fonts loaded with preconnect hints

### Phase 5 Complete When:
- [ ] Stripe checkout flow works end-to-end
- [ ] Payment webhooks update user subscription tier
- [ ] Pricing page exists with interactive comparison table
- [ ] Generation quotas enforced based on tier
- [ ] PDF export available alongside DOCX

### Phase 6 Complete When:
- [ ] Smoke tests pass on local dev server
- [ ] vercel.json present and build config correct
- [ ] Production build runs clean with no errors
- [ ] Bundle size targets achieved
