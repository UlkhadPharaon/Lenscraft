import PocketBase from 'pocketbase';

/**
 * Server-side PocketBase client (superuser — BYPASSES all collection rules).
 *
 * ⚠️  This module is SERVER ONLY. It is intentionally NOT imported by any
 * browser bundle: importing it into client code would attempt to read secrets
 * from `process.env`, which do not exist in the browser. Callers must guard
 * against browser usage, hence the explicit check below.
 *
 * PocketBase has no service-role key: admin access is obtained by
 * authenticating as the instance superuser. The token is cached in memory and
 * refreshed transparently when it expires (PocketBase rotates it on use).
 *
 * The Express server keeps its own instance in `server/pocketbase-admin.ts`;
 * this helper exists so tooling, scripts and tests can share the same access
 * pattern without duplicating the configuration.
 */
export interface ServerPocketBaseConfig {
  url: string;
  adminEmail: string;
  adminPassword: string;
}

export function isServerPocketBaseConfigured(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): boolean {
  return Boolean(env.VITE_POCKETBASE_URL && env.POCKETBASE_ADMIN_EMAIL && env.POCKETBASE_ADMIN_PASSWORD);
}

let cached: PocketBase | null = null;

/** Returns a superuser-authenticated client, or null when unconfigured. */
export function getPocketBaseServerClient(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): PocketBase | null {
  if (typeof window !== 'undefined') {
    throw new Error('getPocketBaseServerClient() cannot run in the browser — the superuser credentials are secret.');
  }

  const config = resolveConfig(env);
  if (!config) return null;
  if (cached) return cached;

  const client = new PocketBase(config.url);
  // superuser token lives in memory only (no localStorage on the server)
  client.authStore.clear();
  cached = client;
  void ensureAdminToken(client, config);
  return cached;
}

/** Throwing variant for call sites that cannot degrade to local mode. */
export function requirePocketBaseServerClient(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>
): PocketBase {
  const client = getPocketBaseServerClient(env);
  if (!client) {
    throw new Error('PocketBase server client requires VITE_POCKETBASE_URL, POCKETBASE_ADMIN_EMAIL and POCKETBASE_ADMIN_PASSWORD.');
  }
  return client;
}

function resolveConfig(env: Record<string, string | undefined>): ServerPocketBaseConfig | null {
  const url = (env.VITE_POCKETBASE_URL || env.POCKETBASE_URL || '').trim();
  const adminEmail = (env.POCKETBASE_ADMIN_EMAIL || '').trim();
  const adminPassword = env.POCKETBASE_ADMIN_PASSWORD || '';
  if (!url || !adminEmail || !adminPassword) return null;
  return { url, adminEmail, adminPassword };
}

/**
 * Authenticates (or re-authenticates) the client as superuser.
 * Exported so the server layer can await it before its first request.
 */
export async function ensureAdminToken(
  client: PocketBase,
  config: ServerPocketBaseConfig
): Promise<string> {
  if (client.authStore.isValid && client.authStore.token) {
    // PocketBase rotates the token on every authRefresh; a valid one is reusable.
    return client.authStore.token;
  }
  const auth = await client.collection('_superusers').authWithPassword(config.adminEmail, config.adminPassword);
  return auth.token;
}
