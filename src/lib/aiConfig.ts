import { useEffect, useState } from 'react';

export interface AiProviderOption {
  id: string;
  label: string;
  notes: string;
  hasAudioModels: boolean;
  keyPlaceholder: string;
  docsUrl: string;
}

export interface AiModelOption {
  id: string;
  label: string;
  audio?: boolean;
  tools?: boolean;
  context?: number;
  free?: boolean;
  source?: 'live' | 'curated';
  provider?: string;
}

export interface CatalogResult {
  models: AiModelOption[];
  source: 'live' | 'curated';
  note?: string;
}

export interface AiConfig {
  provider: 'gemini' | 'openrouter' | (string & {});
  models: AiModelOption[];
  currency: string;
  billingEnabled: boolean;
  upgradeEnabled: boolean;
  byokEnabled: boolean;
  providers: AiProviderOption[];
}

const FALLBACK: AiConfig = {
  provider: 'gemini',
  models: [{ id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash' }],
  currency: 'xof',
  billingEnabled: false,
  upgradeEnabled: true,
  byokEnabled: true,
  providers: [
    { id: 'openrouter', label: 'OpenRouter', notes: '460+ modèles via une seule clé.', hasAudioModels: true, keyPlaceholder: 'sk-or-v1-…', docsUrl: 'https://openrouter.ai/keys' },
    { id: 'nvidia', label: 'NVIDIA NIM', notes: 'Nemotron 3 Nano Omni (audio + outils, gratuit).', hasAudioModels: true, keyPlaceholder: 'nvapi-…', docsUrl: 'https://build.nvidia.com/' },
    { id: 'openai', label: 'OpenAI', notes: 'gpt-audio analyse l\'audio.', hasAudioModels: true, keyPlaceholder: 'sk-…', docsUrl: 'https://platform.openai.com/api-keys' },
    { id: 'gemini', label: 'Google Gemini', notes: 'Les modèles Flash acceptent l\'audio.', hasAudioModels: true, keyPlaceholder: 'AIza…', docsUrl: 'https://aistudio.google.com/apikey' },
    { id: 'anthropic', label: 'Anthropic (Claude)', notes: 'Texte seulement — pas d\'audio.', hasAudioModels: false, keyPlaceholder: 'sk-ant-…', docsUrl: 'https://console.anthropic.com/settings/keys' },
    { id: 'groq', label: 'Groq', notes: 'Très rapide, sans audio multimodal.', hasAudioModels: false, keyPlaceholder: 'gsk_…', docsUrl: 'https://console.groq.com/keys' },
  ],
};

let cachedConfig: AiConfig | null = null;

/** Reads the AI/billing configuration exposed by GET /api/config. */
export function useAiConfig(): AiConfig {
  const [config, setConfig] = useState<AiConfig>(cachedConfig || FALLBACK);

  useEffect(() => {
    let active = true;
    fetch('/api/config')
      .then(res => (res.ok ? res.json() : null))
      .then((data: Partial<AiConfig> | null) => {
        if (!active || !data) return;
        const next: AiConfig = {
          provider: data.provider || FALLBACK.provider,
          models: data.models?.length ? data.models : FALLBACK.models,
          currency: data.currency || FALLBACK.currency,
          billingEnabled: Boolean(data.billingEnabled),
          upgradeEnabled: data.upgradeEnabled ?? true,
          byokEnabled: data.byokEnabled ?? true,
          providers: data.providers?.length ? data.providers : FALLBACK.providers,
        };
        cachedConfig = next;
        setConfig(next);
      })
      .catch(() => { /* keep the fallback */ });
    return () => {
      active = false;
    };
  }, []);

  return config;
}

/** Fetches the audio+tool-calling models available for a BYOK provider. */
export async function fetchProviderModels(providerId: string, apiKey: string): Promise<CatalogResult> {
  const response = await fetch('/api/models', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: providerId, apiKey }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error || `Impossible de lister les modèles (${response.status}).`);
  }
  return { models: body.models || [], source: body.source || 'curated', note: body.note };
}

/** Formats a plan price in Franc CFA (XOF). */
export function formatCfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/[\u202f\u00a0]/g, ' ')} FCFA`;
}
