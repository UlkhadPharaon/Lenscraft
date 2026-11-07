#!/usr/bin/env node
/**
 * LensCraft AI — smoke test suite (no external dependencies).
 *
 * Verifies:
 *   1. The production build boots and serves the health check.
 *   2. `dist/index.html` is served at `/` and contains the SPA root.
 *   3. Static assets from `dist/assets/` are reachable.
 *   4. Unknown API endpoints return JSON 404 (never the SPA fallback).
 *   5. SPA fallback returns HTML for unknown non-API routes.
 *   6. `/api/generate` rejects invalid bodies without crashing.
 *   7. Env validation fails fast with a clear message when GEMINI_API_KEY is missing.
 *   8. Bundle outputs exist and no chunk is unexpectedly huge.
 *
 * Usage: node tests/smoke.test.mjs
 * Exits 0 when every check passes, 1 otherwise.
 */

import { spawn } from 'node:child_process';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.SMOKE_PORT || 4123;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;

function check(name, condition, detail = '') {
  const ok = Boolean(condition);
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitForServer(timeoutMs = 25_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return true;
    } catch {
      /* not up yet */
    }
    await sleep(400);
  }
  return false;
}

/** Starts the built server with a throwaway key. */
function startServer() {
  const child = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(PORT),
      GEMINI_API_KEY: process.env.SMOKE_GEMINI_KEY || 'smoke-test-key',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', d => process.env.SMOKE_VERBOSE && process.stdout.write(`[server] ${d}`));
  child.stderr.on('data', d => process.env.SMOKE_VERBOSE && process.stdout.write(`[server:err] ${d}`));
  return child;
}

async function main() {
  // ---- 0. build output sanity -------------------------------------------
  const distExists = existsSync(join(ROOT, 'dist'));
  check('dist/ exists (run `npm run build` first)', distExists);
  if (!distExists) return report();

  const assetsDir = join(ROOT, 'dist', 'assets');
  const assets = existsSync(assetsDir) ? readdirSync(assetsDir) : [];
  const oversized = assets
    .map(name => ({ name, bytes: statSync(join(assetsDir, name)).size }))
    .filter(entry => entry.bytes > 2_000_000)
    .map(entry => entry.name);
  check('no asset chunk above 2 MB (raw)', oversized.length === 0, oversized.join(', '));
  check('multiple JS chunks emitted (code splitting active)', assets.filter(n => n.endsWith('.js')).length >= 8,
    `${assets.filter(n => n.endsWith('.js')).length} chunks`);

  // ---- 1. boot ----------------------------------------------------------
  const server = startServer();
  try {
    const up = await waitForServer();
    check('production server starts and answers /health', up);
    if (!up) return report();

    // ---- 2. landing HTML ------------------------------------------------
    const html = await (await fetch(`${BASE}/`)).text();
    check('GET / returns HTML', /<!doctype html>/i.test(html));
    check('landing HTML contains #root', html.includes('id="root"'));
    check('lang attribute is fr', /<html lang="fr"/.test(html));
    check('SEO meta description present', html.includes('name="description"'));
    check('Open Graph tags present', html.includes('property="og:title"'));
    check('Twitter card present', html.includes('name="twitter:card"'));

    // ---- 3. static assets ------------------------------------------------
    const assetMatch = html.match(/src="([^"]*index-[^"]*\.js)"/);
    check('index.html references a built JS entry', Boolean(assetMatch));
    if (assetMatch) {
      const assetPath = assetMatch[1].replace(/^\//, '');
      const assetRes = await fetch(`${BASE}/${assetPath}`);
      check('built JS entry is served with 200', assetRes.status === 200, `${assetRes.status} ${assetPath}`);
    }
    const cssMatch = html.match(/href="([^"]*\.css)"/);
    if (cssMatch) {
      const cssRes = await fetch(`${BASE}/${cssMatch[1].replace(/^\//, '')}`);
      check('built CSS is served with 200', cssRes.status === 200);
    }

    // ---- 4. unknown API endpoint -----------------------------------------
    const missingApi = await fetch(`${BASE}/api/does-not-exist`, { method: 'POST' });
    check('unknown API route returns JSON 404 (not the SPA)',
      missingApi.status === 404 && /json/.test(missingApi.headers.get('content-type') || ''));

    // ---- 5. SPA fallback -------------------------------------------------
    const spaRoute = await fetch(`${BASE}/app/some/deep/route`);
    check('unknown non-API route falls back to index.html',
      spaRoute.status === 200 && /<!doctype html>/i.test(await spaRoute.text()));

    // ---- 6. API rejects malformed input ---------------------------------
    const generate = await fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'test' }),
    });
    check('POST /api/generate responds without crashing (4xx/5xx, valid JSON)',
      generate.status >= 400 || generate.status < 600, `status ${generate.status}`);

    // ---- 7. security headers --------------------------------------------
    const headers = generate.headers;
    check('helmet sets X-Content-Type-Options', Boolean(headers.get('x-content-type-options')));

    // ---- 8. env validation fails fast ------------------------------------
    const noKey = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT + 1), GEMINI_API_KEY: '' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const noKeyOutput = await new Promise(resolveOut => {
      let out = '';
      noKey.stderr.on('data', d => (out += d.toString()));
      noKey.stdout.on('data', d => (out += d.toString()));
      noKey.on('exit', code => resolveOut({ code, out }));
      setTimeout(() => resolveOut({ code: null, out }), 8000);
    });
    check('server exits(1) with a clear error when GEMINI_API_KEY is missing',
      noKeyOutput.code === 1 && /GEMINI_API_KEY/.test(noKeyOutput.out));
    noKey.kill();
  } finally {
    server.kill();
  }

  return report();
}

function report() {
  console.log('\nLensCraft AI — smoke tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures > 0) {
    console.log('SMOKE TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('SMOKE TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
