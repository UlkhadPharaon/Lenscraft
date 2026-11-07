/**
 * Browser Supabase client (anon key — safe to ship to the browser).
 *
 * When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are missing the app runs
 * in LOCAL mode: `getSupabaseClient()` resolves to null and the auth/storage
 * layer falls back to a device-local account persisted in localStorage. This
 * keeps development, previews and the free demo fully functional without
 * credentials.
 *
 * The SDK is imported dynamically so it lands in its own chunk (~300 KB) that
 * is never downloaded when Supabase is not configured, and is fetched in
 * parallel to the app shell when it is.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env?.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabaseConfigError = isSupabaseConfigured
  ? null
  : 'Supabase n\'est pas configuré (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquants). Mode local activé : vos projets restent dans ce navigateur.';

let clientPromise: Promise<SupabaseClient | null> | null = null;
let cached: SupabaseClient | null | undefined;

/** Resolves the browser Supabase client (or null in local mode). */
export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!isSupabaseConfigured) {
    cached = null;
    return Promise.resolve(null);
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(({ createClient }) =>
        createClient(url, anonKey, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            flowType: 'pkce',
          },
        }),
      )
      .then(client => {
        cached = client;
        return client;
      });
  }
  return clientPromise;
}
