/**
 * LensCraft AI — standalone Node entry point.
 *
 * The Express application itself lives in `server/app.ts` so it can be reused by
 * the Vercel serverless function (`api/index.ts`). This file only adds the
 * Node-specific concerns: environment validation, the Vite dev middleware,
 * listening on a port and graceful shutdown.
 */
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { validateEnvironment, env, isProduction, isSupabaseConfigured } from './server/env';
import { createApp } from './server/app';
import { getStripe } from './server/stripe';

// ---------------------------------------------------------------- environment
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const envCheck = validateEnvironment();

if (!envCheck.ok) {
  console.error('\n❌ Configuration error — LensCraft AI cannot start:\n');
  for (const problem of envCheck.fatal) console.error(`   • ${problem}`);
  console.error('\n   Copy .env.example to .env and fill in the missing values.\n');
  process.exit(1);
}

for (const warning of envCheck.warnings) {
  console.warn(`⚠️  ${warning}`);
}

async function startServer() {
  const app = await createApp({ serveStatic: isProduction });

  // Vite middleware only runs in development; `server/app.ts` (the module the
  // Vercel function imports) never references Vite, so the serverless bundle
  // stays lean.
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`\n🎬 LensCraft AI running on http://localhost:${env.port}`);
    console.log(`   Mode: ${isProduction ? 'production' : 'development'} | Data: ${isSupabaseConfigured ? 'supabase' : 'local'} | Billing: ${getStripe() ? 'stripe' : 'disabled'}\n`);
  });

  // Graceful shutdown.
  const shutdown = (signal: string) => {
    console.log(`\n${signal} reçu — arrêt du serveur...`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

void startServer();

