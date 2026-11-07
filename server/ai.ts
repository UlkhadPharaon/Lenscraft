/**
 * Provider-agnostic structured-JSON generation with BYOK support.
 *
 * A request may carry its own `provider` + `apiKey` (bring your own key). Those
 * are used for that single request and never persisted server-side. When they
 * are absent, the server's own configuration (AI_PROVIDER / keys) is used.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { env } from './env';
import { toGeminiSchema } from './schemas';
import { getProvider, PROVIDERS } from './providers';

export type AiProvider = 'gemini' | 'openrouter' | 'openai' | 'nvidia' | 'anthropic' | 'groq' | (string & {});

export interface AudioPart {
  data: string;
  mimeType: string;
}

export interface GenerateStructuredOptions {
  /** Overrides the configured model (the frontend selector). */
  model?: string;
  /** BYOK provider id. */
  provider?: string;
  /** BYOK API key — used for this request only. */
  apiKey?: string;
  systemPrompt: string;
  userPrompt: string;
  /** Base64 audio of the song, when the user uploaded one. */
  audio?: AudioPart | null;
  /** JSON Schema object. */
  schema: any;
  schemaName: string;
  temperature?: number;
}

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

/** Redacts keys from anything that could end up in a log or an error message. */
export function redactKey(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) return '';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

class ProviderError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ProviderError';
    this.status = status;
  }
}

function sanitizeError(error: unknown): ProviderError {
  const raw = error instanceof Error ? error.message : String(error);
  const status = (error as any)?.status ?? 500;
  // Never leak a user's key through an upstream error message.
  const cleaned = raw.replace(/sk-or-[A-Za-z0-9_-]+|nvapi-[A-Za-z0-9_-]+|sk-ant-[A-Za-z0-9_-]+|gsk_[A-Za-z0-9_-]+|AIza[A-Za-z0-9_-]+/g, '[clé masquée]');
  return new ProviderError(cleaned.slice(0, 400), status);
}

// ------------------------------------------------------------------ Gemini
let geminiClient: GoogleGenAI | null = null;
function getGemini(apiKey?: string): GoogleGenAI {
  if (apiKey) {
    return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'lenscraft-ai' } } });
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: env.geminiApiKey, httpOptions: { headers: { 'User-Agent': 'lenscraft-ai' } } });
  }
  return geminiClient;
}

