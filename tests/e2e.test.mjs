#!/usr/bin/env node
/**
 * LensCraft AI — browser smoke tests (Playwright, no extra config needed).
 *
 * Verifies in a real Chromium:
 *   1. Landing page renders at `/` with hero + CTA, and no console errors.
 *   2. `/pricing` and `/login` render.
 *   3. `/app` redirects unauthenticated visitors to the auth screen.
 *   4. Local-mode "guest" session unlocks the dashboard.
 *   5. `/app/new` renders the generation form (audio input, YouTube field…).
 *   6. The shot-list bug fix is reachable (no runtime crash on /app/shotlist).
 *
 * Usage: node tests/e2e.test.mjs   (needs `npm run build` first)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.E2E_PORT || 4180;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

/** Locates a Playwright-managed Chromium build without launching a download. */
function findChromium() {
  const dirs = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),
  ].filter(Boolean);
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    for (const candidate of ['chromium-1248', 'chromium-1228', 'chromium-1200']) {
      const exe = join(dir, candidate, 'chrome-win64', 'chrome.exe');
      if (existsSync(exe)) return exe;
    }
  }
  return null;
}

async function main() {
  if (!existsSync(join(ROOT, 'dist'))) {
    console.log('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: process.env.SMOKE_GEMINI_KEY || 'e2e-key' },
    stdio: 'ignore',
  });

  const { chromium } = await import('playwright');
  const executablePath = findChromium();
  let browser;

  try {
    browser = await chromium.launch({
      executablePath: executablePath || undefined,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', err => consoleErrors.push(String(err)));

    // ---- 1. landing -----------------------------------------------------
    await page.goto(BASE, { waitUntil: 'networkidle' });
    const h1 = (await page.textContent('h1')) || '';
    check('landing page renders the hero headline', /5 minutes|dossier de production/i.test(h1), h1.trim().slice(0, 60));
    check('landing shows a primary CTA', (await page.locator('a[href="/signup"]').count()) > 0);
    check('landing shows the footer brand', (await page.locator('text=LensCraft AI').count()) > 0);
    check('landing: no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));

    // ---- 2. pricing / login ---------------------------------------------
    await page.goto(`${BASE}/pricing`, { waitUntil: 'networkidle' });
    check('pricing page renders plan cards', (await page.locator('text=5 000 FCFA').count()) > 0);

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    const loginBody = await page.textContent('body');
    check('login page renders the local-mode notice', /Supabase n'est pas configur/i.test(loginBody));

    // ---- 3. auth guard ---------------------------------------------------
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    check('unauthenticated /app is protected (no dashboard)', !/Mes Projets/i.test(await page.textContent('body')));

    // ---- 4. local guest session ------------------------------------------
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /session démo/i }).click();
    await page.waitForURL(`${BASE}/app`, { timeout: 15_000 });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 15_000 });
    check('guest session reaches the dashboard', page.url().endsWith('/app'));

    // ---- 5. new project form --------------------------------------------
    await page.goto(`${BASE}/app/new`, { waitUntil: 'networkidle' });
    const formVisible = await page.locator('input[type="url"]').count();
    const hasFileInput = (await page.locator('input[type="file"]').count()) > 0;
    check('new project form renders (YouTube URL field + audio upload)', formVisible > 0 && hasFileInput);

    // ---- 5b. seed a project so the editing pages have data ----------------
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      const treatment = {
        id: 'e2e-treatment',
        createdAt: Date.now(),
        analysis: { title: 'Clip E2E', description: 'd', theme: 't', rhythm: 'r', vibe: 'v' },
        script: 'INT. NUIT', scenes: [{ sceneNumber: 1, action: 'a', set: 's', actors: 'ac', actionDescription: 'ad' }],
        shotList: [
          { sceneNumber: 1, shotNumber: 1, type: 'Gros plan', cameraMovement: 'Fixe', lens: '50mm', duration: '3s', description: 'x' },
          { sceneNumber: 1, shotNumber: 2, type: 'Plan large', cameraMovement: 'Travelling', lens: '24mm', duration: '5s', description: 'y' },
        ],
        schedule: [{ day: 1, location: 'Ouaga', estimatedTime: '10h', scenesToShoot: [1], castNeeded: ['Artiste'], equipmentNeeded: ['Caméra'] }],
        production: { prepDays: 1, shootDays: 1, postProdDays: 3, locationScouting: 'r', rehearsals: 'r', otherPrep: 'o' },
        promoStrategy: { versionId: 'v1', versionName: 'V1', targetAudience: 'a', numberOfVideos: 2, trendsAndIdeas: 't', promoIdeas: [] },
      };
      localStorage.setItem('lenscraft_projects', JSON.stringify([treatment]));
    });
    await page.reload({ waitUntil: 'networkidle' });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });
    await page.getByText('Clip E2E').first().click();
    await page.waitForURL(`${BASE}/app/analysis`, { timeout: 20_000 });
    check('seeded project opens from the dashboard', true);

    // ---- 6. protected pages render (in-app navigation keeps state) --------
    for (const [key, linkName, heading] of [
      ['shotlist', /Plans/, 'Découpage Technique'],
      ['schedule', /Planning/, 'Planning de Tournage'],
      ['promo', /Promo/, 'Stratégie Promo & Shorts'],
      ['scenes', /Scènes/, 'Tableau des Scènes'],
      ['script', /Script/, 'Script & Scénario'],
      ['analysis', /Analyse/, "Analyse de l'Oeuvre"],
    ]) {
      await page.getByRole('link', { name: linkName }).first().click();
      await page.getByText(heading).first().waitFor({ timeout: 20_000 });
      check(`/app/${key} renders seeded data`, true);
    }

    // ---- 7. ShotList "add shot" produces the correct shape (C2) -----------
    await page.getByRole('link', { name: /Plans/ }).first().click();
    await page.getByText('Découpage Technique').first().waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: /Éditer/ }).first().click();
    await page.getByRole('button', { name: /Ajouter un Plan/ }).waitFor({ timeout: 20_000 });
    const rowsBefore = await page.locator('tbody tr').count();
    await page.getByRole('button', { name: /Ajouter un Plan/ }).click();
    const rows = await page.locator('tbody tr').count();
    check('adding a shot appends a row (2 -> 3)', rows === rowsBefore + 1, `${rowsBefore} -> ${rows} rows`);
    const cellText = await page.locator('tbody tr').last().locator('td').first().textContent();
    // sceneNumber/shotNumber must be numbers -> zero-padded "01/03"
    check('new shot uses numeric scene/shot numbers', /01\/03/.test(cellText || ''), (cellText || '').trim());
    check('new shot exposes an editable Type input',
      (await page.locator('tbody tr').last().locator('input').count()) > 0);

    check('no console errors across the whole flow', consoleErrors.length === 0, consoleErrors.slice(0, 3).join(' | '));
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('\nLensCraft AI — browser smoke tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('E2E TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('E2E TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
