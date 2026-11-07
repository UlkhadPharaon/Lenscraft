/**
 * AI provider registry for BYOK (bring your own key).
 *
 * LensCraft needs models that accept **audio input** (the user uploads their
 * song) and support **structured outputs / tool calling** (the dossier must come
 * back as typed JSON). The model lists exposed to the user are filtered on those
 * two capabilities, so nobody picks a text-only model by accident.
 */

export type ProviderKind = 'openai-compatible' | 'anthropic' | 'gemini';

export interface ProviderDef {
  id: string;
  label: string;
  kind: ProviderKind;
  baseUrl: string;
  /** Public model catalogue endpoint, when one exists without a key. */
  catalogUrl?: string;
  /** Whether listing models requires the user's key. */
  catalogNeedsKey: boolean;
  keyPrefix?: string;
  keyPlaceholder: string;
  docsUrl: string;
  /** Honest summary shown in the UI. */
  notes: string;
  /** Models known to accept audio input (used when the catalogue can't be listed). */
  audioModels: string[];
  /** Provider-level statement: does ANY model take audio? */
  hasAudioModels: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    kind: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    catalogUrl: 'https://openrouter.ai/api/v1/models',
    catalogNeedsKey: false,
    keyPrefix: 'sk-or-',
    keyPlaceholder: 'sk-or-v1-…',
    docsUrl: 'https://openrouter.ai/keys',
    notes: '460+ modèles via une seule clé. Le meilleur choix si vous voulez tester plusieurs fournisseurs.',
    audioModels: [
      'qwen/qwen3.8-omni-flash',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      'openai/gpt-audio',
      'openai/gpt-audio-mini',
      'google/gemini-3.5-flash',
      'google/gemini-3.7-flash',
      'google/gemini-3.8-flash',
      'mistralai/voxtral-small-24b-2507',
      'xiaomi/mimo-v2.6-flash',
    ],
    hasAudioModels: true,
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    kind: 'openai-compatible',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    catalogUrl: 'https://integrate.api.nvidia.com/v1/models',
    catalogNeedsKey: true,
    keyPrefix: 'nvapi-',
    keyPlaceholder: 'nvapi-…',
    docsUrl: 'https://build.nvidia.com/',
    notes: 'Nemotron 3 Nano Omni accepte l\'audio et les outils, et dispose d\'un accès gratuit.',
    audioModels: ['nvidia/nemotron-3-nano-omni-30b-a3b-reasoning'],
    hasAudioModels: true,
  },
  {
    id: 'openai',
    label: 'OpenAI',
    kind: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    catalogUrl: 'https://api.openai.com/v1/models',
    catalogNeedsKey: true,
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-…',
    docsUrl: 'https://platform.openai.com/api-keys',
    notes: 'gpt-audio et gpt-audio-mini analysent l\'audio directement.',
    audioModels: ['gpt-audio', 'gpt-audio-mini'],
    hasAudioModels: true,
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    kind: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    catalogNeedsKey: true,
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza…',
    docsUrl: 'https://aistudio.google.com/apikey',
    notes: 'Les modèles Flash acceptent l\'audio en entrée (recommandé : gemini-3.5-flash).',
    audioModels: ['gemini-3.5-flash', 'gemini-3.7-flash', 'gemini-3.8-flash', 'gemini-3.5-flash-lite'],
    hasAudioModels: true,
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    kind: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    catalogNeedsKey: true,
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-…',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    notes: 'Excellent pour le texte et les outils, mais Claude n\'accepte PAS l\'audio en entrée : l\'analyse du morceau se fera à partir des paroles et du concept.',
    audioModels: [],
    hasAudioModels: false,
  },
  {
    id: 'groq',
    label: 'Groq',
    kind: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    catalogNeedsKey: true,
    keyPrefix: 'gsk_',
    keyPlaceholder: 'gsk_…',
    docsUrl: 'https://console.groq.com/keys',
    notes: 'Très rapide. Utilisez Whisper pour la transcription, puis un modèle texte pour le dossier.',
    audioModels: [],
    hasAudioModels: false,
  },
];

export function getProvider(id: string | undefined | null): ProviderDef | undefined {
  if (!id) return undefined;
  return PROVIDERS.find(provider => provider.id === id.toLowerCase());
}

export const DEFAULT_PROVIDER_ID = 'openrouter';

/** Short, honest capability summary for a model id. */
export function describeModelCapabilities(providerId: string, modelId: string, audioModels: string[]): {
  audio: boolean;
  tools: boolean;
} {
  const provider = getProvider(providerId);
  if (!provider) return { audio: false, tools: false };
  const audio = provider.audioModels.includes(modelId) || audioModels.includes(modelId);
  return { audio, tools: true };
}
