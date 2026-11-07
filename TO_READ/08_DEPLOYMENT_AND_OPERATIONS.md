# Deployment & Operations — LensCraft AI

## Infrastructure Requirements

### Hosting: Vercel
- **Why Vercel:** Native Next.js/Vite compatibility, Edge Functions for API routes, automatic HTTPS, global CDN, zero-config deployments
- **Alternative:** Cloudflare Pages + Workers (if preferring non-Vercel)

### Database: Supabase (PostgreSQL)
- Free tier sufficient for initial stage (500MB storage, 2GB bandwidth/month)
- Real-time subscriptions available if adding collaborative features later
- Automatic backups enabled on paid plans ($25/mo)

### Storage: Supabase Storage / AWS S3
- Currently no file upload persistence needed (audio processed in-memory via base64)
- Future: store generated DOCX/PDF files in bucket per user

## Environment Variables by Name

| Variable | Purpose | Set In | Required? |
|----------|---------|--------|-----------|
| `GEMINI_API_KEY` | Google Gemini AI API key | Vercel → Environment Variables | ✅ Yes |
| `VITE_SUPABASE_URL` | Supabase project URL | Vercel + vite.config.ts | ✅ Yes |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) | Vercel | ✅ Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-only) | Vercel | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe API secret key | Vercel | During billing phase |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook verification | Vercel | During billing phase |
| `NEXT_PUBLIC_APP_URL` | Application base URL | Vercel | Recommended |

**Never commit** `.env` files to git. The `.gitignore` already excludes `*.env*`.

## Vercel Deployment Configuration

### vercel.json
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/server.cjs"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    },
    {
      "source": "/(.*))",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

### Vercel Dashboard Setup Steps
1. Import repository from GitHub (`UlkhadPharaon/LensCraft`)
2. Configure environment variables from table above
3. Set framework preset to "Vite" or "Other"
4. Build command: `npm run build`
5. Output directory: `dist`
6. Install command: `npm install --legacy-peer-deps` (if peer dependency issues)

## Domain Configuration
- Primary domain: `lenscraft.vercel.app` (default)
- Custom domain: `lenscraft.ai` or `getlenscraft.com` (pending purchase)
- Redirect all HTTP → HTTPS automatically via Vercel

## Database Migration Instructions
1. Run SQL commands from `05_MASTER_IMPLEMENTATION_PLAN.md` Task F4 section in Supabase SQL Editor
2. Enable Row-Level Security (RLS) on both tables
3. Create policies:
   ```sql
   -- profiles: users can read/update own profile
   CREATE POLICY "Users manage own profile" ON public.profiles
     FOR ALL USING (auth.uid() = id);
   
   -- treatments: users can CRUD own treatments
   CREATE POLICY "Users manage own treatments" ON public.treatments
     FOR ALL USING (auth.uid() = user_id);
   ```
4. Test with Supabase client library before frontend integration

## Monitoring & Error Tracking
- **Initial:** Console logging + basic error boundary catches
- **Phase 7+:** Integrate Sentry for frontend error tracking
  - Install `@sentry/react` + `@sentry/node`
  - Configure DSN from env var
  - Wrap API calls with transaction tracing
- **Vercel Analytics:** Enable Vercel Web Vitals dashboard for performance monitoring
- **Logtail/Upstash:** Optional server log aggregation

## Backup Strategy
- **Supabase:** Automatic daily backups on Pro plan ($25/mo)
- **Manual:** Export JSON dumps of treatments table weekly via CLI
```bash
supabase db dump -f backup_$(date +%Y%m%d).sql
```

## Rollback Strategy
1. Vercel retains last 10 deployments with one-click rollback
2. Keep deployment history accessible at `vercel.com/<project>/deployments`
3. If database schema change breaks things: revert migration + restore from backup SQL
4. Never deploy untested changes to production branch

## Post-Deployment Verification Checklist
- [ ] Landing page loads with correct meta tags
- [ ] API endpoints respond (test `/api/generate` with POST request)
- [ ] Health check returns 200
- [ ] Static assets have cache headers
- [ ] No console errors in browser DevTools
- [ ] CORS properly configured for origin
- [ ] Environment variables verified (no placeholder values)
- [ ] SSL certificate active (HTTPS enforced)
- [ ] Bundle sizes measured and acceptable
