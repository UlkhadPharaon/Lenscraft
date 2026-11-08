import dotenv from 'dotenv';

// Load .env (and .env.local) as early as possible, before anything reads process.env.
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

export interface AppEnv {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  appUrl: string;
  geminiApiKey: string;
  /** 'gemini' (default) or 'openrouter'. */
  aiProvider: 'gemini' | 'openrouter';
  geminiModel: string;
  openRouterApiKey: string;
  openRouterModel: string;
  pocketbaseUrl: string;
  pocketbaseAdminEmail: string;
  pocketbaseAdminPassword: string;
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  /** Currency used for plans (XOF = Franc CFA, a zero-decimal currency). */
  currency: string;
}

export interface EnvValidation {
  ok: boolean;
  fatal: string[];
  warnings: string[];
  env: AppEnv;
}

const PLACEHOLDERS = ['', 'MY_GEMINI_API_KEY', 'MY_APP_URL', 'changeme', 'your-key-here'];

function isPlaceholder(value: string | undefined): boolean {
  if (!value) return true;
  return PLACEHOLDERS.includes(value.trim());
}

/**
 * Validates the runtime environment. GEMINI_API_KEY is fatal (the AI features
 * cannot work at all without it); PocketBase / Stripe keys only produce warnings
 * because the app degrades gracefully to local mode / disabled billing.
 */
export function validateEnvironment(): EnvValidation {
  const warnings: string[] = [];
  const fatal: string[] = [];

  const geminiApiKey = (process.env.GEMINI_API_KEY || '').trim();
  if (isPlaceholder(geminiApiKey)) {
    if ((process.env.AI_PROVIDER || 'gemini') === 'openrouter') {
      warnings.push('GEMINI_API_KEY manquant mais AI_PROVIDER=openrouter — clé Gemini ignorée.');
    } else {
      fatal.push('GEMINI_API_KEY is required. Set it in your environment or in a .env file at the project root.');
    }
  }

  const aiProvider = (process.env.AI_PROVIDER || 'gemini').trim() as 'gemini' | 'openrouter';
  if (aiProvider === 'openrouter' && isPlaceholder((process.env.OPENROUTER_API_KEY || '').trim())) {
    fatal.push('OPENROUTER_API_KEY is required when AI_PROVIDER=openrouter.');
  }

  const pocketbaseUrl = (process.env.VITE_POCKETBASE_URL || process.env.POCKETBASE_URL || '').trim();
  const pocketbaseAdminEmail = (process.env.POCKETBASE_ADMIN_EMAIL || '').trim();
  const pocketbaseAdminPassword = process.env.POCKETBASE_ADMIN_PASSWORD || '';
  if (!pocketbaseUrl) {
    warnings.push('VITE_POCKETBASE_URL missing -> authentication & cloud storage run in LOCAL mode (data stays in the browser).');
  } else if (!pocketbaseAdminEmail || !pocketbaseAdminPassword) {
    warnings.push('POCKETBASE_ADMIN_EMAIL / POCKETBASE_ADMIN_PASSWORD missing -> server-side quota enforcement and Stripe webhooks are disabled.');
  }

  const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
  const stripeWebhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (isPlaceholder(stripeSecretKey)) {
    warnings.push('STRIPE_SECRET_KEY missing -> checkout returns 503 and upgrades cannot be purchased.');
  } else if (isPlaceholder(stripeWebhookSecret)) {
    warnings.push('STRIPE_WEBHOOK_SECRET missing -> subscription webhooks are rejected.');
  }

  const env: AppEnv = {
    nodeEnv: (process.env.NODE_ENV as AppEnv['nodeEnv']) || 'development',
    port: Number.parseInt(process.env.PORT || '3000', 10) || 3000,
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').trim(),
    geminiApiKey,
    aiProvider,
    geminiModel: (process.env.GEMINI_MODEL || 'gemini-3.5-flash').trim(),
    openRouterApiKey: (process.env.OPENROUTER_API_KEY || '').trim(),
    openRouterModel: (process.env.OPENROUTER_MODEL || 'qwen/qwen3.8-omni-flash').trim(),
    pocketbaseUrl,
    pocketbaseAdminEmail,
    pocketbaseAdminPassword,
    stripeSecretKey,
    stripeWebhookSecret,
    currency: (process.env.STRIPE_CURRENCY || 'xof').trim().toLowerCase(),
  };

  return { ok: fatal.length === 0, fatal, warnings, env };
}

export const { env } = validateEnvironment();
export const isProduction = env.nodeEnv === 'production';
export const isPocketBaseConfigured = Boolean(env.pocketbaseUrl && env.pocketbaseAdminEmail && env.pocketbaseAdminPassword);