async function generateWithGemini(options: GenerateStructuredOptions): Promise<any> {
  const contents: any[] = [];
  if (options.audio?.data) {
    contents.push({ inlineData: { data: options.audio.data, mimeType: options.audio.mimeType } });
  }
  contents.push(options.userPrompt);

  const response = await getGemini(options.apiKey).models.generateContent({
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

// --------------------------------------------------- OpenAI-compatible APIs
async function callOpenAiCompatible(
  providerId: string,
  baseUrl: string,
  apiKey: string,
  options: GenerateStructuredOptions,
): Promise<any> {
  const userContent: any[] = [{ type: 'text', text: options.userPrompt }];
  if (options.audio?.data) {
    userContent.push({
      type: 'input_audio',
      input_audio: { data: options.audio.data, format: audioFormat(options.audio.mimeType) },
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };
  if (providerId === 'openrouter') {
    headers['HTTP-Referer'] = env.appUrl;
    headers['X-Title'] = 'LensCraft AI';
  }

  const body: Record<string, any> = {
    model: options.model!,
    messages: [
      { role: 'system', content: options.systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: options.temperature ?? 0.85,
    response_format: {
      type: 'json_schema',
      json_schema: { name: options.schemaName, strict: true, schema: options.schema },
    },
  };

  const attempt = async (withSchema: boolean): Promise<any> => {
    const payload = withSchema ? body : {
      ...body,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: `${options.systemPrompt}\n\nTu DOIS répondre par un objet JSON valide respectant ce schéma :\n${JSON.stringify(options.schema)}` },
        { role: 'user', content: userContent },
      ],
    };

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new ProviderError(`${providerId}: ${response.status} ${text.slice(0, 300)}`, response.status);
    }

    const parsed = JSON.parse(text);
    const content = parsed?.choices?.[0]?.message?.content;
    if (!content) throw new ProviderError(`Réponse vide de ${providerId}.`);
    return JSON.parse(stripCodeFence(content));
  };

  try {
    return await attempt(true);
  } catch (error: any) {
    const message = String(error?.message || '');
    const schemaUnsupported = /json_schema|response_format|strict/i.test(message) && !/401|403|invalid api key/i.test(message);
    if (schemaUnsupported) return attempt(false);
    throw sanitizeError(error);
  }
}

// -------------------------------------------------------------- Anthropic
async function generateWithAnthropic(apiKey: string, options: GenerateStructuredOptions): Promise<any> {
  if (options.audio?.data) {
    throw new ProviderError(
      "Claude n'accepte pas l'audio en entrée. Utilisez un modèle audio (OpenRouter, NVIDIA NIM, OpenAI ou Gemini) pour analyser votre morceau, ou décrivez-le dans le champ « Concept ».",
      400,
    );
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: options.model!,
      max_tokens: 8192,
      temperature: options.temperature ?? 0.85,
      system: options.systemPrompt,
      tools: [{
        name: options.schemaName,
        description: 'Réponse structurée du dossier de production.',
        input_schema: options.schema,
      }],
      tool_choice: { type: 'tool', name: options.schemaName },
      messages: [{ role: 'user', content: options.userPrompt }],
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw sanitizeError(new ProviderError(`anthropic: ${response.status} ${text.slice(0, 300)}`, response.status));
  }

  const parsed = JSON.parse(text);
  const toolUse = (parsed?.content || []).find((block: any) => block?.type === 'tool_use');
  if (!toolUse?.input) throw new ProviderError('Réponse vide de Claude.');
  return toolUse.input;
}

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return fenced ? fenced[1] : trimmed;
}

/** Resolves which engine handles this request. */
export function resolveProvider(options: GenerateStructuredOptions): { providerId: string; kind: string; baseUrl: string } {
  const requested = getProvider(options.provider);
  if (requested && options.apiKey) {
    return { providerId: requested.id, kind: requested.kind, baseUrl: requested.baseUrl };
  }
  // Server defaults.
  if (env.aiProvider === 'openrouter') {
    return { providerId: 'openrouter', kind: 'openai-compatible', baseUrl: 'https://openrouter.ai/api/v1' };
  }
  return { providerId: 'gemini', kind: 'gemini', baseUrl: env.geminiApiKey ? '' : '' };
}

export async function generateStructuredJson(options: GenerateStructuredOptions): Promise<any> {
  const resolved = resolveProvider(options);

  // Forge a provider object for BYOK providers we know about.
  const providerDef = getProvider(resolved.providerId) || getProvider(options.provider);

  try {
    if (resolved.kind === 'gemini') {
      return await generateWithGemini({
        ...options,
        apiKey: options.apiKey || undefined,
        model: options.model || env.geminiModel,
      });
    }

    if (!options.apiKey) {
      throw new ProviderError(
        providerDef
          ? `Aucune clé API fournie pour ${providerDef.label}. Ajoutez-la dans les réglages IA.`
          : `Fournisseur inconnu : ${options.provider}.`,
        400,
      );
    }

    if (resolved.kind === 'anthropic') {
      return await generateWithAnthropic(options.apiKey, options);
    }

    const baseUrl = providerDef?.baseUrl || resolved.baseUrl;
    return await callOpenAiCompatible(resolved.providerId, baseUrl, options.apiKey, options);
  } catch (error) {
    throw sanitizeError(error);
  }
}

export interface ModelInfo {
  id: string;
  label: string;
  audio: boolean;
  tools: boolean;
  context?: number;
  source: 'live' | 'curated';
  free?: boolean;
}

/** Maps a raw provider catalogue entry onto our ModelInfo shape. */
function classifyOpenRouterModel(raw: any): ModelInfo {
  const modalities = raw.architecture?.input_modalities || [];
  const params = raw.supported_parameters || [];
  return {
    id: raw.id,
    label: raw.name || raw.id,
    audio: modalities.includes('audio'),
    tools: params.some((p: string) => /^tools|tool_choice/.test(p)),
    context: raw.context_length,
    source: 'live',
    free: Number(raw.pricing?.prompt || 0) === 0,
  };
}

/**
 * Lists the models a user can pick for a provider, filtered to what LensCraft
 * needs (audio input + tool calling). Falls back to a curated list when the
 * live catalogue is unreachable or needs a key we don't have.
 */
export async function listModels(providerId: string, apiKey?: string): Promise<{ models: ModelInfo[]; source: 'live' | 'curated'; note?: string }> {
  const provider = getProvider(providerId);
  if (!provider) return { models: [], source: 'curated', note: 'Fournisseur inconnu.' };

  const needsKey = provider.catalogNeedsKey && !apiKey;
  if (provider.catalogUrl && !needsKey) {
    try {
      const headers: Record<string, string> = {};
      if (apiKey && providerId !== 'openrouter' && providerId !== 'nvidia') headers.Authorization = `Bearer ${apiKey}`;

      const response = await fetch(provider.catalogUrl, { headers });
      if (response.ok) {
        const payload = await response.json();
        const rows: any[] = payload.data || payload.models || [];

        if (providerId === 'openrouter') {
          const models = rows.map(classifyOpenRouterModel)
            .filter(model => model.audio && model.tools)
            .sort((a, b) => (b.free ? 1 : 0) - (a.free ? 1 : 0));
          if (models.length > 0) return { models, source: 'live' };
        }

        if (providerId === 'nvidia') {
          const models = rows
            .map((row: any) => ({
              id: row.id as string,
              label: String(row.id).split('/').pop() || row.id,
              audio: /omni|audio/i.test(row.id),
              tools: !/embed|rerank|asr|parakeet|canary|ocr|diffusion/i.test(row.id),
              source: 'live' as const,
              free: /nemotron/i.test(row.id),
            }))
            .filter(model => model.audio && model.tools);
          if (models.length > 0) return { models, source: 'live' };
        }

        if (providerId === 'openai' || providerId === 'groq') {
          const models = rows
            .map((row: any) => ({ id: row.id as string, label: row.id, audio: /audio/i.test(row.id), tools: !/embed|whisper|tts|guard|moderation/i.test(row.id), source: 'live' as const }))
            .filter(model => model.audio && model.tools);
          if (models.length > 0) return { models, source: 'live' };
        }
      }
    } catch {
      /* fall through to the curated list */
    }
  }

  const curated: ModelInfo[] = provider.audioModels.map(id => ({
    id,
    label: id.split('/').pop() || id,
    audio: true,
    tools: true,
    source: 'curated',
  }));

  return {
    models: curated,
    source: 'curated',
    note: provider.hasAudioModels
      ? 'Liste de référence (le catalogue live est indisponible sans clé valide).'
      : 'Aucun modèle audio chez ce fournisseur.',
  };
}

/** Models advertised by the server's own configuration (no BYOK). */
export function availableModels(): { id: string; label: string; provider: AiProvider }[] {
  if (env.aiProvider === 'openrouter' && env.openRouterApiKey) {
    return [
      { id: env.openRouterModel || 'qwen/qwen3.8-omni-flash', label: 'Qwen 3.8 Omni Flash', provider: 'openrouter' },
      { id: 'qwen/qwen3.7-plus', label: 'Qwen 3.7 Plus (texte)', provider: 'openrouter' },
    ];
  }
  return [
    { id: env.geminiModel, label: 'Gemini Flash', provider: 'gemini' },
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'gemini' },
  ];
}

export function currentProvider(): AiProvider {
  return env.aiProvider === 'openrouter' ? 'openrouter' : 'gemini';
}
/** Public metadata about every supported BYOK provider. */
export function providerCatalog(): { id: string; label: string; notes: string; hasAudioModels: boolean; keyPlaceholder: string; docsUrl: string }[] {
  return PROVIDERS.map(provider => ({
    id: provider.id,
    label: provider.label,
    notes: provider.notes,
    hasAudioModels: provider.hasAudioModels,
    keyPlaceholder: provider.keyPlaceholder,
    docsUrl: provider.docsUrl,
  }));
}
