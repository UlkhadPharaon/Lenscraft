#!/usr/bin/env node
/**
 * LensCraft AI — export verification (DOCX + PDF) in a real browser.
 *
 * Seeds a synthetic project into localStorage, opens the shot-list page and
 * clicks both export buttons, asserting that a file download is triggered and
 * that the PDF blob is a valid PDF document.
 *
 * Usage: node tests/export.test.mjs   (needs `npm run build` first)
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.EXPORT_PORT || 4184;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

const TREATMENT = {
  id: 'export-test-treatment',
  createdAt: Date.now(),
  analysis: {
    title: 'Clip de test',
    description: 'Une description de test.',
    theme: 'Thème de test',
    rhythm: 'Rythmique de test',
    vibe: 'Ambiance de test',
  },
  script: 'INT. NUIT — EXTÉRIEUR\nLe artiste marche dans la rue.\n\nPLAN 1 : gros plan sur ses yeux.',
  scenes: [
    { sceneNumber: 1, action: 'Le artiste marche', set: 'Rue de Ouaga', actors: 'Artiste', actionDescription: 'Marche lente, nuit' },
  ],
  shotList: [
    { sceneNumber: 1, shotNumber: 1, type: 'Gros plan', cameraMovement: 'Travelling', lens: '50mm', duration: '3s', description: 'Yeux de l\'artiste' },
    { sceneNumber: 1, shotNumber: 2, type: 'Plan large', cameraMovement: 'Fixe', lens: '24mm', duration: '5s', description: 'Rue vide' },
  ],
  schedule: [
    { day: 1, location: 'Ouagadougou', estimatedTime: '10h-18h', scenesToShoot: [1], castNeeded: ['Artiste'], equipmentNeeded: ['Caméra', 'Slider'] },
  ],
  production: {
    prepDays: 2, shootDays: 1, postProdDays: 5,
    locationScouting: 'Repérages centre-ville', rehearsals: '1 jour avec danseurs', otherPrep: 'Costumes',
  },
  promoStrategy: {
    versionId: 'v1', versionName: 'Version 1', createdAt: Date.now(),
    targetAudience: 'Jeunes 18-25', numberOfVideos: 3, trendsAndIdeas: 'Tendance audio lo-fi',
    promoIdeas: [
      { title: 'Teaser nuit', concept: 'Extrait nocturne', script: 'Hook 3s', visualStyle: 'Grain film', viralScore: 8, efficiencyScore: 7, explanation: 'Fort impact émotionnel' },
    ],
  },
};

const LOCAL_USER = {
  id: 'local-export-test',
  email: 'invite@lenscraft.local',
  fullName: 'Créateur local',
  avatarUrl: null,
};

async function main() {
  if (!existsSync(join(ROOT, 'dist'))) {
    console.log('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: 'export-key' },
    stdio: 'ignore',
  });

  const { chromium } = await import('playwright');
  const exe = join(homedir(), 'AppData', 'Local', 'ms-playwright', 'chromium-1248', 'chrome-win64', 'chrome.exe');
  let browser;

  try {
    const start = Date.now();
    let ready = false;
    while (Date.now() - start < 20_000) {
      try { if ((await fetch(`${BASE}/health`)).ok) { ready = true; break; } } catch {}
      await sleep(300);
    }
    check('production server boots', ready);

    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage();

    // Seed a signed-in local session and one project.
    await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(({ treatment, user }) => {
      localStorage.setItem('lenscraft_local_user', JSON.stringify(user));
      localStorage.setItem('lenscraft_projects', JSON.stringify([treatment]));
    }, { treatment: TREATMENT, user: LOCAL_USER });

    // Sign in as guest, then open the seeded project from the dashboard so the
    // treatment becomes the active one.
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /session démo/i }).click();
    await page.waitForURL(`${BASE}/app`, { timeout: 20_000 });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });
    await page.getByText('Clip de test').first().click();
    await page.waitForURL(`${BASE}/app/analysis`, { timeout: 20_000 });
    check('seeded project opens from the dashboard', true);

    // Navigate with in-app links (a full page.goto would reset React state and
    // therefore drop the active treatment — same as the original app).
    await page.getByRole('link', { name: /Plans/ }).first().click();
    await page.waitForURL(`${BASE}/app/shotlist`, { timeout: 20_000 });
    await page.getByText('Découpage Technique').first().waitFor({ timeout: 20_000 });
    check('shot list page renders seeded data', true);

    // ---- DOCX export ------------------------------------------------------
    const docxDownload = page.waitForEvent('download', { timeout: 40_000 });
    await page.getByTitle('Télécharger au format Word').click();
    const docx = await docxDownload;
    const docxName = docx.suggestedFilename();
    check('DOCX export triggers a download', /\.docx$/i.test(docxName), docxName);

    // ---- PDF export -------------------------------------------------------
    const pdfDownload = page.waitForEvent('download', { timeout: 60_000 });
    await page.getByTitle('Télécharger au format PDF').click();
    const pdf = await pdfDownload;
    const pdfName = pdf.suggestedFilename();
    check('PDF export triggers a download', /\.pdf$/i.test(pdfName), pdfName);

    const pdfPath = await pdf.path();
    const { readFileSync } = await import('node:fs');
    const bytes = readFileSync(pdfPath);
    check('PDF file starts with the %PDF magic header', bytes.subarray(0, 5).toString() === '%PDF-', `${bytes.length} bytes`);

    // ---- the rest of the exportable pages render --------------------------
    for (const [label, linkName, heading] of [
      ['analysis', /Analyse/, "Analyse de l'Oeuvre"],
      ['script', /Script/, 'Script & Scénario'],
      ['scenes', /Scènes/, 'Tableau des Scènes'],
      ['schedule', /Planning/, 'Planning de Tournage'],
      ['promo', /Promo/, 'Stratégie Promo & Shorts'],
    ]) {
      await page.getByRole('link', { name: linkName }).first().click();
      await page.getByText(heading).first().waitFor({ timeout: 20_000 });
      check(`${label} renders seeded data`, true);
    }
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('\nLensCraft AI — export tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('EXPORT TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('EXPORT TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
