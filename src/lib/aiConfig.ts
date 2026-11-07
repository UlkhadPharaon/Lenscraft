import { useEffect, useState } from 'react';

export interface AiModelOption {
  id: string;
  label: string;
  provider: 'gemini' | 'openrouter';
}

export interface AiConfig {
  provider: 'gemini' | 'openrouter';
  models: AiModelOption[];
  currency: string;
  billingEnabled: boolean;
  /** True when a self-service (non-Stripe) upgrade is allowed. */
  upgradeEnabled: boolean;
}

const FALLBACK: AiConfig = {
  provider: 'gemini',
  models: [
    { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', provider: 'gemini' },
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro', provider: 'gemini' },
  ],
  currency: 'xof',
  billingEnabled: false,
  upgradeEnabled: true,
};

let cached: AiConfig | null = null;

/** Reads the AI/billing configuration exposed by GET /api/config. */
export function useAiConfig(): AiConfig {
  const [config, setConfig] = useState<AiConfig>(cached || FALLBACK);

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
        };
        cached = next;
        setConfig(next);
      })
      .catch(() => { /* keep the fallback */ });
    return () => {
      active = false;
    };
  }, []);

  return config;
}

/** Formats a plan price in Franc CFA (XOF) with thin-space grouping. */
export function formatCfa(amount: number): string {
  return `${amount.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`;
}
