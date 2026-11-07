#!/usr/bin/env node
/**
 * Verifies the LOCAL (no cloud, no AI) workflow end to end:
 *   guest session -> blank dossier -> edit the analysis -> reload -> data survives.
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4186;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  if (!existsSync(join(ROOT, 'dist'))) {
    console.log('dist/ missing — run `npm run build` first.');
    process.exit(1);
  }

  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: 'local-test' },
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

    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    // Guest session
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /session démo/i }).click();
    await page.waitForURL(`${BASE}/app`, { timeout: 20_000 });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });
    check('guest session reaches the dashboard', true);

    // Create a blank dossier
    await page.getByRole('button', { name: /Dossier vierge/ }).first().click();
    await page.waitForURL(`${BASE}/app/analysis`, { timeout: 20_000 });
    await page.getByText("Analyse de l'Oeuvre").first().waitFor({ timeout: 20_000 });
    check('blank dossier opens on the analysis page', true);

    // Fill in the title through the inline editor (the Layout logo h1 comes first
    // in the DOM, so the page title is the last h1 on the page).
    await page.getByRole('button', { name: /Éditer/ }).first().click();
    const titleInput = page.locator('input').first();
    await titleInput.fill('Mon clip — test local');
    await page.getByRole('button', { name: /Enregistrer/ }).first().click();
    await page.waitForTimeout(500);
    check('blank dossier title saved', ((await page.locator('h1').last().textContent()) || '').includes('Mon clip — test local'));

    // Reload: the project must survive (local persistence)
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    const titleAfterReload = await page.locator('h1').last().textContent().catch(() => '');
    check('project survives a full page reload', (titleAfterReload || '').includes('Mon clip — test local'), (titleAfterReload || '').slice(0, 40));

    // The other sections must render for a blank project
    for (const [key, linkName, heading] of [
      ['script', /Script/, 'Script & Scénario'],
      ['scenes', /Scènes/, 'Tableau des Scènes'],
      ['shotlist', /Plans/, 'Découpage Technique'],
      ['schedule', /Planning/, 'Planning de Tournage'],
      ['promo', /Promo/, 'Stratégie Promo & Shorts'],
    ]) {
      await page.getByRole('link', { name: linkName }).first().click();
      await page.getByText(heading).first().waitFor({ timeout: 20_000 });
      check(`/app/${key} renders for a blank dossier`, true);
    }

    // Add a shot to the blank shot list (navigate back to the shot list first,
    // since the loop above ends on the promo page).
    await page.getByRole('link', { name: /Plans/ }).first().click();
    await page.getByText('Découpage Technique').first().waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: /Éditer/ }).first().click();
    await page.getByRole('button', { name: /Ajouter un Plan/ }).waitFor({ timeout: 20_000 });
    await page.getByRole('button', { name: /Ajouter un Plan/ }).click();
    const rows = await page.locator('tbody tr').count();
    check('a shot can be added to a blank dossier', rows === 1, `${rows} row(s)`);

    // Back to the dashboard: the project must be listed
    await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });
    check('blank dossier appears in the project list', (await page.getByText('Mon clip — test local').count()) > 0);

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('\nLensCraft AI — local-mode tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('LOCAL TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('LOCAL TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
