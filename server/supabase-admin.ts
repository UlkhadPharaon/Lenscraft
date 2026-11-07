import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from './env';

/**
 * Service-role Supabase client. SERVER ONLY — the service role key bypasses
 * Row Level Security, so this module must never be imported from frontend code.
 * Returns null when Supabase is not configured (local mode).
 */
let adminClient: SupabaseClient | null | undefined;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (adminClient !== undefined) return adminClient;
  if (!isSupabaseConfigured) {
    adminClient = null;
    return adminClient;
  }
  adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}

export type SubscriptionTier = 'free' | 'pro' | 'studio';

export interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  subscription_tier: SubscriptionTier;
  generations_count: number;
  last_generation_date: string | null;
  created_at?: string;
  updated_at?: string;
}

/** Monthly generation quota per tier (Infinity = unlimited). */
export const TIER_LIMITS: Record<SubscriptionTier, number> = {
  free: 1,
  pro: Number.POSITIVE_INFINITY,
  studio: Number.POSITIVE_INFINITY,
};

export class QuotaError extends Error {
  constructor(message = 'Limite mensuelle atteinte pour votre plan gratuit.') {
    super(message);
    this.name = 'QuotaError';
  }
}

function startOfMonth(date = new Date()): string {
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
}

export function isSameMonth(dateValue: string | null | undefined, reference = new Date()): boolean {
  if (!dateValue) return false;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return false;
  const r = new Date(reference);
  return d.getFullYear() === r.getFullYear() && d.getMonth() === r.getMonth();
}

/**
 * Checks the caller's monthly generation quota and increments the counter
 * atomically-ish (read → compare → update). Requires Supabase to be configured;
 * returns a permissive result when it is not, so local/dev runs are not blocked.
 */
export async function consumeGenerationQuota(userId: string): Promise<{ tier: SubscriptionTier; remaining: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { tier: 'free', remaining: Number.POSITIVE_INFINITY };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('subscription_tier, generations_count, last_generation_date')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Impossible de vérifier votre quota (${error.message}).`);
  }
  if (!profile) {
    throw new QuotaError('Profil introuvable. Reconnectez-vous pour continuer.');
  }

  const tier = (profile.subscription_tier || 'free') as SubscriptionTier;
  const monthlyLimit = TIER_LIMITS[tier] ?? 1;
  const usedThisMonth = isSameMonth(profile.last_generation_date) ? profile.generations_count || 0 : 0;

  if (usedThisMonth >= monthlyLimit) {
    throw new QuotaError();
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      generations_count: usedThisMonth + 1,
      last_generation_date: startOfMonth(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (updateError) {
    throw new Error(`Impossible de mettre à jour votre quota (${updateError.message}).`);
  }

  return { tier, remaining: monthlyLimit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : monthlyLimit - usedThisMonth - 1 };
}
