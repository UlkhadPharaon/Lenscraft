# Deployment — LensCraft AI

Environment variables **must** be configured in the Vercel dashboard
(Project → Settings → Environment Variables) before or right after the first deploy.
Never commit the real values: `.env*` is git-ignored, only `.env.example` is tracked.

| Variable | Visibility | Required | Purpose |
|----------|-----------|----------|---------|
| `AI_PROVIDER` | Server | Yes | `gemini` (default) or `openrouter` |
| `GEMINI_API_KEY` | Server | If `AI_PROVIDER=gemini` | Google Gemini API key — the server refuses to boot without it |
| `GEMINI_MODEL` | Server | Optional | Model override for the Gemini path (default `gemini-3.5-flash`) |
| `OPENROUTER_API_KEY` | Server | If `AI_PROVIDER=openrouter` | OpenRouter API key |
| `OPENROUTER_MODEL` | Server | Optional | Default `qwen/qwen3.8-omni-flash` (audio input + structured outputs) |
| `VITE_SUPABASE_URL` | Server + Browser | Yes | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Server + Browser | Yes | Supabase anon key (safe for the browser; RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server | Yes | Bypasses RLS — quota enforcement + Stripe webhooks |
| `STRIPE_SECRET_KEY` | Server | Billing | Stripe checkout sessions |
| `STRIPE_WEBHOOK_SECRET` | Server | Billing | Verifies Stripe webhook signatures |
| `STRIPE_PRICE_PRO` / `STRIPE_PRICE_STUDIO` | Server | Optional | Fixed price IDs; otherwise inline prices are created |
| `STRIPE_CURRENCY` | Server | Billing | Default `xof` (Franc CFA, zero-decimal). `xaf` also works |
| `NEXT_PUBLIC_APP_URL` | Server + Browser | Recommended | Stripe redirects + CORS allow-list (e.g. `https://lenscraft.vercel.app`) |
| `PORT` | Server | Optional | Defaults to 3000 (standalone Node only) |

Without Supabase the app runs in **local mode** (accounts are device-local, projects
stay in the browser). Without Stripe, plans are activated in demo mode.

## Switching AI provider

```bash
# Gemini (default)
AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...

# OpenRouter with Qwen 3.8 Omni Flash (audio input + structured outputs)
AI_PROVIDER=openrouter
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=qwen/qwen3.8-omni-flash
```

Both paths are driven by the same schemas in `server/schemas.ts`, so generation, promo
and the assistant behave identically. The model dropdown in the app header lists the
models of the configured provider automatically (`GET /api/config`).

Note: `qwen/qwen3.7-flash` is **not** a valid substitute — it accepts text/image/video
but not audio, so the song-upload feature would break. Use `qwen/qwen3.8-omni-flash`.

## Bring your own API key (BYOK)

Users can plug **their own** key from the app header (bouton « Clé API ») and run
LensCraft on their own quota. Providers supported and their **audio-capable** models:

| Provider | Key format | Audio models | Live catalogue |
|----------|-----------|--------------|----------------|
| **OpenRouter** | `sk-or-v1-…` | 46 modèles (Qwen 3.8 Omni Flash, Nemotron Omni gratuit, gpt-audio, Gemini Flash, Voxtral, MiMo…) | ✅ public |
| **NVIDIA NIM** | `nvapi-…` | `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning` (gratuit) | ✅ public |
| **OpenAI** | `sk-…` | `gpt-audio`, `gpt-audio-mini` | avec clé |
| **Google Gemini** | `AIza…` | `gemini-3.5/3.7/3.8-flash`, `flash-lite` | avec clé |
| **Anthropic** | `sk-ant-…` | ⚠️ aucun (texte seulement) | avec clé |
| **Groq** | `gsk_…` | ⚠️ aucun | avec clé |

`POST /api/models` returns the catalogue **filtered on audio input + tool calling**,
so nobody can accidentally pick a text-only model for a song analysis.

**Security model**
- the key is stored in the user's browser (`localStorage`) and forwarded inside the
  request body for that single call — never persisted server-side, never logged
- `server/ai.ts` redacts key patterns from any upstream error before returning it
- the `AI_PROVIDER` server-side default is still used when the user has no key

## Billing without Stripe

While `STRIPE_SECRET_KEY` is unset, `POST /api/upgrade` activates a plan immediately
(demo mode) and the choice is stored locally. Once **both** Stripe and Supabase are
configured that endpoint returns `409` and plans can only change through a real Stripe
checkout — payments cannot be bypassed.

## Deploy steps — Cloudflare Pages (primary)

1. Push the repository to GitHub (`UlkhadPharaon/Lenscraft`).

2. Configure environment variables in **Cloudflare Dashboard → Workers & Pages → lenscraft-ai → Environment Variables** (or via `wrangler secret put`):

   | Variable | Type | Required | Purpose |
   |----------|------|----------|---------|
   | `AI_PROVIDER` | env var | Yes | `gemini` (default) or `openrouter` |
   | `GEMINI_API_KEY` | secret | If gemini | Google Gemini API key |
   | `GEMINI_MODEL` | env var | Optional | Model override (`gemini-3.5-flash`) |
   | `OPENROUTER_API_KEY` | secret | If openrouter | OpenRouter API key |
   | `OPENROUTER_MODEL` | env var | Optional | Override (`qwen/qwen3.8-omni-flash`) |
   | `VITE_SUPABASE_URL` | secret | Yes | Supabase project URL |
   | `VITE_SUPABASE_ANON_KEY` | secret | Yes | Supabase anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | secret | Yes | Bypasses RLS |
   | `STRIPE_SECRET_KEY` | secret | Billing | Stripe checkout sessions |
   | `STRIPE_WEBHOOK_SECRET` | secret | Billing | Verifies webhook signatures |
   | `APP_URL` | env var | Recommended | CF Pages URL (e.g. `https://lenscraft-ai.pages.dev`) |
   | `STRIPE_CURRENCY` | env var | Optional | Default `xof` (Franc CFA) |

3. Run `supabase/migrations/001_init.sql` in the Supabase SQL Editor
   (creates `profiles`, `treatments`, RLS policies and the signup trigger).

4. Enable Google + GitHub providers in Supabase → Authentication → Providers,
   and add your CF Pages URL as a redirect URL.

5. Create Stripe products priced in **XOF** ("Pro" 5 000 FCFA, "Studio" 15 000 FCFA),
   then point the webhook at `https://<your-domain>/api/webhook/stripe`.

6. Deploy: `npx wrangler pages deploy dist --branch main`
   Then open `/health` — it must return JSON with `"status": "ok"`.

   > ⚠️ **Timeout note:** Cloudflare Pages Functions on the Free plan have a 15-second
   > execution limit. AI generation calls may exceed this timeout. On the Pro plan
   (> $5/mo), the limit is 30 minutes. Consider using server-sent events or polling
   if you need long-running generations on the Free tier.

## Deploy steps — Vercel (legacy / fallback)

1. Push the repository to GitHub (`UlkhadPharaon/LensCraft`).
2. Import it in Vercel → Framework preset **Vite**.
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
3. Add every environment variable from the table above.
4. Deploy, then open `/health` — it must return JSON with `"status": "ok"`.


## Local run

```bash
cp .env.example .env      # then fill in GEMINI_API_KEY (or switch to OpenRouter)
npm install
npm run dev               # http://localhost:3000 (Vite HMR + Express API)

# production parity
npm run build && npm start
npm run test:all          # 6 suites, ~75 automated checks
```

## Rollback

Vercel keeps the last deployments; use "Promote to production" on the
previous deployment. `api/index.ts` and `server/app.ts` share the same code
path, so a frontend-only rollback never changes API behaviour.
