/**
 * Server-side collection of market-validation survey responses.
 *
 * Responses are appended to a JSONL file (git-ignored) so a single deployment —
 * or the standalone Node server behind a tunnel — can gather answers from many
 * people. Falls back gracefully when the filesystem is read-only (Vercel
 * serverless functions can't persist files; there the collector API below is
 * the way in).
 */
import { existsSync, mkdirSync, appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SurveyResponse } from '../src/lib/survey';

const DATA_DIR = join(process.cwd(), 'data');
const DATA_FILE = join(DATA_DIR, 'survey-responses.jsonl');

function ensureStore(): boolean {
  try {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    return true;
  } catch (error) {
    console.warn('Survey store unavailable (read-only filesystem?)', error);
    return false;
  }
}

export function appendSurveyResponse(response: SurveyResponse): boolean {
  if (!ensureStore()) return false;
  try {
    appendFileSync(DATA_FILE, `${JSON.stringify(response)}\n`, 'utf8');
    return true;
  } catch (error) {
    console.error('Failed to append survey response', error);
    return false;
  }
}

export function readSurveyResponses(): SurveyResponse[] {
  if (!existsSync(DATA_FILE)) return [];
  try {
    return readFileSync(DATA_FILE, 'utf8')
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try {
          return JSON.parse(line) as SurveyResponse;
        } catch {
          return null;
        }
      })
      .filter((entry): entry is SurveyResponse => entry !== null);
  } catch (error) {
    console.error('Failed to read survey responses', error);
    return [];
  }
}

/** Strips personal fields so stats can be shared safely. */
export function surveyStats(responses: SurveyResponse[]) {
  const emails = responses.filter(r => typeof r.answers.email === 'string' && r.answers.email).length;
  return {
    total: responses.length,
    withEmail: emails,
    bySource: responses.reduce<Record<string, number>>((acc, response) => {
      const key = response.source || 'direct';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {}),
    firstAt: responses[0]?.at ?? null,
    lastAt: responses[responses.length - 1]?.at ?? null,
  };
}
