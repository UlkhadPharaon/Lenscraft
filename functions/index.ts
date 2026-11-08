/**
 * LensCraft AI — Cloudflare Worker entry point.
 *
 * Architecture:
 *   • The Vite build in ./dist is served as Workers Static Assets (see
 *     wrangler.toml → [assets]), including SPA deep-link fallback.
 *   • The existing Express application (server/app.ts) is mounted unchanged for
 *     `/api/*` and `/health`. Vercel keeps using api/index.ts; nothing in the
 *     Express app had to be rewritten.
 *
 * Why the adapter layer exists: Express is written against the Node.js
 * `http` module (`IncomingMessage` / `ServerResponse`), while Workers hand the
 * fetch handler a WHATWG `Request`. This module bridges the two:
 *   1. Cloudflare bindings (vars + secrets) are copied onto `process.env`
 *      *before* the Express app is imported, because server/env.ts validates
 *      the environment at module scope.
 *   2. The `Request` is wrapped in a Node-`stream`-shaped object so that
 *      `express.json()` / `express.raw()` (body-parser) can consume the body.
 *   3. `ServerResponse` is mocked on top of `Headers` + a chunk buffer, and the
 *      returned `Response` is resolved when the response finishes.
 */

export interface WorkerEnv {
  [key: string]: unknown;
  ASSETS: { fetch: (request: Request) => Response | Promise<Response> };
}

type ExpressApp = (req: any, res: any) => void;

// Reused across requests — module-level act as an isolate-level singleton.
let appPromise: Promise<ExpressApp> | null = null;

/** Lazy-loads the Express app *after* process.env has been populated. */
function getApp(): Promise<ExpressApp> {
  if (!appPromise) {
    // Dynamic import defers the module side-effects in server/app.ts
    // (dotenv.config() + validateEnvironment()) until env vars are in place.
    appPromise = import('../server/app').then(({ createApp }) =>
      createApp({ serveStatic: false }) as unknown as Promise<ExpressApp>
    );
  }
  return appPromise;
}

/**
 * Copies Cloudflare bindings into `process.env`.
 * Wrangler `vars` and `wrangler secret put` values both surface as plain
 * strings on `env`; everything else (service bindings, Durable Objects…)
 * is skipped.
 */
function bindEnv(env: WorkerEnv): void {
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  }
}

/**
 * Wraps a WHATWG body in a minimal Node readable stream so body-parser's
 * `on('data')` / `on('end')` contract keeps working inside the worker.
 */
function createNodeReadable(body: ArrayBuffer | null): any {
  const buf = body && body.byteLength ? Buffer.from(body) : null;
  const listeners: Record<string, Array<(...args: any[]) => void>> = {};

  const stream: any = {
    readable: true,
    readableEnded: false,
    aborted: false,
    complete: false,
    on(event: string, cb: (...args: any[]) => void) {
      (listeners[event] ||= []).push(cb);
      return stream;
    },
    once(event: string, cb: (...args: any[]) => void) {
      (listeners[event] ||= []).push(cb);
      return stream;
    },
    off() {},
    removeListener() {},
    emit(event: string, ...args: any[]) {
      (listeners[event] || []).forEach((cb) => cb(...args));
      return true;
    },
    pause() { return stream; },
    resume() { return stream; },
    pipe() { return stream; },
    unpipe() { return stream; },
    destroy() {},
    setEncoding() { return stream; },
    read() { return null; },
  };

  // Deliver the body on a later macrotask — body-parser attaches its
  // listeners synchronously, so firing immediately would lose them.
  setTimeout(() => {
    try {
      if (buf) stream.emit('data', buf);
      stream.readableEnded = true;
      stream.complete = true;
      stream.emit('end');
    } catch {
      /* listener threw: body-parser already surfaced the error */
    }
  }, 0);

  return stream;
}

/**
 * Mocks enough of Node's `ServerResponse` for Express: header handling,
 * chunked writes and the `finish` event the app relies on for logging.
 */
