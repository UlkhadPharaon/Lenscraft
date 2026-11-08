/**
 * Browser PocketBase client.
 *
 * When `VITE_POCKETBASE_URL` is missing the app runs in LOCAL mode:
 * `getPocketBaseClient()` resolves to null and the auth/storage layer falls
 * back to a device-local account persisted in localStorage. This keeps
 * development, previews and the free demo fully functional without
 * credentials.
 *
 * The SDK is imported dynamically so it lands in its own chunk (~90 KB) that
 * is never downloaded when PocketBase is not configured, and is fetched in
 * parallel to the app shell when it is.
 */

const url = import.meta.env?.VITE_POCKETBASE_URL || '';

export const isPocketBaseConfigured = Boolean(url);

export const pocketbaseConfigError = isPocketBaseConfigured
  ? null
  : 'PocketBase n\'est pas configuré (VITE_POCKETBASE_URL manquant). Mode local activé : vos projets restent dans ce navigateur.';

let clientPromise: Promise<import('pocketbase').default | null> | null = null;
let cached: import('pocketbase').default | null | undefined;

/** Resolves the browser PocketBase client (or null in local mode). */
export function getPocketBaseClient(): Promise<import('pocketbase').default | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (!isPocketBaseConfigured) {
    cached = null;
    return Promise.resolve(null);
  }
  if (!clientPromise) {
    clientPromise = import('pocketbase')
      .then(({ default: PocketBase }) => {
        const client = new PocketBase(url);
        // Collapse duplicate in-flight requests (React Strict Mode effects).
        client.autoCancellation(true);
        cached = client;
        return client;
      })
      .catch(error => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}
