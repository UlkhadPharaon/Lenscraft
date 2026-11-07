/**
 * Vercel serverless entry point.
 *
 * Reuses the Express application from `server/app.ts`; only `/api/*` is routed
 * here (see vercel.json). Static assets and the SPA fallback are handled by
 * Vercel's rewrites, so static serving is disabled.
 */
import { createApp } from '../server/app';

let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) appPromise = createApp({ serveStatic: false });
  return appPromise;
}

export default async function handler(request: any, response: any) {
  const app = await getApp();
  return app(request, response);
}