function createNodeResponse(): any {
  const headers = new Headers();
  const chunks: Array<Uint8Array> = [];
  const finishListeners: Array<() => void> = [];

  const res: any = {
    statusCode: 200,
    statusMessage: '',
    headersSent: false,
    writableEnded: false,
    finished: false,

    setHeader(name: string, value: string | number | readonly string[]) {
      if (Array.isArray(value)) {
        // Node allows multiple values; Headers only exposes per-key entries
        // until set(); use append for the remaining ones.
        headers.set(name, String(value[0]));
        for (const v of value.slice(1)) headers.append(name, String(v));
      } else {
        headers.set(name, String(value));
      }
    },
    getHeader(name: string) { return headers.get(name); },
    hasHeader(name: string) { return headers.has(name); },
    removeHeader(name: string) { headers.delete(name); },
    getHeaders() {
      const out: Record<string, string> = {};
      headers.forEach((value, key) => { out[key] = value; });
      return out;
    },
    // Node's writeHead after-the-fact is rare here; helmet/finalhandler use it.
    writeHead(code: number, obj?: Record<string, string | string[]>) {
      res.statusCode = code;
      if (obj) for (const [k, v] of Object.entries(obj)) res.setHeader(k, v);
      return res;
    },

    write(chunk?: string | Uint8Array, encoding?: unknown, cb?: () => void): boolean {
      if (chunk) chunks.push(typeof chunk === 'string' ? new TextEncoder().encode(chunk) : new Uint8Array(chunk));
      res.headersSent = true;
      if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      return true;
    },
    end(chunk?: string | Uint8Array, encoding?: unknown, cb?: () => void) {
      if (chunk) res.write(chunk as any);
      res.writableEnded = true;
      res.finished = true;
      if (typeof encoding === 'function') encoding();
      else if (typeof cb === 'function') cb();
      res._finish();
      return res;
    },
    on(event: string, cb: () => void) {
      if (event === 'finish' || event === 'close') finishListeners.push(cb);
      return res;
    },
    once(event: string, cb: () => void) { return res.on(event, cb); },
    emit() { return true; },
    removeListener() {},
    flushHeaders() {},
    cork() {},
    uncork() {},

    /** Builds the final WHATWG Response from the accumulated state. */
    _finalize(): Response {
      const body = chunks.length ? new Uint8Array(chunks.reduce((n, c) => n + c.byteLength, 0)) : null;
      if (body) {
        let offset = 0;
        for (const c of chunks) { body.set(c, offset); offset += c.byteLength; }
      }
      return new Response(body, {
        status: res.statusCode,
        statusText: res.statusMessage || undefined,
        headers,
      });
    },
    _finish() {
      res.finished = true;
      const snapshot = [...finishListeners];
      finishListeners.length = 0;
      for (const cb of snapshot) {
        try { cb(); } catch { /* a logging listener must never break the response */ }
      }
    },
  };

  return res;
}

/** Transforms a WHATWG Request into a Node-shaped one Express can route. */
function toNodeRequest(req: Request, body: ArrayBuffer | null): any {
  const url = new URL(req.url);
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

  const nodeReq: any = {
    method: req.method,
    url: url.pathname + url.search,
    headers,
    httpVersionMajor: 1,
    httpVersionMinor: 1,
    // Express computes hostname/protocol from these two (trust proxy = 1).
    socket: { encrypted: false, remoteAddress: undefined },
    connection: undefined,

    get(name: string) { return headers[String(name).toLowerCase()]; },
    header(name: string) { return nodeReq.get(name); },
    // Minimal content-negotiation stubs — unused by this API surface.
    accepts() { return undefined; },
    acceptsEncodings() { return undefined; },
    acceptsCharsets() { return undefined; },
    acceptsLanguages() { return undefined; },
    range() { return undefined; },
    is() { return null; },
    getOutgoingHeader() {},
  };

  // Merge the stream interface so body-parser can read the body.
  const stream = createNodeReadable(body);
  for (const key of ['on', 'once', 'emit', 'pause', 'resume', 'pipe', 'read', 'destroy']) {
    nodeReq[key] = stream[key];
  }
  nodeReq.readable = stream.readable;
  nodeReq.res = undefined;

  return nodeReq;
}

/** Runs the Express app and resolves with the WHATWG equivalent Response. */
async function runExpress(request: Request): Promise<Response> {
  const body = await request.arrayBuffer().catch(() => null);
  const nodeReq = toNodeRequest(request, body);
  const nodeRes = createNodeResponse();
  const app = await getApp();

  return new Promise<Response>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Response('Worker timeout while the API was handling the request.', { status: 504 }));
    }, 25_000); // stays inside the 30 s free-tier Worker budget

    nodeRes._finish = () => {
      clearTimeout(timer);
      resolve(nodeRes._finalize());
    };

    try {
      app(nodeReq, nodeRes);
    } catch (error) {
      clearTimeout(timer);
      reject(error);
    }
  });
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    bindEnv(env);

    // API surface keeps running on Express; everything else is a static asset.
    if (url.pathname === '/health' || url.pathname.startsWith('/api/')) {
      try {
        return await runExpress(request);
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[lenscraft] API failure:', err.stack ?? err);
        return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Static assets, with explicit SPA fallback for extension-less deep links
    // (BrowserRouter routes such as /pricing or /app/analysis).
    const assetResponse = await env.ASSETS.fetch(request);
    if (assetResponse.status === 404) {
      return env.ASSETS.fetch(new Request(new URL('/', request.url), { method: 'GET' }));
    }
    return assetResponse;
  },
};
