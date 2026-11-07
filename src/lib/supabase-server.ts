import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client (service role — BYPASSES Row Level Security).
 *
 * ⚠️  This module is SERVER ONLY. It is intentionally NOT imported by any
 * browser bundle: importing it into client code would attempt to read a secret
 * from `process.env`, which does not exist in the browser. Callers must guard
 * against browser usage, hence the explicit check in `getSupabaseServerClient`.
 *
 * The Express server keeps its own instance in `server/supabase-admin.ts`;
 * this helper exists so tooling, scripts and tests can share the same access
 * pattern without duplicating the configuration.
 */
export interface ServerSupabaseConfig {
  url: string;
  serviceRoleKey: string;
}

export function isServerSupabaseConfigured(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): boolean {
  return Boolean(env.VITE_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function getSupabaseServerClient(env: Record<string, string | undefined> = process.env as Record<string, string | undefined>): SupabaseClient {
  const isBrowser = typeof window !== 'undefined';
  if (isBrowser) {
    throw new Error('getSupabaseServerClient() cannot run in the browser — the service role key is secret.');
  }

  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error('Supabase server client requires VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }

  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
