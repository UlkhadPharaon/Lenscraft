/**
 * API helpers: single place for auth headers, JSON POSTs and retry logic.
 */

export interface RequestOptions {
  body?: unknown;
  /** Authorization token; resolved automatically from Supabase when omitted. */
  token?: string | null;
  /** Attempts before giving up (default 3). */
  retries?: number;
  signal?: AbortSignal;
  /** Overrides the BYOK credentials attached by default. */
  ai?: { provider: string; apiKey: string } | null;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

const RETRYABLE_STATUSES = new Set([429, 502, 503, 504]);

let fallbackTokenProvider: (() => Promise<string | null>) | null = null;
/** Attached by AppProvider so every request can carry the caller's own AI key. */
let fallbackCredentialsProvider: (() => { provider: string; apiKey: string } | null) | null = null;

/** Registers the auth token provider (called once by AppProvider). */
export function setTokenProvider(provider: () => Promise<string | null>) {
  fallbackTokenProvider = provider;
}

/** Registers the BYOK credentials provider (called once by AppProvider). */
export function setCredentialsProvider(provider: () => { provider: string; apiKey: string } | null) {
  fallbackCredentialsProvider = provider;
}

export async function resolveToken(): Promise<string | null> {
  if (fallbackTokenProvider) return fallbackTokenProvider();
  return null;
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

export async function postJson<T = any>(url: string, options: RequestOptions = {}): Promise<T> {
  const { body, token, retries = 3, signal, ai } = options;

  const authToken = token !== undefined ? token : await resolveToken();
  const credentials = ai !== undefined ? ai : (fallbackCredentialsProvider ? fallbackCredentialsProvider() : null);

  // A user-supplied key travels inside the request body — never in a header or a log.
  const payload = credentials?.apiKey
    ? { ...(body && typeof body === 'object' ? body : {}), ai: { provider: credentials.provider, apiKey: credentials.apiKey } }
    : body;

  let lastError: Error = new Error('Requête échouée.');

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken && authToken !== 'local-mode') headers.Authorization = `Bearer ${authToken}`;

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload ?? {}),
        signal,
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error || `Échec de la requête (erreur ${response.status}).`;

      if (RETRYABLE_STATUSES.has(response.status) && attempt < retries) {
        lastError = new ApiError(message, response.status);
        // Exponential backoff: 1s, 2s, 4s...
        await sleep(1000 * 2 ** (attempt - 1));
        continue;
      }

      throw new ApiError(message, response.status);
    } catch (error: any) {
      if (error instanceof ApiError) throw error;
      if ((error as Error)?.name === 'AbortError') throw error;

      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < retries) {
        await sleep(1000 * 2 ** (attempt - 1));
      }
    }
  }

  throw lastError;
}

/** Human-friendly message for any thrown error. */
export function messageFor(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return 'Une erreur inattendue est survenue.';
}
