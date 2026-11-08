/**
 * LensCraft AI — dependency-free JSON body parsing for Express.
 *
 * Why this exists: `express.json()` / `express.raw()` go through
 * body-parser → raw-body → iconv-lite. iconv-lite calls
 * `require("./streams")(iconv)` at module scope, which Wrangler's `require`
 * shim mangles when the app is bundled for Cloudflare Workers
 * ("require_streams(...) is not a function").
 *
 * Reading the request stream directly keeps runtime behaviour identical on
 * Node.js (npm run dev / npm start), Vercel and Cloudflare Workers, while
 * dropping that whole dependency from the bundle.
 */
import type { Request, Response, NextFunction } from 'express';

/** Converts a body-parser style limit ("50mb", "1kb", 1024) into bytes. */
export function parseLimit(limit: string | number): number {
  if (typeof limit === 'number') return limit;
  const match = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?\s*$/i.exec(limit);
  if (!match) throw new Error(`Invalid byte size: ${limit}`);
  const units: Record<string, number> = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 };
  return Math.floor(Number(match[1]) * (units[match[2].toLowerCase()] ?? 1));
}

/**
 * Reads a request body into a single Buffer, rejecting with a 413 once the
 * limit is exceeded. Works with both Node's IncomingMessage and the
 * stream-shaped object supplied by the Cloudflare Worker adapter.
 */
export function readBody(req: Request, maxBytes: number): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    let failed = false;

    req.on('data', (chunk: Buffer) => {
      if (failed) return;
      size += chunk.length;
      if (size > maxBytes) {
        failed = true;
        const error: any = new Error('request entity too large');
        error.status = 413;
        error.statusCode = 413;
        error.type = 'entity.too.large';
        reject(error);
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => { if (!failed) resolve(Buffer.concat(chunks)); });
    req.on('error', (error: Error) => { if (!failed) reject(error); });
    req.on('aborted', () => {
      if (failed) return;
      failed = true;
      const error: any = new Error('request aborted');
      error.statusCode = 400;
      reject(error);
    });
  });
}

/** Skips parsing when a route/earlier middleware already filled `req.body`. */
function alreadyParsed(req: Request): boolean {
  return (req as any)._body === true || req.body !== undefined;
}

function markParsed(req: Request): void {
  (req as any)._body = true;
}

/**
 * JSON body parser — drop-in replacement for `express.json({ limit })`.
 * Also tolerates an empty body (`req.body` becomes `undefined`).
 */
export function jsonBody(limit: string | number = '100kb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (alreadyParsed(req)) return next();

    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.includes('application/json')) return next();

    readBody(req, parseLimit(limit))
      .then((raw) => {
        const text = raw.toString('utf8');
        req.body = text ? JSON.parse(text) : undefined;
        markParsed(req);
        next();
      })
      .catch((error) => next(error));
  };
}

/**
 * Raw body parser — drop-in replacement for `express.raw({ type })`.
 * Required by Stripe webhook signature verification, which needs the exact
 * bytes that were signed.
 */
export function rawBody(type: string, limit: string | number = '100kb') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (alreadyParsed(req)) return next();

    const contentType = String(req.headers['content-type'] || '');
    if (type && !contentType.includes(type)) return next();

    readBody(req, parseLimit(limit))
      .then((raw) => {
        req.body = raw;
        markParsed(req);
        next();
      })
      .catch((error) => next(error));
  };
}
