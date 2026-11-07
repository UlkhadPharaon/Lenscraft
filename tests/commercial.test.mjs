#!/usr/bin/env node
/**
 * Verifies the newly added commercial features in a real browser:
 *   - /api/config advertises the provider, models and currency
 *   - the pricing page shows Franc CFA
 *   - a local (non-Stripe) upgrade activates the Pro plan and the quota badge
 *   - the promo idea bank inserts a ready-made concept without any API key
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4187;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const PROJECT = {
  id: 'billing-test',
  createdAt: Date.now(),
  analysis: { title: 'Clip Billing', description: 'd', theme: 't', rhythm: 'r', vibe: 'v' },
  script: 'INT. NUIT', scenes: [{ sceneNumber: 1, action: 'a', set: 's', actors: 'ac', actionDescription: 'ad' }],
  shotList: [{ sceneNumber: 1, shotNumber: 1, type: 'Gros plan', cameraMovement: 'Fixe', lens: '50mm', duration: '3s', description: 'x' }],
  schedule: [{ day: 1, location: 'Ouaga', estimatedTime: '10h', scenesToShoot: [1], castNeeded: ['Artiste'], equipmentNeeded: ['Caméra'] }],
  production: { prepDays: 1, shootDays: 1, postProdDays: 2, locationScouting: 'r', rehearsals: 'r', otherPrep: 'o' },
};

async function main() {
  if (!existsSync(join(ROOT, 'dist'))) {
    console.log('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: 'billing-test' },
    stdio: 'ignore',
  });

  const { chromium } = await import('playwright');
  const exe = join(homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');
  let browser;

  try {
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      try { if ((await fetch(`${BASE}/health`)).ok) break; } catch {}
      await sleep(300);
    }

    // ---- 1. /api/config ---------------------------------------------------
    const config = await (await fetch(`${BASE}/api/config`)).json();
    check('/api/config advertises a provider', config.provider === 'gemini' || config.provider === 'openrouter', config.provider);
    check('/api/config advertises models', Array.isArray(config.models) && config.models.length > 0, `${config.models?.length} models`);
    check('/api/config currency is FCFA', String(config.currency).toLowerCase() === 'xof', config.currency);
    check('/api/config allows local upgrade', config.upgradeEnabled === true);

    // ---- 2. demo upgrade endpoint ----------------------------------------
    const upgrade = await fetch(`${BASE}/api/upgrade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tier: 'pro' }),
    });
    const upgradeBody = await upgrade.json();
    check('POST /api/upgrade activates a plan without Stripe',
      upgrade.ok && upgradeBody.demo === true && upgradeBody.tier === 'pro', JSON.stringify(upgradeBody));

    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    // ---- 3. pricing page in FCFA -----------------------------------------
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle' });
    const pricingText = await page.textContent('body');
    check('pricing page prices in Franc CFA', /5\s?000 FCFA/.test(pricingText) && /15\s?000 FCFA/.test(pricingText));
    check('pricing page mentions the currency', /Franc CFA/i.test(pricingText));

    // ---- 4. guest session + project --------------------------------------
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.evaluate(({ project }) => {
      localStorage.setItem('lenscraft_local_user', JSON.stringify({ id: 'local-billing', email: 'i@l.local', fullName: 'Local', avatarUrl: null }));
      localStorage.setItem('lenscraft_projects', JSON.stringify([project]));
    }, { project: PROJECT });
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /session démo/i }).click();
    await page.waitForURL(`${BASE}/app`, { timeout: 20_000 });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });
    check('guest session reaches the dashboard', true);

    // ---- 5. upgrade from the UI ------------------------------------------
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /Passer au Pro/ }).click();
    await sleep(2000);
    const afterUpgrade = await page.textContent('body');
    check('UI upgrade marks the Pro plan active', /Actif/.test(afterUpgrade));

    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    const dashboardText = await page.textContent('body');
    check('dashboard shows the unlimited Pro badge', /Pro — illimité/i.test(dashboardText));

    // ---- 6. idea bank ---------------------------------------------------
    await page.getByText('Clip Billing').first().click();
    await page.waitForURL(`${BASE}/app/analysis`, { timeout: 20_000 });
    await page.getByRole('link', { name: /Promo/ }).first().click();
    await page.getByText('Stratégie Promo & Shorts').first().waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: /Banque d'idées/ }).first().click();
    await page.getByRole('button', { name: /Ajouter ce concept/ }).first().click();
    await sleep(1200);
    const promoText = await page.textContent('body');
    check('idea bank inserts a concept without an API key', /Le hook 3 secondes/.test(promoText));

    // Favourite it
    await page.locator('button[title="Ajouter aux favoris"]').first().click();
    await sleep(600);
    const favText = await page.textContent('body');
    check('a concept can be starred as a favourite', /Favoris \(1\)/.test(favText));

    // Quick filter
    await page.getByRole('button', { name: /Favoris/ }).first().click();
    await sleep(500);
    check('the favourites filter keeps only starred concepts', (await page.locator('button[title="Retirer des favoris"]').count()) === 1);

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('\nLensCraft AI — commercial features tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('COMMERCIAL TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('COMMERCIAL TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
