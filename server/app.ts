/**
 * LensCraft AI — Express application factory.
 *
 * Single source of truth for middleware + API routes. Reused by:
 *   - server.ts     (local dev / standalone Node server, `npm start`)
 *   - api/index.ts  (Vercel serverless function)
 *
 * Keep this module free of top-level side effects other than dotenv loading.
 */
import dotenv from 'dotenv';
import express from 'express';
import path from 'path';
import helmet from 'helmet';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import type { Stripe } from 'stripe';
import { env, isProduction, isSupabaseConfigured } from './env';
import { consumeGenerationQuota, getSupabaseAdmin, QuotaError, TIER_LIMITS, type ProfileRow } from './supabase-admin';
import { rateLimit } from './rate-limit';
import { STRIPE_TIERS, getStripe, isSupportedTier, toStripeAmount } from './stripe';
import { generateStructuredJson, availableModels, currentProvider, listModels, providerCatalog } from './ai';
import { ASSISTANT_SCHEMA, PROMO_SCHEMA, TREATMENT_SCHEMA } from './schemas';
import { appendSurveyResponse, readSurveyResponses, surveyStats } from './survey';
import { surveyToCsv } from '../src/lib/survey';
import type { SurveyResponse } from '../src/lib/survey';
// Load .env before anything reads process.env.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

// ------------------------------------------------------------ shared Gemini AI
/** Kept for backwards compatibility — new code goes through server/ai.ts. */
function createAI() {
  return new GoogleGenAI({
    apiKey: env.geminiApiKey,
    httpOptions: { headers: { 'User-Agent': 'lenscraft-ai' } },
  });
}
void createAI;

/** Translates Gemini/network failures into a French message + HTTP status. */
function errorMessageFor(error: any): { message: string; status: number } {
  let message = error?.message || 'An unexpected error occurred.';
  let status = 500;

  if (error?.status === 429 || message.includes('429') || message.includes('Quota exceeded')) {
    status = 429;
    message = "La limite d'utilisation de l'API (Quota) a été atteinte pour l'instant. Veuillez réessayer dans quelques instants ou vérifier votre clé API.";
  } else if (error?.status === 503 || message.includes('503') || message.includes('high demand') || message.includes('UNAVAILABLE')) {
    status = 503;
    message = "Le modèle d'IA est actuellement surchargé (forte demande). Veuillez réessayer dans quelques instants.";
  } else if (error?.status === 400 || message.includes('video is corrupted') || message.includes('0 Frames found')) {
    status = 400;
    message = "Le fichier multimédia fourni semble corrompu, ne contient pas de données lisibles, ou n'est pas pris en charge par l'analyse IA. Veuillez utiliser un fichier purement audio (MP3, WAV) valide.";
  } else if (message.includes('fetch failed') || error?.cause?.name === 'HeadersTimeoutError' || message.includes('Headers Timeout')) {
    status = 504;
    message = 'La requête a pris trop de temps et a expiré (Timeout). Le traitement peut être long, ou le modèle est très sollicité. Veuillez réessayer avec un fichier plus court ou réessayer plus tard.';
  }
  return { message, status };
}

const isTransient = (error: any) => error?.status === 429 || error?.status === 503 || String(error?.message || '').includes('fetch failed');

/**
 * Builds the Express application.
 * @param serveStatic attach the production static server + SPA fallback
 *                    (standalone Node only — Vercel serves dist/ itself).
 */
