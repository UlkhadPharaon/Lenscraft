import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import {
  Share2, Edit3, Save, Check, TrendingUp, Target, Video, Sparkles,
  Activity, History, RefreshCcw, Star, Plus, Lightbulb, BookmarkPlus, SlidersHorizontal,
} from 'lucide-react';
import { PromoStrategy, PromoIdea } from '../types';
import toast from 'react-hot-toast';
import { postJson, messageFor } from '../utils/api';
import LoadingOverlay from '../components/LoadingOverlay';
import ExportButtons from '../components/ExportButtons';
import {
  IDEA_TEMPLATES, PLATFORM_OPTIONS, STYLE_OPTIONS, DURATION_OPTIONS, BUDGET_OPTIONS, GOAL_OPTIONS,
} from '../utils/ideaTemplates';

interface Preferences {
  numberOfVideos: string;
  constraints: string;
  styleReferences: string;
  platforms: string[];
  conceptStyles: string[];
  duration: string;
  budget: string;
  goal: string;
  handle: string;
}

const EMPTY_PREFERENCES: Preferences = {
  numberOfVideos: '',
  constraints: '',
  styleReferences: '',
  platforms: [],
  conceptStyles: [],
  duration: '',
  budget: '',
  goal: '',
  handle: '',
};

const COUNT_CHIPS = ['3', '5', '10', '20'];

