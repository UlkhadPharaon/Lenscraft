/**
 * Provider-agnostic structured-JSON generation.
 *
 * Two backends behind one function:
 *   - gemini      : @google/genai responseSchema (strict, native)
 *   - openrouter  : OpenAI-compatible /chat/completions with a json_schema
 *                   response_format (Qwen 3.8 Omni Flash accepts audio input)
 */
import { GoogleGenAI, Type } from '@google/genai';
import { env } from './env';
import { toGeminiSchema } from './schemas';

export type AiProvider = 'gemini' | 'openrouter';

export interface AudioPart {
  data: string;
  mimeType: string;
}

export interface GenerateStructuredOptions {
  /** Overrides the configured model (the frontend model selector). */
  model?: string;
  systemPrompt: string;
  userPrompt: string;
  /** Base64 audio of the song, when the user uploaded one. */
  audio?: AudioPart | null;
  /** JSON Schema object. */
  schema: any;
  schemaName: string;
  temperature?: number;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const DEFAULT_OPENROUTER_MODEL = 'qwen/qwen3.8-omni-flash';

/** Formats accepted by the OpenAI-style `input_audio` content part. */
const AUDIO_FORMATS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
};

function audioFormat(mimeType: string): string {
  return AUDIO_FORMATS[mimeType] || mimeType.split('/').pop() || 'mp3';
}

function isOpenRouter(): boolean {
  return env.aiProvider === 'openrouter';
}

let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({
      apiKey: env.geminiApiKey,
      httpOptions: { headers: { 'User-Agent': 'lenscraft-ai' } },
    });
  }
  return geminiClient;
}

async function generateWithGemini(options: GenerateStructuredOptions): Promise<any> {
  const contents: any[] = [];
  if (options.audio?.data) {
    contents.push({ inlineData: { data: options.audio.data, mimeType: options.audio.mimeType } });
  }
  contents.push(options.userPrompt);

  const response = await getGemini().models.generateContent({
    model: options.model || env.geminiModel,
    contents,
    config: {
      systemInstruction: options.systemPrompt,
      responseMimeType: 'application/json',
      responseSchema: toGeminiSchema(options.schema, Type),
      temperature: options.temperature,
    },
  });

  return JSON.parse(response.text || '{}');
}

async function generateWithOpenRouter(options: GenerateStructuredOptions): Promise<any> {
  if (!env.openRouterApiKey) {
    throw new Error('OPENROUTER_API_KEY est requis quand AI_PROVIDER=openrouter.');
  }

  const userContent: any[] = [{ type: 'text', text: options.userPrompt }];
  if (options.audio?.data) {
    userContent.push({
      type: 'input_audio',
      input_audio: { data: options.audio.data, format: audioFormat(options.audio.mimeType) },
    });
  }

  const body: Record<string, any> = {
    model: options.model || env.openRouterModel || DEFAULT_OPENROUTER_MODEL,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: options.temperature ?? 0.8,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
  };

  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openRouterApiKey}`,
      // Optional attribution/ranking headers.
      'HTTP-Referer': env.appUrl,
      'X-Title': 'LensCraft AI',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 404 && /json_schema|response_format/.test(detail)) {
      // Model/provider does not support strict schemas — retry with JSON mode.
      return generateWithOpenRouterJsonMode(options);
    }
    throw new Error(`OpenRouter a répondu ${response.status}: ${detail.slice(0, 300)}`);
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Réponse vide reçue d\'OpenRouter.');
  return JSON.parse(stripCodeFence(text));
}

/** Fallback: plain JSON mode + a schema reminder in the prompt. */
async function generateWithOpenRouterJsonMode(options: GenerateStructuredOptions): Promise<any> {
  const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.openRouterApiKey}`,
    },
    body: JSON.stringify({
      model: options.model || env.openRouterModel || DEFAULT_OPENROUTER_MODEL,
      messages: [
        { role: 'system', content: `${options.systemPrompt}\n\nTu DOIS répondre uniquement par un objet JSON valide respectant ce schéma :\n${JSON.stringify(options.schema)}` },
        { role: 'user', content: options.userPrompt },
      ],
      temperature: options.temperature ?? 0.8,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenRouter a répondu ${response.status}: ${detail.slice(0, 300)}`);
  }
  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Réponse vide reçue d\'OpenRouter.');
  return JSON.parse(stripCodeFence(text));
}

/** Removes markdown fences some models wrap JSON in. */
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

export async function generateStructuredJson(options: GenerateStructuredOptions): Promise<any> {
  if (isOpenRouter()) return generateWithOpenRouter(options);
  return generateWithGemini(options);
}

/** Model list advertised to the frontend, per provider. */
export function availableModels(): { id: string; label: string; provider: AiProvider }[] {
  if (isOpenRouter()) {
    return [
      { id: env.openRouterModel || DEFAULT_OPENROUTER_MODEL, label: 'Qwen 3.8 Omni Flash', provider: 'openrouter' },
      { id: 'qwen/qwen3.7-plus', label: 'Qwen 3.7 Plus (texte)', provider: 'openrouter' },
      { id: 'qwen/qwen3.7-max', label: 'Qwen 3.7 Max (texte)', provider: 'openrouter' },
    ];
  }
  return [
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', provider: 'gemini' },
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'gemini' },
  ];
}

export function currentProvider(): AiProvider {
  return isOpenRouter() ? 'openrouter' : 'gemini';
}
