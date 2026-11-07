import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  X, KeyRound, Eye, EyeOff, RefreshCcw, ShieldCheck, Check, AlertTriangle, ExternalLink,
} from 'lucide-react';
import { useAiConfig, fetchProviderModels, type AiModelOption } from '../lib/aiConfig';
import { useAppContext } from '../context';
import toast from 'react-hot-toast';

interface AiKeySettingsProps {
  open: boolean;
  onClose: () => void;
}

const KEY_STORAGE = {
  provider: 'lenscraft_ai_provider',
  key: 'lenscraft_ai_key',
  model: 'lenscraft_ai_model',
};

/**
 * Bring-your-own-key panel: choose a provider, paste a key, pick a model.
 * The key lives in the browser only and is forwarded per request — it is never
 * written to our database nor logged.
 */
export default function AiKeySettings({ open, onClose }: AiKeySettingsProps) {
  const config = useAiConfig();
  const { selectedModel, setAiCredentials } = useAppContext();

  const [provider, setProvider] = useState(() => localStorage.getItem(KEY_STORAGE.provider) || 'openrouter');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(KEY_STORAGE.key) || '');
  const [model, setModel] = useState(() => localStorage.getItem(KEY_STORAGE.model) || selectedModel || 'qwen/qwen3.8-omni-flash');
  const [showKey, setShowKey] = useState(false);
  const [models, setModels] = useState<AiModelOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [source, setSource] = useState<'live' | 'curated' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasStoredKey, setHasStoredKey] = useState(Boolean(localStorage.getItem(KEY_STORAGE.key)));

  const activeProvider = config.providers.find(p => p.id === provider);

  const clearKey = () => {
    setAiCredentials(null);
    setApiKey('');
    setHasStoredKey(false);
  };

  /** Loads the model list for the selected provider (live when possible). */
  const loadModels = async (providerId: string, key: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchProviderModels(providerId, key.trim());
      setModels(result.models);
      setSource(result.source);
      setNote(result.note || null);
      if (result.models.length > 0 && !result.models.some(m => m.id === model)) {
        setModel(result.models[0].id);
      }
      if (result.models.length === 0) {
        setError(result.note || 'Aucun modèle compatible trouvé pour ce fournisseur.');
      }
    } catch (err: any) {
      setError(err?.message || 'Liste des modèles indisponible.');
      setModels([]);
      setSource(null);
    } finally {
      setLoading(false);
    }
  };

  // Refresh the catalogue when the panel opens or the provider changes.
  useEffect(() => {
    if (!open) return;
    void loadModels(provider, apiKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, provider]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-8 space-y-6 my-8"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl">
              <KeyRound className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Votre clé API</h2>
              <p className="text-xs text-zinc-500">Utilisez votre propre quota, à votre nom.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-zinc-500 hover:text-zinc-200 rounded-lg hover:bg-zinc-900" aria-label="Fermer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security notice */}
        <div className="flex gap-3 text-xs text-zinc-400 bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p>
            Votre clé est enregistrée <strong className="text-zinc-200">uniquement dans ce navigateur</strong> et
            transmise à notre serveur le temps de chaque requête. Elle n'est jamais stockée chez nous,
            ni partagée, ni journalisée.
          </p>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label htmlFor="byok-provider" className="text-sm font-medium text-zinc-300">Fournisseur</label>
          <select
            id="byok-provider"
            value={provider}
            onChange={e => setProvider(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          >
            {config.providers.map(option => (
              <option key={option.id} value={option.id}>
                {option.label}{option.hasAudioModels ? '' : ' — texte seulement'}
              </option>
            ))}
          </select>
          {activeProvider && <p className="text-xs text-zinc-500 leading-relaxed">{activeProvider.notes}</p>}
          {activeProvider && !activeProvider.hasAudioModels && (
            <p className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              Ce fournisseur n'a pas de modèle audio : le fichier son sera ignoré, seul le texte sera analysé.
            </p>
          )}
        </div>

        {/* Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="byok-key" className="text-sm font-medium text-zinc-300">Clé API</label>
            {activeProvider?.docsUrl && (
              <a href={activeProvider.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300">
                Obtenir une clé <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <div className="relative">
            <input
              id="byok-key"
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              placeholder={activeProvider?.keyPlaceholder || 'Collez votre clé'}
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 pr-11 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-zinc-500 hover:text-zinc-300"
              aria-label={showKey ? 'Masquer la clé' : 'Afficher la clé'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="byok-model" className="text-sm font-medium text-zinc-300">Modèle</label>
            <button
              type="button"
              onClick={() => loadModels(provider, apiKey)}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-50"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Actualiser
            </button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500 py-3">
              <RefreshCcw className="w-4 h-4 animate-spin" /> Chargement des modèles audio…
            </div>
          ) : models.length > 0 ? (
            <select
              id="byok-model"
              value={model}
              onChange={e => setModel(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
            >
              {models.map(option => (
                <option key={option.id} value={option.id}>
                  {option.label}
                  {option.free ? ' — gratuit' : ''}
                  {option.audio ? '' : ' — texte seulement'}
                  {option.context ? ` (${Math.round(option.context / 1000)}k)` : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-zinc-500 py-2">Aucun modèle listé. Collez une clé puis actualisez.</p>
          )}

          <p className="text-[11px] text-zinc-600">
            {source === 'live'
              ? `Catalogue officiel du fournisseur — ${models.length} modèle(s) compatibles audio + outils.`
              : note || 'Liste de référence (modèles audio connus).'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              if (!apiKey.trim()) {
                toast.error('Collez d\'abord votre clé API.');
                return;
              }
              localStorage.setItem(KEY_STORAGE.provider, provider);
              localStorage.setItem(KEY_STORAGE.key, apiKey.trim());
              localStorage.setItem(KEY_STORAGE.model, model);
              setHasStoredKey(true);
              // Push into app state so the header badge and API calls update at once.
              setAiCredentials({ provider, apiKey: apiKey.trim(), model });
              toast.success(`Clé ${activeProvider?.label || provider} enregistrée — ${models.find(m => m.id === model)?.label || model}`);
              onClose();
            }}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4" /> Utiliser cette clé
          </button>
          {hasStoredKey && (
            <button
              type="button"
              onClick={() => {
                clearKey();
                toast.success('Clé supprimée — retour au quota du service.');
                onClose();
              }}
              className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-medium py-3 px-5 rounded-xl transition-colors"
            >
              Supprimer ma clé
            </button>
          )}
        </div>

        {hasStoredKey && (
          <p className="text-center text-[11px] text-emerald-400/80">Une clé personnelle est active pour ce navigateur.</p>
        )}
      </motion.div>
    </div>
  );
}
