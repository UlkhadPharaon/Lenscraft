#!/usr/bin/env node
/**
 * Verifies the market-validation survey pipeline:
 *   POST /api/survey stores a response, /api/survey/stats aggregates it,
 *   /api/survey/export returns CSV, and the survey page renders.
 */
import { spawn } from 'node:child_process';
import { existsSync, rmSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4192;
const BASE = `http://127.0.0.1:${PORT}`;
const STORE = join(ROOT, 'data', 'survey-responses.jsonl');

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Start from a clean slate so counts are deterministic.
  rmSync(STORE, { force: true });

  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: 'survey-test' },
    stdio: 'ignore',
  });

  const { chromium } = await import('playwright');
  const { homedir } = await import('node:os');
  const exe = join(homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');
  let browser;

  try {
    const start = Date.now();
    while (Date.now() - start < 20_000) {
      try { if ((await fetch(`${BASE}/health`)).ok) break; } catch {}
      await sleep(300);
    }

    // ---- 1. survey page renders -------------------------------------------
    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    await page.goto(`${BASE}/survey?src=whatsapp`, { waitUntil: 'networkidle' });
    const firstQuestion = await page.locator('h1').first().textContent();
    check('survey renders the first question', /Vous êtes/.test(firstQuestion || ''), (firstQuestion || '').slice(0, 40));
    check('survey shows a progress counter', /Question 1 \/ 11/.test(await page.textContent('body')));

    // ---- 2. answering stores responses (server side) ---------------------
    const payload = {
      source: 'whatsapp',
      answers: {
        role: 'Artiste indépendant',
        clips_per_year: '3 à 5',
        current_method: 'Tout seul(e), à la main',
        biggest_blocker: 'La liste de plans',
        time_spent: 'Une semaine',
        paid_before: '25 000 à 100 000 FCFA',
        willing_to_pay: '5 000 FCFA',
        top_feature: 'Stratégie promo (TikTok, Reels, Shorts)',
        platforms: ['TikTok', 'Instagram Reels'],
        trial_interest: 'Oui, envoyez-moi l’accès',
        email: 'artiste@example.com',
      },
    };

    const post = await fetch(`${BASE}/api/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const postBody = await post.json();
    check('POST /api/survey accepts a response', post.ok && postBody.ok === true);
    check('response persisted to data/survey-responses.jsonl', existsSync(STORE));

    // A second response to exercise aggregation.
    await fetch(`${BASE}/api/survey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source: 'instagram',
        answers: {
          role: 'Réalisateur ou chef opérateur',
          clips_per_year: '6 à 10',
          current_method: 'Je paie un freelance ou consultant',
          biggest_blocker: 'Le planning de tournage',
          time_spent: '1 à 3 jours',
          paid_before: 'Plus de 300 000 FCFA',
          willing_to_pay: '15 000 FCFA ou plus',
          top_feature: 'Planning de tournage',
          platforms: ['YouTube Shorts'],
          trial_interest: 'Peut-être plus tard',
        },
      }),
    });

    // ---- 3. stats + export ------------------------------------------------
    const stats = await (await fetch(`${BASE}/api/survey/stats`)).json();
    check('/api/survey/stats counts 2 responses', stats.stats?.total === 2, String(stats.stats?.total));
    check('/api/survey/stats tracks the source channel',
      stats.stats?.bySource?.whatsapp === 1 && stats.stats?.bySource?.instagram === 1);
    check('/api/survey/stats counts leads willing to test', stats.stats?.withEmail === 1);

    const csvResponse = await fetch(`${BASE}/api/survey/export`);
    const csv = await csvResponse.text();
    check('CSV export is a real CSV with a header row', csv.startsWith('date,source,role,clips_per_year') && csv.includes('artiste@example.com'));
    check('CSV export sets a filename header', /attachment; filename="lenscraft-survey\.csv"/.test(csvResponse.headers.get('content-disposition') || ''));

    // ---- 4. results dashboard --------------------------------------------
    await page.goto(`${BASE}/survey/results`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const resultsText = await page.textContent('body');
    check('results dashboard renders headline numbers', /Résultats de l'étude de marché/.test(resultsText));
    check('results dashboard shows the demand score', /Score de demande/.test(resultsText));
    check('results dashboard aggregates one question', /Vous êtes/.test(resultsText));
    check('results dashboard shows the CSV button', (await page.locator('text=CSV').count()) > 0);

    // ---- 5. full questionnaire flow in the browser -----------------------
    await page.goto(`${BASE}/survey?src=whatsapp`, { waitUntil: 'networkidle' });
    await page.locator('button', { hasText: 'Artiste indépendant' }).first().click();
    await sleep(400);
    await page.locator('button', { hasText: '1 à 2' }).first().click();
    await sleep(400);
    check('single-choice answers advance automatically', /Question 3/.test(await page.textContent('body')));

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } finally {
    await browser?.close();
    server.kill();
    rmSync(STORE, { force: true });
  }

  console.log('\nLensCraft AI — market research tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('SURVEY TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('SURVEY TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
