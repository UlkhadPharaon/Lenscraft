import Stripe from 'stripe';
import { env } from './env';
import type { SubscriptionTier } from './supabase-admin';

let stripeClient: Stripe | null | undefined;

/** Lazy Stripe client. Returns null when STRIPE_SECRET_KEY is not configured. */
export function getStripe(): Stripe | null {
  if (stripeClient !== undefined) return stripeClient;
  if (!env.stripeSecretKey || env.stripeSecretKey.startsWith('MY_')) {
    stripeClient = null;
    return stripeClient;
  }
  stripeClient = new Stripe(env.stripeSecretKey);
  return stripeClient;
}

/**
 * Plans priced in Franc CFA (XOF). XOF is a zero-decimal currency, so Stripe
 * amounts are the whole number of francs — no cents.
 */
export const STRIPE_TIERS: Record<string, {
  tier: SubscriptionTier;
  priceId?: string;
  name: string;
  amount: number;
  label: string;
}> = {
  pro: {
    tier: 'pro',
    priceId: process.env.STRIPE_PRICE_PRO,
    name: 'LensCraft Pro',
    amount: 5000, // 5 000 FCFA / mois
    label: '5 000 FCFA / mois',
  },
  studio: {
    tier: 'studio',
    priceId: process.env.STRIPE_PRICE_STUDIO,
    name: 'LensCraft Studio',
    amount: 15000, // 15 000 FCFA / mois
    label: '15 000 FCFA / mois',
  },
};

export function isSupportedTier(tier: unknown): tier is 'pro' | 'studio' {
  return tier === 'pro' || tier === 'studio';
}

/** Zero-decimal currencies supported by Stripe (no minor unit to multiply). */
const ZERO_DECIMAL = new Set(['xof', 'xaf', 'clp', 'krw', 'vnd', 'jpy', 'rwf', 'bif', 'djf', 'kmf', 'mga', 'pyg', 'vuv', 'ugx', 'gmd', 'gnf']);

/** Stripe expects the amount in the currency's minor unit. */
export function toStripeAmount(amount: number, currency = env.currency): number {
  return ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : Math.round(amount * 100);
}