/** Small toggle chip used across the preferences form. */
function Chip({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
        active
          ? 'bg-pink-500/20 border-pink-500/50 text-pink-300'
          : 'bg-zinc-950/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200'
      }`}
    >
      {label}
    </button>
  );
}

export default function Promo() {
  const { treatment, setTreatment, selectedModel } = useAppContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showIdeaBank, setShowIdeaBank] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(EMPTY_PREFERENCES);

  const getInitialPromo = (): PromoStrategy | null => {
    if (!treatment) return null;
    if (treatment.activePromoVersionId && treatment.promoVersions) {
      return treatment.promoVersions.find(v => v.versionId === treatment.activePromoVersionId) || treatment.promoStrategy || null;
    }
    return treatment.promoStrategy || null;
  };

  const [editedPromo, setEditedPromo] = useState<PromoStrategy | null>(getInitialPromo());

  useEffect(() => {
    if (!treatment) {
      navigate('/app');
    } else if (!isEditing) {
      setEditedPromo(getInitialPromo());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treatment, navigate, isEditing]);

  const ideas = useMemo(() => {
    const list = editedPromo?.promoIdeas || [];
    return favoritesOnly ? list.filter(idea => idea.favorite) : list;
  }, [editedPromo, favoritesOnly]);

  const favoriteCount = useMemo(
    () => (editedPromo?.promoIdeas || []).filter(idea => idea.favorite).length,
    [editedPromo],
  );

  // -------------------------------------------------------------- mutations
  const persistPromo = (next: PromoStrategy) => {
    if (!treatment) return;
    const versions = treatment.promoVersions || [];
    const updatedVersions = versions.length
      ? versions.map(v => (v.versionId === next.versionId ? next : v))
      : [next];
    setTreatment({
      ...treatment,
      promoStrategy: next,               // backward compatibility
      promoVersions: updatedVersions,
      activePromoVersionId: next.versionId,
    });
  };

  const handleSave = () => {
    if (treatment && editedPromo) {
      persistPromo(editedPromo);
      setIsEditing(false);
      setSaved(true);
      toast.success('Stratégie promo sauvegardée.');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const switchVersion = (versionId: string) => {
    if (treatment?.promoVersions) {
      const selected = treatment.promoVersions.find(v => v.versionId === versionId);
      if (selected) {
        setEditedPromo(selected);
        setTreatment({ ...treatment, activePromoVersionId: versionId });
        setIsEditing(false);
      }
    }
    setShowVersions(false);
  };

  const toggleFavorite = (index: number) => {
    if (!editedPromo) return;
    const nextIdeas = [...editedPromo.promoIdeas];
    nextIdeas[index] = { ...nextIdeas[index], favorite: !nextIdeas[index].favorite };
    const next = { ...editedPromo, promoIdeas: nextIdeas };
    setEditedPromo(next);
    persistPromo(next);
  };

  /** Inserts a ready-made concept into the current version (no API needed). */
  const addTemplateIdea = (templateId: string) => {
    const template = IDEA_TEMPLATES.find(t => t.id === templateId);
    if (!template || !treatment) return;

    const base = editedPromo || {
      targetAudience: 'À préciser — auditeurs du morceau et fans de clips.',
      numberOfVideos: 1,
      trendsAndIdeas: 'Concepts ajoutés manuellement depuis la banque d\'idées.',
      versionId: crypto.randomUUID(),
      versionName: 'Version 1',
      createdAt: Date.now(),
      promoIdeas: [],
    };

    const next: PromoStrategy = {
      ...base,
      numberOfVideos: base.promoIdeas.length + 1,
      promoIdeas: [...base.promoIdeas, { ...template.idea }],
    };

    setEditedPromo(next);
    persistPromo(next);
    toast.success(`Concept « ${template.label} » ajouté.`);
  };

  const handleGeneratePromo = async () => {
    if (!treatment) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generatedData = await postJson<any>('/api/generate-promo', {
        body: { treatment, preferences, model: selectedModel },
        retries: 3,
      });

      const prevVersions = treatment.promoVersions || [];
      if (prevVersions.length === 0 && treatment.promoStrategy) {
        prevVersions.push({
          ...treatment.promoStrategy,
          versionId: crypto.randomUUID(),
          versionName: 'Version 1',
          createdAt: treatment.createdAt || Date.now(),
        });
      }

      const newStrategy: PromoStrategy = {
        ...generatedData,
        versionId: crypto.randomUUID(),
        versionName: `Version ${prevVersions.length + 1}`,
        createdAt: Date.now(),
      };

      setEditedPromo(newStrategy);
      setTreatment({
        ...treatment,
        promoStrategy: newStrategy,
        promoVersions: [...prevVersions, newStrategy],
        activePromoVersionId: newStrategy.versionId,
      });
      setShowPreferences(false);
      toast.success('Nouvelle stratégie promo générée !');
    } catch (err) {
      const message = messageFor(err);
      setError(message);
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromoChange = (field: keyof PromoStrategy, value: any) => {
    if (editedPromo) setEditedPromo({ ...editedPromo, [field]: value });
  };

  const handleIdeaChange = (index: number, field: keyof PromoIdea, value: any) => {
    if (!editedPromo) return;
    const nextIdeas = [...editedPromo.promoIdeas];
    nextIdeas[index] = { ...nextIdeas[index], [field]: value };
    setEditedPromo({ ...editedPromo, promoIdeas: nextIdeas });
  };

  const togglePref = (field: 'platforms' | 'conceptStyles', value: string) => {
    setPreferences(prev => {
      const list = prev[field];
      return { ...prev, [field]: list.includes(value) ? list.filter(v => v !== value) : [...list, value] };
    });
  };

  const setPref = (field: keyof Preferences, value: any) => setPreferences(prev => ({ ...prev, [field]: value }));

  if (!treatment) return null;

  const inputClass = 'w-full bg-zinc-950/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 text-sm';

  return (
    <>
      <LoadingOverlay
        visible={isGenerating}
        title="Création des concepts viraux"
        description="L'IA analyse votre scénario et imagine des formats courts optimisés pour TikTok, Reels et Shorts."
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto space-y-12 pb-20"
      >
        {/* ------------------------------------------------------------ header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-pink-500/20 to-orange-500/10 rounded-2xl border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
              <Share2 className="w-8 h-8 text-pink-400" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">Stratégie Promo &amp; Shorts</h2>
              <p className="text-zinc-500 text-sm mt-1">Concepts viraux pour TikTok, Reels et Shorts.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowIdeaBank(!showIdeaBank)}
              className={`flex items-center gap-2 border font-medium py-2 px-4 rounded-xl transition-all ${showIdeaBank ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-amber-500/30 hover:border-amber-500/50'}`}
              title="Concepts prêts à l'emploi, sans IA"
            >
              <Lightbulb className="w-4 h-4" /> Banque d'idées
            </button>

            {editedPromo && (
              <>
                {treatment.promoVersions && treatment.promoVersions.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowVersions(!showVersions)}
                      className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:border-zinc-500/50 font-medium py-2 px-4 rounded-xl transition-all"
                    >
                      <History className="w-4 h-4" /> {editedPromo.versionName || 'Version'}
                    </button>
                    {showVersions && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10">
                        {treatment.promoVersions.map(v => (
                          <button
                            key={v.versionId}
                            onClick={() => switchVersion(v.versionId!)}
                            className={`w-full text-left px-4 py-3 text-sm transition-colors ${v.versionId === editedPromo.versionId ? 'bg-pink-500/20 text-pink-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                          >
                            {v.versionName || 'Ancienne version'}
                            {v.createdAt && <span className="block text-xs opacity-50 mt-1">{new Date(v.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowIdeaBank(!showIdeaBank)}
                  className={`flex items-center gap-2 border font-medium py-2 px-4 rounded-xl transition-all ${showIdeaBank ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-amber-500/30 hover:border-amber-500/50'}`}
                  title="Concepts prêts à l'emploi, sans IA"
                >
                  <Lightbulb className="w-4 h-4" /> Banque d'idées
                </button>

                <button
                  onClick={() => setShowPreferences(!showPreferences)}
                  className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 font-medium py-2 px-4 rounded-xl transition-all"
                  title="Générer une nouvelle version avec l'IA"
                >
                  <RefreshCcw className="w-4 h-4" /> Relancer
                </button>

                <ExportButtons
                  treatment={treatment}
                  override={{ ...treatment, promoStrategy: editedPromo || undefined }}
                  label="Exporter"
                />

                {isEditing ? (
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white font-medium py-2 px-5 rounded-xl transition-all shadow-lg"
                  >
                    <Save className="w-5 h-5" /> Enregistrer
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 px-4 rounded-xl transition-all"
                  >
                    {saved ? <><Check className="w-4 h-4 text-emerald-400" /> Sauvegardé</> : <><Edit3 className="w-4 h-4" /> Éditer</>}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white">✕</button>
          </div>
        )}

        {/* ------------------------------------------------------- idea bank */}
        {showIdeaBank && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 border border-amber-500/20 rounded-3xl p-6 sm:p-8 space-y-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" /> Banque d'idées
                </h3>
                <p className="text-sm text-zinc-400 mt-1">
                  {IDEA_TEMPLATES.length} concepts prêts à l'emploi pour TikTok, Reels et Shorts. Ajoutez-les à votre
                  stratégie, puis modifiez chaque champ librement — aucune clé API requise.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {IDEA_TEMPLATES.map(template => (
                <div key={template.id} className="bg-zinc-950/50 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-zinc-100">{template.label}</h4>
                      <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{template.tagline}</p>
                    </div>
                    <span className="shrink-0 text-xs font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-1 rounded-lg">
                      {template.idea.viralScore}/10
                    </span>
                  </div>
                  <button
                    onClick={() => addTemplateIdea(template.id)}
                    className="mt-auto flex items-center justify-center gap-2 text-sm font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 py-2 rounded-xl transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter ce concept
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* --------------------------------------------------- preferences */}
        {((!editedPromo || showPreferences)) && !isGenerating && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 space-y-8"
          >
            <div className="text-center max-w-2xl mx-auto space-y-2 mb-4">
              <h3 className="text-xl font-bold text-white flex items-center justify-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-400" /> Préférences de génération
              </h3>
              <p className="text-zinc-400 text-sm">
                Ciblez les formats, la durée et l'objectif de la campagne. Plus c'est précis, plus les concepts sont utilisables.
              </p>
            </div>

            {/* Platforms + duration + budget + goal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-300">Plateformes visées</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={preferences.platforms.includes(option)}
                      onClick={() => togglePref('platforms', option)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-300">Types de concepts recherchés</label>
                <div className="flex flex-wrap gap-2">
                  {STYLE_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={preferences.conceptStyles.includes(option)}
                      onClick={() => togglePref('conceptStyles', option)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-300">Durée cible par vidéo</label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={preferences.duration === option}
                      onClick={() => setPref('duration', preferences.duration === option ? '' : option)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-semibold text-zinc-300">Niveau de production</label>
                <div className="flex flex-wrap gap-2">
                  {BUDGET_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={preferences.budget === option}
                      onClick={() => setPref('budget', preferences.budget === option ? '' : option)}
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-3 md:col-span-2">
                <label className="block text-sm font-semibold text-zinc-300">Objectif principal de la campagne</label>
                <div className="flex flex-wrap gap-2">
                  {GOAL_OPTIONS.map(option => (
                    <Chip
                      key={option}
                      label={option}
                      active={preferences.goal === option}
                      onClick={() => setPref('goal', preferences.goal === option ? '' : option)}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Number of videos */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-300">Nombre de vidéos souhaitées</label>
              <div className="flex flex-wrap items-center gap-2">
                {COUNT_CHIPS.map(count => (
                  <Chip
                    key={count}
                    label={count}
                    active={preferences.numberOfVideos === count}
                    onClick={() => setPref('numberOfVideos', preferences.numberOfVideos === count ? '' : count)}
                  />
                ))}
                <input
                  type="text"
                  value={preferences.numberOfVideos}
                  onChange={e => setPref('numberOfVideos', e.target.value)}
                  placeholder="Ou un nombre libre (ex: 12)"
                  className="flex-1 min-w-[200px] bg-zinc-950/50 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
                />
              </div>
              <p className="text-xs text-zinc-600">Laissez vide pour laisser l'IA décider.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-300">Pseudo / handle (pour les appels à l'action)</label>
                <input
                  type="text"
                  value={preferences.handle}
                  onChange={e => setPref('handle', e.target.value)}
                  placeholder="@votrecompte"
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-zinc-300">Style / références visuelles</label>
                <input
                  type="text"
                  value={preferences.styleReferences}
                  onChange={e => setPref('styleReferences', e.target.value)}
                  placeholder="Ex: style Cole Bennett, esthétique film 35mm..."
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-zinc-300">Contraintes spécifiques (budget, lieux, temps...)</label>
              <textarea
                value={preferences.constraints}
                onChange={e => setPref('constraints', e.target.value)}
                placeholder="Ex: pas de budget, tournage en intérieur uniquement, 1 acteur maximum..."
                className="h-24 bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 resize-none w-full"
              />
            </div>

            <div className="pt-6 flex flex-col sm:flex-row justify-center gap-4 border-t border-zinc-800/50">
              {editedPromo && (
                <button
                  onClick={() => setShowPreferences(false)}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold py-3 px-6 rounded-xl transition-all"
                >
                  Annuler
                </button>
              )}
              <button
                onClick={handleGeneratePromo}
                className="flex items-center gap-2 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-pink-500/20 text-lg"
              >
                <Sparkles className="w-5 h-5" /> Générer la stratégie
              </button>
            </div>
          </motion.div>
        )}

        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-zinc-800/50">
            <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-6" />
            <p className="text-xl font-medium text-pink-400 animate-pulse">Analyse du scénario et création des concepts viraux...</p>
          </div>
        )}

        {/* ------------------------------------------------------------ results */}
        {editedPromo && !showPreferences && !isGenerating && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-pink-500/30 transition-colors">
                <div className="flex items-center gap-3 mb-6">
                  <TrendingUp className="w-5 h-5 text-pink-400" />
                  <h3 className="text-xl font-bold text-white">Tendances &amp; idées directrices</h3>
                </div>
                {isEditing ? (
                  <textarea
                    value={editedPromo.trendsAndIdeas}
                    onChange={e => handlePromoChange('trendsAndIdeas', e.target.value)}
                    className="w-full h-40 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-zinc-300 focus:outline-none focus:border-pink-500 resize-none"
                  />
                ) : (
                  <p className="text-zinc-300 leading-relaxed whitespace-pre-wrap">{editedPromo.trendsAndIdeas}</p>
                )}
              </div>

              <div className="space-y-6">
                <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-5 h-5 text-indigo-400" />
                    <h3 className="font-bold text-white">Audience cible</h3>
                  </div>
                  {isEditing ? (
                    <textarea
                      value={editedPromo.targetAudience}
                      onChange={e => handlePromoChange('targetAudience', e.target.value)}
                      className="w-full h-24 bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-indigo-500 resize-none"
                    />
                  ) : (
                    <p className="text-sm text-zinc-400">{editedPromo.targetAudience}</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-pink-500/10 to-orange-500/10 border border-pink-500/20 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
                  <Video className="w-8 h-8 text-pink-400 mb-3" />
                  <span className="text-sm text-zinc-400 uppercase tracking-widest font-semibold mb-1">Total Vidéos</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedPromo.numberOfVideos}
                      onChange={e => handlePromoChange('numberOfVideos', parseInt(e.target.value) || 0)}
                      className="bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-2 text-center w-24 text-2xl font-bold text-white mt-2"
                    />
                  ) : (
                    <span className="text-4xl font-black text-white">{editedPromo.numberOfVideos}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Ideas */}
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-orange-400" />
                  Concepts de vidéos courtes
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowIdeaBank(true)}
                    className="flex items-center gap-2 text-xs font-medium text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 px-3 py-2 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Ajouter depuis la banque
                  </button>
                  <button
                    onClick={() => setFavoritesOnly(!favoritesOnly)}
                    className={`flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${favoritesOnly ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-zinc-200'}`}
                  >
                    <Star className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-amber-400 text-amber-400' : ''}`} />
                    Favoris{favoriteCount > 0 ? ` (${favoriteCount})` : ''}
                  </button>
                </div>
              </div>

              {ideas.length === 0 && (
                <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl text-zinc-500">
                  {favoritesOnly
                    ? 'Aucun concept en favori pour l\'instant — cliquez sur l\'étoile d\'un concept.'
                    : 'Aucun concept. Ajoutez-en un depuis la banque d\'idées ou générez une stratégie avec l\'IA.'}
                </div>
              )}

              {ideas.map((idea) => {
                const realIndex = editedPromo.promoIdeas.indexOf(idea);
                return (
                  <div key={realIndex} className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden relative group">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-orange-500" />

                    <div className="p-8">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                        <div className="flex-1">
                          {isEditing ? (
                            <input
                              type="text"
                              value={idea.title}
                              onChange={e => handleIdeaChange(realIndex, 'title', e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-pink-500"
                            />
                          ) : (
                            <h4 className="text-2xl font-bold text-white mb-2">{idea.title}</h4>
                          )}

                          {isEditing ? (
                            <textarea
                              value={idea.concept}
                              onChange={e => handleIdeaChange(realIndex, 'concept', e.target.value)}
                              className="w-full h-20 mt-3 bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-pink-500 resize-none"
                            />
                          ) : (
                            <p className="text-pink-400 font-medium">{idea.concept}</p>
                          )}
                        </div>

                        <div className="flex gap-4 shrink-0">
                          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
                            <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Viralité</span>
                            <div className="flex items-end gap-1">
                              {isEditing ? (
                                <input type="number" max="10" min="1" value={idea.viralScore} onChange={e => handleIdeaChange(realIndex, 'viralScore', parseInt(e.target.value) || 1)} className="bg-transparent text-xl font-bold text-orange-400 w-10 text-center focus:outline-none" />
                              ) : (
                                <span className="text-2xl font-bold text-orange-400">{idea.viralScore}</span>
                              )}
                              <span className="text-zinc-600 font-bold">/10</span>
                            </div>
                          </div>
                          <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center min-w-[100px]">
                            <span className="text-xs text-zinc-500 uppercase tracking-wider mb-1">Efficacité</span>
                            <div className="flex items-end gap-1">
                              {isEditing ? (
                                <input type="number" max="10" min="1" value={idea.efficiencyScore} onChange={e => handleIdeaChange(realIndex, 'efficiencyScore', parseInt(e.target.value) || 1)} className="bg-transparent text-xl font-bold text-emerald-400 w-10 text-center focus:outline-none" />
                              ) : (
                                <span className="text-2xl font-bold text-emerald-400">{idea.efficiencyScore}</span>
                              )}
                              <span className="text-zinc-600 font-bold">/10</span>
                            </div>
                          </div>
                          <button
                            onClick={() => toggleFavorite(realIndex)}
                            title={idea.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                            className={`self-start p-2.5 rounded-xl border transition-colors ${idea.favorite ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-zinc-950/80 border-zinc-800 text-zinc-600 hover:text-amber-400 hover:border-amber-500/30'}`}
                          >
                            <Star className={`w-4 h-4 ${idea.favorite ? 'fill-amber-400' : ''}`} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div>
                          <h5 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <Video className="w-4 h-4" /> Script / déroulé
                          </h5>
                          {isEditing ? (
                            <textarea
                              value={idea.script}
                              onChange={e => handleIdeaChange(realIndex, 'script', e.target.value)}
                              className="w-full h-48 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-sm text-zinc-300 focus:outline-none focus:border-pink-500 resize-none"
                            />
                          ) : (
                            <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-5 text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                              {idea.script}
                            </div>
                          )}
                        </div>

                        <div className="space-y-6">
                          <div>
                            <h5 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Sparkles className="w-4 h-4" /> Style visuel &amp; montage
                            </h5>
                            {isEditing ? (
                              <textarea
                                value={idea.visualStyle}
                                onChange={e => handleIdeaChange(realIndex, 'visualStyle', e.target.value)}
                                className="w-full h-24 bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-pink-500 resize-none"
                              />
                            ) : (
                              <p className="text-sm text-zinc-400 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4">
                                {idea.visualStyle}
                              </p>
                            )}
                          </div>

                          <div>
                            <h5 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Activity className="w-4 h-4" /> Pourquoi ça marche ?
                            </h5>
                            {isEditing ? (
                              <textarea
                                value={idea.explanation}
                                onChange={e => handleIdeaChange(realIndex, 'explanation', e.target.value)}
                                className="w-full h-24 bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-sm text-zinc-300 focus:outline-none focus:border-pink-500 resize-none"
                              />
                            ) : (
                              <p className="text-sm text-zinc-400 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl p-4">
                                {idea.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {ideas.length > 0 && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setShowIdeaBank(true)}
                    className="flex items-center gap-2 text-sm font-medium text-pink-400 hover:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 py-3 px-6 rounded-xl transition-colors"
                  >
                    <BookmarkPlus className="w-4 h-4" /> Ajouter un autre concept
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </>
  );
}
