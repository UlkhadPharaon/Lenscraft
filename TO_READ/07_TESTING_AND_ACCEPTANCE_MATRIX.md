# Testing & Acceptance Matrix — LensCraft AI

## Functional Tests

| ID | Test | Expected Result | Priority |
|----|------|-----------------|----------|
| FT-01 | Generate treatment from lyrics only | Returns analysis, script, scenes, shotList, schedule, production | P0 |
| FT-02 | Generate treatment from audio upload | Same structure, audio analyzed alongside text description | P0 |
| FT-03 | Generate treatment from YouTube URL + concept | Uses URL as context reference in prompt | P0 |
| FT-04 | Edit analysis title inline | Saves via setTreatment, toast shows "Sauvegardé" | P0 |
| FT-05 | Edit script text | Character count and word count update live | P1 |
| FT-06 | Add new scene in Scenes page | Scene added with next number, can edit all fields | P0 |
| FT-07 | Remove a scene | Scene removed from table, saves correctly | P0 |
| FT-08 | Add new shot in ShotList page | Correct field mapping per Shot interface | P0 |
| FT-09 | Generate promo strategy | Returns targetAudience, numberOfVideos, trendsAndIdeas, promoIdeas array | P0 |
| FT-10 | Switch promo versions | Active version changes, editing reflects selected version | P1 |
| FT-11 | Create second project | Projects list shows both, switching loads correct data | P0 |
| FT-12 | Delete project | Removed from list and localStorage | P0 |
| FT-13 | Chat assistant modifies treatment | Treatment updated with AI changes, assistantMessage shown | P1 |

## Regression Tests

| ID | Feature to Verify Unchanged | Verification Method |
|----|---------------------------|-------------------|
| RT-01 | Header navigation works on desktop and mobile | Navigate all tabs manually |
| RT-02 | Model selector updates API calls | Switch model, generate, verify model used in request body |
| RT-03 | DOCX export includes all sections | Export, open .docx, verify all 6 sections present |
| RT-04 | Responsive layout on mobile (<768px) | View on device or devtools, nav scrolls horizontally |
| RT-05 | Dark theme styling consistent | Visual inspection across all pages |
| RT-06 | Error handling on API 429/503 | Simulate quota exceeded, verify French error message |
| RT-07 | Error handling on network failure | Disconnect network, generate, verify error toast |

## UI Tests

| ID | Test | Expected |
|----|------|----------|
| UI-01 | Landing page renders at `/` | Hero headline, CTA buttons, features grid visible |
| UI-02 | Login/signup redirects work | Unauthenticated click → redirect to login → back to intended route |
| UI-03 | Loading overlay appears during API call | Spinner centered on screen, blocks interaction |
| UI-04 | Toast notifications appear on save | Green success toast appears for 2 seconds |
| UI-05 | Error boundary catches crash | Red error card with retry button instead of white-screen |

## Security Checks

| ID | Check | Expected |
|----|-------|----------|
| SC-01 | GEMINI_API_KEY not exposed in frontend | No env var accessible in browser bundle |
| SC-02 | CORS headers restrict origins | Only approved domains can call API |
| SC-03 | Helmet security headers present | Content-Security-Policy, X-Frame-Options, etc. |
| SC-04 | Supabase RLS enabled | Row-level policies restrict access to user's own data |
| SC-05 | No secrets in git history | grep for API keys returns nothing outside .env files |

## Accessibility Requirements

| ID | Requirement | Target |
|----|------------|--------|
| AA-01 | All buttons have accessible labels | aria-label or visible text |
| AA-02 | Keyboard navigation through all pages | Tab order follows visual order |
| AA-03 | Focus indicators visible | Custom focus ring on interactive elements |
| AA-04 | Color contrast meets WCAG AA | Text on zinc-950 background ≥ 4.5:1 ratio |
| AA-05 | Forms have associated labels | `<label htmlFor="...">` matching every input |

## Production Smoke Tests

| ID | Test | Command/Method |
|----|------|---------------|
| SM-01 | Health check endpoint returns 200 | `curl http://localhost:3000/health` |
| SM-02 | Static assets served from dist/ | Check file exists at `/assets/index-*.js` |
| SM-03 | SPA fallback serves index.html | POST to non-API path returns HTML |
| SM-04 | Environment validation fails gracefully | Start without GEMINI_API_KEY → clear error message |
| SM-05 | Build output size within limits | Analyze dist/assets/ sizes after build |
