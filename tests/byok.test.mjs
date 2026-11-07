#!/usr/bin/env node
/**
 * Verifies the BYOK (bring your own key) layer:
 *   - /api/config advertises the providers and byokEnabled
 *   - /api/models returns the live NVIDIA NIM catalogue filtered to omni models
 *   - /api/models returns the live OpenRouter catalogue filtered to audio + tools
 *   - Anthropic is declared as having no audio models
 *   - an invalid BYOK key produces a clean error, never a leaked key
 *   - the settings UI is reachable from the app header
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4193;
const BASE = `http://127.0.0.1:${PORT}`;

const results = [];
let failures = 0;
const check = (name, ok, detail = '') => {
  if (!ok) failures += 1;
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Deliberately NOT shaped like a real key: this test also checks that an
// invalid credential is never echoed back to the client.
const CANARY = 'FAKE-KEY-LEAK-CANARY-abcdef';

const postModels = async (provider, apiKey) => {
  const response = await fetch(`${BASE}/api/models`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, apiKey }),
  });
  return { status: response.status, body: await response.json() };
};

async function main() {
  const server = spawn(process.execPath, [join(ROOT, 'dist', 'server.cjs')], {
    cwd: ROOT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(PORT), GEMINI_API_KEY: 'byok-test' },
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
    check('config advertises BYOK support', config.byokEnabled === true);
    const providerIds = (config.providers || []).map(p => p.id);
    check('config lists OpenRouter + NVIDIA NIM', providerIds.includes('openrouter') && providerIds.includes('nvidia'));
    check('config lists OpenAI, Gemini, Anthropic, Groq',
      ['openai', 'gemini', 'anthropic', 'groq'].every(id => providerIds.includes(id)));
    const anthropic = (config.providers || []).find(p => p.id === 'anthropic');
    check('Anthropic is flagged as having no audio models', anthropic?.hasAudioModels === false);

    // ---- 2. live NVIDIA NIM catalogue -------------------------------------
    const nim = await postModels('nvidia', 'nvapi-dummy');
    check('NVIDIA NIM catalogue lists its omni model',
      nim.body?.models?.some(m => /nemotron-3-nano-omni/i.test(m.id)),
      `${nim.body?.models?.length} model(s), source=${nim.body?.source}`);

    // ---- 3. live OpenRouter catalogue -------------------------------------
    const or = await postModels('openrouter', '');
    check('OpenRouter catalogue is filtered to audio + tools',
      or.body?.models?.length > 0 && or.body.models.every(m => m.audio === true && m.tools === true),
      `${or.body?.models?.length} model(s)`);
    check('OpenRouter catalogue includes Qwen 3.8 Omni Flash',
      or.body.models.some(m => m.id === 'qwen/qwen3.8-omni-flash'));
    check('OpenRouter catalogue includes the free Nemotron omni model',
      or.body.models.some(m => /nemotron-3-nano-omni/i.test(m.id)));

    // ---- 4. curated fallback ---------------------------------------------
    const openai = await postModels('openai', '');
    check('OpenAI falls back to the curated audio models',
      openai.body?.source === 'curated' && openai.body.models.some(m => m.id === 'gpt-audio'),
      JSON.stringify(openai.body?.models?.map(m => m.id)));

    // ---- 5. invalid key produces a clean error ---------------------------
    const badKey = await fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: 'un clip de test',
        ai: { provider: 'openrouter', apiKey: CANARY },
      }),
    });
    const badBody = await badKey.text();
    check('invalid BYOK key returns a clear error status', badKey.status >= 400, `status ${badKey.status}`);
    check('the API key is never echoed back to the client', !badBody.includes(CANARY), badBody.slice(0, 90));

    // ---- 6. UI -----------------------------------------------------------
    browser = await chromium.launch({ executablePath: exe, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text()); });
    page.on('pageerror', e => consoleErrors.push(String(e)));

    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: /session démo/i }).click();
    await page.waitForURL(`${BASE}/app`, { timeout: 20_000 });
    await page.getByText('Mes Projets').first().waitFor({ timeout: 20_000 });

    await page.locator('button[title*="clé API"]').first().click();
    await page.getByRole('heading', { name: /Votre clé API/ }).first().waitFor({ timeout: 20_000 });
    check('the BYOK panel opens from the app header', true);

    const providerSelect = page.locator('#byok-provider');
    const options = await providerSelect.locator('option').allTextContents();
    check('panel lists every provider', options.some(o => /OpenRouter/.test(o)) && options.some(o => /NVIDIA/.test(o)), `${options.length} options`);

    await providerSelect.selectOption('nvidia');
    await page.waitForTimeout(3000);
    const modelOptions = await page.locator('#byok-model option').allTextContents();
    check('NVIDIA NIM panel offers the Nemotron omni model',
      modelOptions.some(o => /nemotron/i.test(o)), modelOptions.slice(0, 2).join(' | '));

    await page.locator('#byok-key').fill('nvapi-dummy-key');
    await page.getByRole('button', { name: /Utiliser cette clé/ }).click();
    await page.waitForTimeout(1500);
    check('saving a key shows the "Ma clé" badge',
      (await page.locator('button[title*="clé API est active"]').count()) > 0);

    const store = join(ROOT, 'data', 'survey-responses.jsonl');
    check('no BYOK key is persisted server-side', !existsSync(store) || !readFileSync(store, 'utf8').includes('nvapi-dummy-key'));

    check('no console errors', consoleErrors.length === 0, consoleErrors.slice(0, 2).join(' | '));
  } finally {
    await browser?.close();
    server.kill();
  }

  console.log('\nLensCraft AI — BYOK tests\n');
  for (const line of results) console.log(line);
  console.log(`\n${results.length - failures}/${results.length} checks passed.\n`);
  if (failures) {
    console.log('BYOK TESTS FAILED');
    process.exitCode = 1;
  } else {
    console.log('BYOK TESTS PASSED');
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