export async function createApp({ serveStatic = false }: { serveStatic?: boolean } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // ------------------------------------------------------------ middleware (F3)
  const allowedOriginsForCsp = () =>
    [env.appUrl, 'https://lenscraft.vercel.app', 'http://localhost:3000', 'http://127.0.0.1:3000']
      .filter(Boolean);

  // A single, permissive-but-sane CSP. `'unsafe-eval'` / `'wasm-unsafe-eval'`
  // are required by @react-pdf/renderer (its font engine is loaded as WASM);
  // `'unsafe-inline'` is required by Vite's dev client and by React's inline
  // style attributes.
  const cspDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'wasm-unsafe-eval'", 'blob:'],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'https:'],
    // `data:`/`blob:` let @react-pdf/renderer fetch its WASM font engine.
    connectSrc: ["'self'", ...allowedOriginsForCsp(), 'data:', 'blob:'],
    workerSrc: ["'self'", 'blob:', 'data:'],
    objectSrc: ["'none'"],
    baseUri: ["'self'"],
  };

  app.use(helmet({
    contentSecurityPolicy: { directives: cspDirectives, useDefaults: false },
    crossOriginResourcePolicy: { policy: 'same-site' },
  }));

  const allowedOrigins = new Set(
    [env.appUrl, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173']
      .filter(Boolean)
  );

  app.use(cors({
    origin(origin, callback) {
      // No Origin header (curl, server-to-server, plain navigations): allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      // Same-origin requests from the server that served the page are always
      // fine — this covers dev servers, preview URLs and smoke tests.
      const host = (this as any)?.req?.headers?.host;
      if (host) {
        const proto = (this as any).req?.protocol || 'http';
        if (origin === `${proto}://${host}`) return callback(null, true);
      }
      // Unknown cross-origin: respond without CORS headers instead of throwing
      // (a 500 here would break same-origin asset loading).
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
  }));

  // Request logging (compact, single line per request).
  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startedAt;
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    });
    next();
  });

  // Stripe webhook needs the RAW body for signature verification, so it is
  // mounted before the JSON body parser.
  app.post('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe || !env.stripeWebhookSecret || env.stripeWebhookSecret.startsWith('MY_')) {
        return res.status(503).json({ error: 'Stripe n\'est pas configuré sur ce serveur.' });
      }

      let event;
      try {
        event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'] as string, env.stripeWebhookSecret);
      } catch (err: any) {
        return res.status(400).json({ error: `Signature webhook invalide: ${err.message}` });
      }

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return res.status(503).json({ error: 'Supabase n\'est pas configuré sur ce serveur.' });
      }

      const tierForEvent = (eventType: string): ProfileRow['subscription_tier'] | null => {
        switch (eventType) {
          case 'checkout.session.completed':
          case 'customer.subscription.created':
          case 'customer.subscription.updated':
          case 'customer.subscription.resumed':
            return null; // tier is read from metadata below
          case 'customer.subscription.deleted':
          case 'customer.subscription.paused':
            return 'free';
          default:
            return null;
        }
      };

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.client_reference_id || session.metadata?.userId;
        const tier = (session.metadata?.tier || 'pro') as ProfileRow['subscription_tier'];
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (error) console.error('Webhook: failed to update profile tier', error);
        }
      } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        const tier = (subscription.metadata?.tier || 'pro') as ProfileRow['subscription_tier'];
        const canceled = subscription.status === 'canceled' || subscription.cancel_at_period_end === true && subscription.status === 'active'
          ? false
          : subscription.status === 'canceled';
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({ subscription_tier: canceled ? 'free' : tier, updated_at: new Date().toISOString() })
            .eq('id', userId);
          if (error) console.error('Webhook: failed to update subscription tier', error);
        }
      } else {
        const tier = tierForEvent(event.type);
        if (tier === 'free') {
          const subscription = event.data.object as Stripe.Subscription;
          const userId = subscription.metadata?.userId;
          if (userId) {
            await supabase.from('profiles').update({ subscription_tier: 'free', updated_at: new Date().toISOString() }).eq('id', userId);
          }
        }
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('Stripe webhook error:', error);
      res.status(500).json({ error: 'Webhook handler failure.' });
    }
  });

  app.use(express.json({ limit: "50mb" }));

  // ---------------------------------------------------------------- health/SM-01
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      mode: isSupabaseConfigured ? 'supabase' : 'local',
      billing: Boolean(getStripe()),
      timestamp: new Date().toISOString(),
    });
  });
  const apiLimiter = rateLimit({ windowMs: 60_000, max: 60, message: 'Trop de requêtes depuis votre appareil. Réessayez dans une minute.' });
  const generateLimiter = rateLimit({ windowMs: 60_000, max: 10, message: 'Générations trop rapprochées. Patientez une minute avant de relancer.' });


  // ------------------------------------------------------------ public AI config
  // Lets the frontend model selector follow the configured provider.
  app.get('/api/config', (_req, res) => {
    res.json({
      provider: currentProvider(),
      models: availableModels(),
      currency: env.currency,
      billingEnabled: Boolean(getStripe()),
      upgradeEnabled: !Boolean(getStripe()) || !isSupabaseConfigured,
      byokEnabled: true,
      providers: providerCatalog(),
    });
  });

  // Lists the models available for a BYOK provider (filtered to audio + tools).
  app.post('/api/models', apiLimiter, async (req, res) => {
    try {
      const providerId = String(req.body?.provider || '').toLowerCase();
      const apiKey = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : '';
      if (!providerId) return res.status(400).json({ error: 'Fournisseur requis.' });

      const result = await listModels(providerId, apiKey || undefined);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Liste des modèles indisponible.' });
    }
  });


  /**
   * Resolves the caller's user id (from the Authorization bearer token) and
   * enforces the monthly generation quota (M2). Skips enforcement when Supabase
   * is not configured (local mode).
   */
  async function enforceQuota(req: express.Request): Promise<string | null> {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const supabase = getSupabaseAdmin();

    if (!supabase || !token) return null;

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      throw Object.assign(new Error('Session expirée. Reconnectez-vous.'), { status: 401 });
    }

    await consumeGenerationQuota(data.user.id);
    return data.user.id;
  }

  // ------------------------------------------------------ POST /api/generate
  app.post("/api/generate", apiLimiter, generateLimiter, async (req, res) => {
    try {
      try {
        await enforceQuota(req);
      } catch (quotaError: any) {
        if (quotaError instanceof QuotaError) return res.status(429).json({ error: quotaError.message });
        const status = quotaError?.status || 500;
        return res.status(status).json({ error: quotaError?.message || 'Quota invalide.' });
      }

      const { description, lyrics, audioBase64, audioMimeType, youtubeUrl, language, model, ai } = req.body;

      const promptText = `Tu es un réalisateur de clips vidéo visionnaire et un artiste visuel.
Analyse le concept de la chanson, la structure lyrique, le fichier audio ou le lien YouTube fourni pour générer un dossier de production complet pour un clip vidéo.
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.
Le "script" doit être EXTRÊMEMENT détaillé, complet, avec des indications de mise en scène poussées, des descriptions de plans, des actions détaillées et des dialogues (si applicable). Ne sois pas bref ! C'est le script complet du clip vidéo de A à Z.

Langue ou Contexte Culturel de la chanson:
${language ? language : 'Non spécifié (Détecter automatiquement si possible).'}

Song/Concept Description:
${description ? description : 'Non renseigné.'}

YouTube Link (Reference):
${youtubeUrl ? youtubeUrl : 'Non renseigné. (Note: tu ne peux pas cliquer sur ce lien, essaie de deviner la chanson si le titre est dans l\'URL)'}

Lyrics or Musical Notes:
${lyrics ? lyrics : 'Non renseigné.'}`;

      const result = await generateStructuredJson({
        model,
        provider: ai?.provider,
        apiKey: typeof ai?.apiKey === 'string' ? ai.apiKey.trim() || undefined : undefined,
        systemPrompt: "Tu es un réalisateur de clips vidéo visionnaire et un artiste visuel. IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.",
        userPrompt: promptText,
        audio: audioBase64 && audioMimeType ? { data: audioBase64, mimeType: audioMimeType } : null,
        schema: TREATMENT_SCHEMA,
        schemaName: 'video_treatment',
        temperature: 0.9,
      });
      res.json(result);
    } catch (error: any) {
      if (!isTransient(error)) {
        console.error("API error details:", error);
      }
      const { message, status } = errorMessageFor(error);
      res.status(status).json({ error: message });
    }
  });

  // ------------------------------------------------- POST /api/generate-promo
  app.post("/api/generate-promo", apiLimiter, generateLimiter, async (req, res) => {
    try {
      try {
        await enforceQuota(req);
      } catch (quotaError: any) {
        if (quotaError instanceof QuotaError) return res.status(429).json({ error: quotaError.message });
        const status = quotaError?.status || 500;
        return res.status(status).json({ error: quotaError?.message || 'Quota invalide.' });
      }

      const { treatment, audioBase64, audioMimeType, preferences, model, ai } = req.body;

      const prefLines = [
        `- Plateformes visées : ${Array.isArray(preferences?.platforms) && preferences.platforms.length ? preferences.platforms.join(', ') : 'TikTok, Reels et Shorts'}`,
        `- Nombre de vidéos souhaitées : ${preferences?.numberOfVideos || "Laisse l'IA décider"}`,
        `- Types de concepts recherchés : ${Array.isArray(preferences?.conceptStyles) && preferences.conceptStyles.length ? preferences.conceptStyles.join(', ') : "Laisse l'IA proposer"}`,
        `- Durée cible par vidéo : ${preferences?.duration || 'Libre (15 à 60 s)'}`,
        `- Niveau de production : ${preferences?.budget || "Laisse l'IA décider"}`,
        `- Objectif principal : ${preferences?.goal || "Laisse l'IA décider"}`,
        `- Pseudo / handle de l'artiste : ${preferences?.handle || 'Non renseigné'}`,
        `- Style / Références : ${preferences?.styleReferences || "Laisse l'IA proposer"}`,
        `- Contraintes spécifiques : ${preferences?.constraints || 'Aucune'}`,
      ].join('\n');

      const promptText = `Tu es un stratège marketing digital et créateur de contenu viral.
À partir du scénario et de l'analyse du projet de clip vidéo suivant, ainsi que de la musique (si fournie), crée une stratégie promotionnelle détaillée pour les réseaux sociaux (Shorts, Reels, TikTok).
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.

Dossier de production actuel :
${JSON.stringify(treatment, null, 2)}

Préférences et contraintes du créateur :
${prefLines}

Pour chaque concept, tu DOIS fournir : un titre accrocheur, le concept de base, un script complet étape par étape avec timecodes (0-3s, 3-10s...), le style visuel et de montage, un score de viralité et d'efficacité promotionnelle de 1 à 10 avec explication. Sois très détaillé, concret et créatif. Chaque vidéo doit être réalisable telle quelle par un artiste indépendant.

Si l'utilisateur demande un nombre spécifique de vidéos (même grand, comme 10, 30, 50), tu DOIS générer exactement ce nombre de concepts (ou déclinaisons) dans la liste "promoIdeas". Ne te limite pas, fournis tout ce qui est demandé.`;

      const result = await generateStructuredJson({
        model,
        provider: ai?.provider,
        apiKey: typeof ai?.apiKey === 'string' ? ai.apiKey.trim() || undefined : undefined,
        systemPrompt: "Tu es un stratège marketing digital et créateur de contenu viral. IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.",
        userPrompt: promptText,
        audio: audioBase64 && audioMimeType ? { data: audioBase64, mimeType: audioMimeType } : null,
        schema: PROMO_SCHEMA,
        schemaName: 'promo_strategy',
        temperature: 0.95,
      });
      res.json(result);
    } catch (error: any) {
      if (!isTransient(error)) {
        console.error("Promo API error details:", error);
      }
      const { message, status } = errorMessageFor(error);
      res.status(status).json({ error: message });
    }
  });

  // ----------------------------------------------------- POST /api/assistant
  app.post("/api/assistant", apiLimiter, async (req, res) => {
    try {
      const { treatment, message, model, ai: byok } = req.body;
      const providerOverride = byok?.provider;
      const apiKeyOverride = typeof byok?.apiKey === 'string' ? byok.apiKey.trim() || undefined : undefined;

      const promptText = `Tu es l'assistant IA intégré de LensCraft. L'utilisateur veut modifier ou discuter de son projet de clip vidéo.
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.

Voici le dossier de production actuel (au format JSON):
${JSON.stringify(treatment, null, 2)}

Requête de l'utilisateur: "${message}"

Modifie le JSON comme demandé (ou améliore-le si l'utilisateur le demande) ET donne une réponse textuelle ('assistantMessage') pour expliquer ce que tu as fait. Conserve la même structure riche et détaillée pour le script et les scènes.`;

      const result = await generateStructuredJson({
        model,
        provider: providerOverride,
        apiKey: apiKeyOverride,
        systemPrompt: "Tu es l'assistant IA intégré de LensCraft. IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.",
        userPrompt: promptText,
        schema: ASSISTANT_SCHEMA,
        schemaName: 'assistant_reply',
        temperature: 0.7,
      });
      res.json(result);
    } catch (error: any) {
      if (!isTransient(error)) {
        console.error("Assistant API error details:", error);
      }
      const { message, status } = errorMessageFor(error);
      res.status(status).json({ error: message });
    }
  });

  // ------------------------------------- POST /api/create-checkout-session (M1)
  app.post("/api/create-checkout-session", apiLimiter, async (req, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(503).json({ error: 'La facturation n\'est pas encore activée (STRIPE_SECRET_KEY manquant).' });
      }

      const token = (req.headers.authorization || '').replace('Bearer ', '');
      const supabase = getSupabaseAdmin();
      if (!supabase || !token) {
        return res.status(401).json({ error: 'Connectez-vous pour souscrire à un abonnement.' });
      }

      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError || !userData?.user) {
        return res.status(401).json({ error: 'Session expirée. Reconnectez-vous.' });
      }

      const tier = req.body?.tier;
      if (!isSupportedTier(tier)) {
        return res.status(400).json({ error: 'Plan demandé invalide (attendu: "pro" ou "studio").' });
      }

      const plan = STRIPE_TIERS[tier];
      const lineItems = plan.priceId
        ? [{ price: plan.priceId, quantity: 1 }]
        : [{
            price_data: {
              // Franc CFA (XOF) by default — a zero-decimal currency.
              currency: env.currency,
              product_data: { name: plan.name, description: plan.label },
              unit_amount: toStripeAmount(plan.amount, env.currency),
              recurring: { interval: 'month' },
            },
            quantity: 1,
          }];

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: lineItems,
        success_url: `${env.appUrl}/app?upgrade=success`,
        cancel_url: `${env.appUrl}/pricing?upgrade=cancelled`,
        client_reference_id: userData.user.id,
        customer_email: userData.user.email || undefined,
        metadata: { userId: userData.user.id, tier },
      });

      res.json({ url: session.url });
    } catch (error: any) {
      console.error('Checkout session error:', error);
      res.status(500).json({ error: error?.message || 'Impossible de créer la session de paiement.' });
    }
  });

  // ----------------------------------------------- POST /api/upgrade (demo path)
  /**
   * Self-service plan change used while Stripe is not configured (local /
   * preview deployments). When Stripe AND Supabase are both configured this
   * endpoint is disabled so real payments cannot be bypassed.
   */
  app.post('/api/upgrade', apiLimiter, async (req, res) => {
    try {
      const stripe = getStripe();
      const supabase = getSupabaseAdmin();

      if (stripe && supabase) {
        return res.status(409).json({
          error: 'Utilisez le paiement Stripe pour changer de plan.',
          checkout: true,
        });
      }

      const requested = req.body?.tier;
      const tier: ProfileRow['subscription_tier'] =
        requested === 'free' || requested === 'pro' || requested === 'studio' ? requested : 'free';

      // Persist server-side when a database is available.
      const token = (req.headers.authorization || '').replace('Bearer ', '');
      if (supabase && token) {
        const { data: userData } = await supabase.auth.getUser(token);
        if (userData?.user) {
          await supabase.from('profiles')
            .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
            .eq('id', userData.user.id);
        }
      }

      res.json({ tier, demo: true, limits: TIER_LIMITS[tier] });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Changement de plan impossible.' });
    }
  });

  // ------------------------------------------------------- survey (market test)
  app.post('/api/survey', apiLimiter, async (req, res) => {
    try {
      const { answers, source } = req.body || {};
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Réponses manquantes.' });
      }

      // Never trust the client for PII-heavy fields beyond what it sent.
      const response: SurveyResponse = {
        at: Date.now(),
        source: String(source || 'direct').slice(0, 40),
        answers,
        device: String(req.headers['user-agent'] || '').slice(0, 200),
      };

      const stored = appendSurveyResponse(response);
      res.json({ ok: true, stored });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'Enregistrement impossible.' });
    }
  });

  // Aggregated stats — safe to share, contains no personal data.
  app.get('/api/survey/stats', (_req, res) => {
    const responses = readSurveyResponses();
    res.json({ stats: surveyStats(responses) });
  });

  // Raw export for analysis, guarded by a token when one is configured.
  app.get('/api/survey/export', (req, res) => {
    const token = process.env.SURVEY_TOKEN;
    if (token && req.query.token !== token) {
      return res.status(401).json({ error: 'Token requis.' });
    }
    const responses = readSurveyResponses();
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="lenscraft-survey.csv"');
    res.send(surveyToCsv(responses));
  });

  // Unknown API routes must answer JSON, never fall through to the SPA.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: `Endpoint inconnu: ${req.method} ${req.originalUrl}` });
  });

  if (serveStatic) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders(res, filePath) {
        if (filePath.includes(path.sep + 'assets' + path.sep)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      },
    }));
    app.get('*', (req, res) => {
      // Never swallow API 404s into the SPA fallback.
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'Endpoint inconnu: ' + req.method + ' ' + req.path });
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}
