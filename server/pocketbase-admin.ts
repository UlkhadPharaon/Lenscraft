import PocketBase from 'pocketbase';
import { env, isPocketBaseConfigured } from './env';

/**
 * Superuser PocketBase client — SERVER ONLY.
 *
 * PocketBase has no service-role key: admin access is obtained by
 * authenticating as the instance superuser, and that token bypasses every
 * collection rule (the exact equivalent of Supabase's service role). This
 * module must never be imported from frontend code.
 *
 * Returns null when PocketBase is not configured (local mode), so callers
 * degrade gracefully exactly like the previous Supabase implementation.
 */
let adminClient: PocketBase | null | undefined;
let authPromise: Promise<PocketBase | null> | null = null;

/** Async because the superuser handshake is a network call (memoized). */
export function getPocketBaseAdmin(): Promise<PocketBase | null> {
  if (adminClient !== undefined) return Promise.resolve(adminClient);
  if (!isPocketBaseConfigured) {
    adminClient = null;
    return Promise.resolve(null);
  }
  if (!authPromise) {
    authPromise = (async () => {
      const client = new PocketBase(env.pocketbaseUrl);
      // Memory-only token: no localStorage on the server, no token on disk.
      client.authStore.clear();
      await client.collection('_superusers').authWithPassword(
        env.pocketbaseAdminEmail,
        env.pocketbaseAdminPassword
      );
      adminClient = client;
      return client;
    })().catch((error: unknown) => {
      authPromise = null;
      console.error('Authentification superuser PocketBase impossible :', error);
      return null;
    });
  }
  return authPromise;
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
  created?: string;
  updated?: string;
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

export interface VerifiedUser {
  id: string;
  email: string | null;
}

/**
 * Resolves the user behind a PocketBase bearer token.
 *
 * PocketBase exposes no `getUser(token)` endpoint: the token is a short-lived
 * JWT validated (and rotated) by `POST /api/collections/users/auth-refresh`.
 * A raw fetch is used instead of a SDK client so no authStore state is shared
 * with the superuser client.
 */
export async function verifyPocketBaseToken(token: string | null): Promise<VerifiedUser | null> {
  if (!env.pocketbaseUrl || !token) return null;
  try {
    const response = await fetch(`${env.pocketbaseUrl}/api/collections/users/auth-refresh`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { record?: { id?: string; email?: string } };
    const id = body.record?.id;
    return typeof id === 'string' && id ? { id, email: body.record?.email ?? null } : null;
  } catch {
    return null;
  }
}

/**
 * Checks the caller's monthly generation quota and increments the counter
 * atomically-ish (read → compare → update). Requires PocketBase to be
 * configured; returns a permissive result when it is not, so local/dev runs
 * are not blocked.
 *
 * Unlike Supabase (which relied on an auth trigger to create profiles), the
 * profile is provisioned here on first use — PocketBase has no triggers.
 */
export async function consumeGenerationQuota(
  userId: string,
  email?: string | null
): Promise<{ tier: SubscriptionTier; remaining: number }> {
  const pocketbase = await getPocketBaseAdmin();
  if (!pocketbase) {
    return { tier: 'free', remaining: Number.POSITIVE_INFINITY };
  }

  let profile: ProfileRow | null = await readProfile(pocketbase, userId);

  if (!profile) {
    // First generation for this account: provision the profile row.
    try {
      await pocketbase.collection('profiles').create({
        id: userId,
        email: email ?? '',
        subscription_tier: 'free',
        generations_count: 0,
      });
    } catch {
      // Created concurrently (or forbidden) — the read below is the source of truth.
    }
    profile = await readProfile(pocketbase, userId);
    if (!profile) {
      throw new QuotaError('Profil introuvable. Reconnectez-vous pour continuer.');
    }
  }

  const tier = (profile.subscription_tier || 'free') as SubscriptionTier;
  const monthlyLimit = TIER_LIMITS[tier] ?? 1;
  const usedThisMonth = isSameMonth(profile.last_generation_date) ? profile.generations_count || 0 : 0;

  if (usedThisMonth >= monthlyLimit) {
    throw new QuotaError();
  }

  await pocketbase
    .collection('profiles')
    .update(userId, {
      generations_count: usedThisMonth + 1,
      last_generation_date: startOfMonth(),
    })
    .catch(error => {
      throw new Error(`Impossible de mettre à jour votre quota (${messageOf(error)}).`);
    });

  return {
    tier,
    remaining:
      monthlyLimit === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : monthlyLimit - usedThisMonth - 1,
  };
}

async function readProfile(pocketbase: PocketBase, userId: string): Promise<ProfileRow | null> {
  try {
    return (await pocketbase.collection('profiles').getOne(userId)) as unknown as ProfileRow;
  } catch (error) {
    if (statusOf(error) === 404) return null;
    throw new Error(`Impossible de vérifier votre quota (${messageOf(error)}).`);
  }
}

function statusOf(error: unknown): number | undefined {
  return typeof error === 'object' && error !== null && 'status' in error
    ? (error as { status?: number }).status
    : undefined;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
