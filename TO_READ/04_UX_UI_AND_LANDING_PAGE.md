# UX/UI Strategy & Landing Page Design — LensCraft AI

## Design Direction

### Design System Principles
1. **Dark Cinematic** — Maintain the existing `zinc-950` dark background as it matches the creative/film aesthetic
2. **Accent Color Coding** — Each production section uses a unique accent color:
   - Analysis: Indigo (`indigo-400`)
   - Script: Amber/Rose gradient
   - Scenes: Rose (`rose-400`)
   - Shot List: Purple (`purple-400`)
   - Schedule: Amber (`amber-400`)
   - Promo: Pink/Orange gradient
3. **Professional Polish** — Consistent card-based layouts, subtle borders (`border-zinc-800`), backdrop blur headers
4. **Mobile-First Navigation** — Horizontal scroll nav that works on all screen sizes

### Typography (Recommended Addition)
Current app has no custom font. Add **Inter** (Google Fonts) for body text with **Space Grotesk** for headings to reinforce the creative/tech identity.

```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap');
body { font-family: 'Inter', sans-serif; }
h1, h2, h3 { font-family: 'Space Grotesk', sans-serif; }
```

## Page Architecture Redesign

### Current Routes → New Routes

| Old Route | Purpose | New Role |
|-----------|---------|----------|
| `/` → Dashboard | Project list | **NEW:** Commercial Landing Page |
| `/new` → Home | Create project form | `/app/new` — Behind auth wall |
| `/analysis` | View/edit analysis | `/app/[id]/analysis` — Inside project |
| `/script` | View/edit script | `/app/[id]/script` — Inside project |
| `/scenes` | Scene table | `/app/[id]/scenes` — Inside project |
| `/shotlist` | Shot list | `/app/[id]/shotlist` — Inside project |
| `/schedule` | Shooting schedule | `/app/[id]/schedule` — Inside project |
| `/promo` | Promo strategy | `/app/[id]/promo` — Inside project |

### New Routes to Add
- `/app` — Dashboard (behind auth)
- `/app/new` — New project wizard
- `/app/[id]` — Project home / quick actions
- `/pricing` — Pricing page
- `/login` — Authentication
- `/signup` — Registration
- `/demo` — Interactive product demo (no account needed)

## Landing Page Structure (Conversion-Focused)

### Hero Section
```
Headline: "Votre dossier de production musical en 5 minutes"
Subheadline: "Générez des scénarios, listes de plans, plannings de tournage et stratégies promo depuis votre musique."
Primary CTA: "Essayer gratuitement" → /app/new (open form)
Secondary CTA: "Voir une démo" → /demo
Background: Dark gradient with subtle animated film grain or waveform visualization
```

### Social Proof Bar
```
"Bientôt disponible" + Email capture input + "Me notifier" button
OR (with beta users): "Déjà utilisé par 500+ artistes"
```

### How It Works (3 Steps)
```
1. Uploadez votre musique ou décrivez votre concept
2. L'IA analyse votre son et génère un dossier complet
3. Exportez votre traitement prêt pour le tournage
Icons: Upload → Sparkles → Download
```

### Feature Showcase
Grid of 4 cards:
- 🎬 Script détaillé — Scénario professionnel avec directions de mise en scène
- 📋 Découpage technique — Liste de plans caméra professionnelle
- 📅 Planning optimisé — Jours de tournage organisés par lieu et casting
- 📱 Stratégie promo — Concepts viraux pour TikTok, Reels et Shorts

### Interactive Demo
Embedded mini-version of the app where visitors can paste lyrics or upload a short audio clip and see a preview of generated analysis (limited to 3 fields).

### Use Cases
- Artistes indépendants qui veulent pitchter leur clip
- Réalisateurs qui préparent des dossiers clients
- Écoles de cinéma qui enseignent la pré-production

### Pricing Preview
Simple 2-column comparison (Free vs Pro). Link to full pricing page.

### FAQ
3-4 questions:
- "Est-ce que je garde tous les droits sur le contenu généré ?"
- "Puis-je modifier le texte après génération ?"
- "Quels formats d'export sont disponibles ?"

### Final CTA
```
"Toujours aussi simple. Commencez maintenant."
Button: "Créer mon premier projet"
```

### Footer
- Links: Features, Pricing, About, Contact
- Copyright: © 2025 LensCraft AI by Ulkhad Empire
- Social links: Instagram, YouTube, TikTok

## User Journeys

### Journey 1: First-Time Visitor
1. Lands on landing page
2. Reads hero section — understands value immediately
3. Clicks "Essayer gratuitement" 
4. (Currently: goes to /new form) → (Future: sign up or sign in)
5. Completes project creation form
6. Waits for AI generation (~30-60 seconds)
7. Views results across 6 pages with nav tabs
8. Edits sections inline
9. Exports DOCX
10. Returns to dashboard to start next project

### Journey 2: Returning User
1. Lands on dashboard (auth required)
2. Sees recent projects list
3. Either opens existing project OR creates new one
4. Continues editing from last visit

### Journey 3: Viral Promo Seeker
1. Generates base treatment
2. Navigates to Promo tab
3. Clicks "Relancer" with custom preferences
4. Receives new set of viral concepts with scores
5. Saves version, exports full doc

## Responsive Requirements

- Desktop: Full horizontal nav (≥768px breakpoint shows tabs)
- Tablet: Collapsed horizontal scroll nav, adjusted grid columns
- Mobile: Single column, touch-friendly tap targets (≥44px), reduced padding
- All editable tables must have horizontal scroll container

## Accessibility Requirements

- All interactive elements have visible focus states
- Color contrast ratios meet WCAG AA (existing zinc-950/indigo-400 should be verified)
- Keyboard navigation through all pages
- Screen reader labels on icon-only buttons
- Form inputs have associated `<label>` elements (mostly already done)
- Loading states are announced via ARIA live regions
