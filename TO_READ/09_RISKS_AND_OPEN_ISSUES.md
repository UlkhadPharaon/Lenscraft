# Risks & Open Issues — LensCraft AI

## Known Limitations

### R-01: No YouTube URL Video Parsing
**Severity:** Medium | **Status:** Documented, not fixed in current version
The YouTube URL input is accepted but the URL is only passed as raw text to Gemini. The app does NOT fetch or parse YouTube video metadata (title, duration, description, thumbnail). This means the model must infer the song content from a URL string it cannot access.
**Impact:** Users who paste YouTube links get no benefit from them beyond text context matching.
**Future fix:** Use `ytdl-core` or server-side proxy to extract video metadata before sending to Gemini.

### R-02: Audio Processing Limited to Client-Side Base64
**Severity:** Low | **Status:** Working limitation
Audio files are converted to base64 on the client and sent inline to Gemini. This works for files ≤20MB but:
- Large files exhaust memory before upload
- No audio analysis metadata extracted ( BPM, key, duration, loudness)
- No waveform visualization for user feedback
**Impact:** Works fine for typical single-track MP3/WAV files under 20MB. Fails silently for larger files.

### R-03: No Prompt Quality Guarantees
**Severity:** Medium | **Status:** Working limitation
Gemini generates content based on a single monolithic prompt. Response quality varies significantly:
- Short lyrics → detailed output
- Long lyrics + audio file → truncated or rushed sections
- Complex multi-section requests → inconsistent depth per section
**Impact:** User experience varies by input complexity. No way to enforce minimum quality per section.

### R-04: Model Version References May Be Stale
**Severity:** Low | **Status:** Informational risk
The code references `gemini-3.5-flash` and `gemini-3.1-pro-preview`. These model names may change with Google's release cycle. The `@google/genai` SDK abstracts model naming to some degree, but hardcoded strings in the model selector dropdown will need periodic review.
**Impact:** UI may show deprecated model names; actual API calls may still work via SDK routing.

## Missing Credentials / Unavailable Integrations

| Integration | Status | Blocker? |
|------------|--------|----------|
| GEMINI_API_KEY | Available at runtime but never validated in code | Partially |
| Supabase | Requires manual setup (account creation, project creation) | Yes — required for auth/cloud storage |
| Stripe | Requires account creation + product setup | Yes — required for billing |
| Sentry | Not configured | No — can be added later |
| Analytics | Not configured | No — can be added later |
| Custom Domain | Not purchased | No — Vercel subdomain works initially |

## External Dependencies

| Dependency | Version | Risk Level | Notes |
|-----------|---------|-----------|-------|
| @google/genai | ^1.29.0 | High | Primary AI provider. If Gemini API changes pricing or deprecates models, major rewrite needed |
| react | ^19.0.1 | Low | Stable React 19.x releases unlikely to break |
| express | ^4.21.2 | Low | Mature, stable Express |
| docx | ^9.6.1 | Low | DOCX library well-maintained |
| supabase-js | Future install | Unknown | New dependency, track security advisories |
| stripe | Future install | Unknown | New dependency, track security advisories |
| helmet | Future install | Unknown | Security middleware, low risk |
| @react-pdf/renderer | Future install | Medium | PDF generation, may have SSR compatibility issues |

## Decisions Requiring Human Input

1. **Pricing tier amounts** — Plan suggests $9.99 Pro / $29.99 Studio. Owner should validate against market rates in Francophone markets.
2. **Custom domain name** — Should we buy lenscraft.ai, getlenscraft.com, or another domain?
3. **Authentication providers** — Plan includes Google + GitHub. Owner may want to add Twitter/X login for creator audience.
4. **Geographic targeting** — Current plan targets Francophone Africa. Should we expand to English-speaking Africa first? Different prompt language?
5. **Business entity** — Individual vs company registration for Stripe payouts. Depends on owner's location/tax situation.
6. **Data residency** — Supabase servers default to US/EU. African artists may prefer data stored closer to home (not currently an option with Supabase).
