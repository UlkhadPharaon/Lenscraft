import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { Share2, Edit3, Save, Check, Download, TrendingUp, Target, Video, Sparkles, Activity, History, RefreshCcw } from 'lucide-react';
import { exportToDocx } from '../utils/export';
import { PromoStrategy, PromoIdea } from '../types';

export default function Promo() {
  const { treatment, setTreatment, selectedModel } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  
  // Set initial active promo to the treatment's active one or fallback
  const getInitialPromo = () => {
    if (!treatment) return null;
    if (treatment.activePromoVersionId && treatment.promoVersions) {
      return treatment.promoVersions.find(v => v.versionId === treatment.activePromoVersionId) || treatment.promoStrategy || null;
    }
    return treatment.promoStrategy || null;
  };

  const [editedPromo, setEditedPromo] = useState<PromoStrategy | null>(getInitialPromo());
  const [saved, setSaved] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showVersions, setShowVersions] = useState(false);

  // New state for generation preferences
  const [preferences, setPreferences] = useState({
    numberOfVideos: '',
    constraints: '',
    styleReferences: ''
  });

  useEffect(() => {
    if (!treatment) {
      navigate('/');
    } else if (!isEditing) {
       setEditedPromo(getInitialPromo());
    }
  }, [treatment, navigate, isEditing]);

  const handleSave = () => {
    if (treatment && editedPromo) {
      const versions = treatment.promoVersions || [];
      const updatedVersions = versions.map(v => v.versionId === editedPromo.versionId ? editedPromo : v);
      
      setTreatment({
        ...treatment,
        promoStrategy: editedPromo, // for backward compatibility
        promoVersions: updatedVersions.length ? updatedVersions : [editedPromo],
        activePromoVersionId: editedPromo.versionId
      });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const switchVersion = (versionId: string) => {
    if (treatment?.promoVersions) {
      const selected = treatment.promoVersions.find(v => v.versionId === versionId);
      if (selected) {
        setEditedPromo(selected);
        setTreatment({
          ...treatment,
          activePromoVersionId: versionId
        });
        setIsEditing(false);
      }
    }
    setShowVersions(false);
  };

  const handleExport = () => {
    if (treatment) {
      // For now, we export what we have, we might need to update export.ts to include promo.
      exportToDocx({ ...treatment, promoStrategy: editedPromo || undefined });
    }
  };

  const handleGeneratePromo = async () => {
    if (!treatment) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/generate-promo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatment, preferences, model: selectedModel }) 
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur: ${response.status}`);
      }

      const generatedData = await response.json();
      
      const prevVersions = treatment.promoVersions || [];
      // Si on a un vieux promoStrategy non versionné, on le met dans l'historique
      if (prevVersions.length === 0 && treatment.promoStrategy) {
         prevVersions.push({
           ...treatment.promoStrategy,
           versionId: crypto.randomUUID(),
           versionName: "Version 1",
           createdAt: treatment.createdAt || Date.now()
         });
      }

      const newStrategy: PromoStrategy = {
        ...generatedData,
        versionId: crypto.randomUUID(),
        versionName: `Version ${prevVersions.length + 1}`,
        createdAt: Date.now()
      };

      const updatedVersions = [...prevVersions, newStrategy];

      setEditedPromo(newStrategy);
      setTreatment({ 
        ...treatment, 
        promoStrategy: newStrategy, // On garde pour compatibilité
        promoVersions: updatedVersions,
        activePromoVersionId: newStrategy.versionId
      });
      // Optionally reset preferences for next generation
      // setPreferences({ numberOfVideos: '', constraints: '', styleReferences: '' });
      setShowPreferences(false); // Hide preferences form after generating
    } catch (err: any) {
      setError(err.message || "Une erreur est survenue lors de la génération.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePromoChange = (field: keyof PromoStrategy, value: any) => {
    if (editedPromo) {
      setEditedPromo({ ...editedPromo, [field]: value });
    }
  };

  const handleIdeaChange = (index: number, field: keyof PromoIdea, value: any) => {
    if (editedPromo) {
      const newIdeas = [...editedPromo.promoIdeas];
      newIdeas[index] = { ...newIdeas[index], [field]: value };
      setEditedPromo({ ...editedPromo, promoIdeas: newIdeas });
    }
  };

  if (!treatment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-12 pb-20"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-pink-500/20 to-orange-500/10 rounded-2xl border border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]">
            <Share2 className="w-8 h-8 text-pink-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Stratégie Promo & Shorts</h2>
            <p className="text-zinc-500 text-sm mt-1">Concepts viraux pour TikTok, Reels et Shorts.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {editedPromo && (
            <>
              {treatment.promoVersions && treatment.promoVersions.length > 1 && (
                <div className="relative">
                  <button
                    onClick={() => setShowVersions(!showVersions)}
                    className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700/50 hover:border-zinc-500/50 font-medium py-2 px-4 rounded-xl transition-all"
                  >
                    <History className="w-4 h-4" /> {editedPromo.versionName || "Version"}
                  </button>
                  {showVersions && (
                    <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-10">
                      {treatment.promoVersions.map(v => (
                        <button
                          key={v.versionId}
                          onClick={() => switchVersion(v.versionId!)}
                          className={`w-full text-left px-4 py-3 text-sm transition-colors ${v.versionId === editedPromo.versionId ? 'bg-pink-500/20 text-pink-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
                        >
                          {v.versionName || "Ancienne version"}
                          {v.createdAt && <span className="block text-xs opacity-50 mt-1">{new Date(v.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={() => setShowPreferences(!showPreferences)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-orange-400 border border-orange-500/30 hover:border-orange-500/50 font-medium py-2 px-4 rounded-xl transition-all"
                title="Générer une nouvelle version"
              >
                <RefreshCcw className="w-4 h-4" /> Relancer
              </button>

              <button
                onClick={handleExport}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-700/50 hover:border-blue-500/50 font-medium py-2 px-4 rounded-xl transition-all"
              >
                <Download className="w-4 h-4" /> Exporter
              </button>
              
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

      {((!editedPromo || showPreferences) && !isGenerating) && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 space-y-8"
        >
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-8">
            <h3 className="text-xl font-bold text-white">Préférences de génération</h3>
            <p className="text-zinc-400 text-sm">Aidez l'IA à cibler vos besoins. Vous pouvez laisser les champs vides ou cocher "Je ne sais pas" pour laisser l'IA proposer les meilleures options.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-300">Nombre de vidéos souhaitées</label>
              <div className="relative">
                <input
                  type="text"
                  value={preferences.numberOfVideos}
                  onChange={e => setPreferences({...preferences, numberOfVideos: e.target.value})}
                  placeholder="Ex: 5, entre 3 et 5..."
                  className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
                  disabled={preferences.numberOfVideos === "Je ne sais pas"}
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-zinc-400 hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={preferences.numberOfVideos === "Je ne sais pas"}
                  onChange={(e) => setPreferences({...preferences, numberOfVideos: e.target.checked ? "Je ne sais pas" : ""})}
                  className="rounded border-zinc-700 text-pink-500 focus:ring-pink-500 bg-zinc-900"
                />
                Laisse l'IA décider
              </label>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-semibold text-zinc-300">Style / Références visuelles</label>
              <input
                type="text"
                value={preferences.styleReferences}
                onChange={e => setPreferences({...preferences, styleReferences: e.target.value})}
                placeholder="Ex: Dynamique, style Cole Bennett, vlog..."
                className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500"
                disabled={preferences.styleReferences === "Je ne sais pas"}
              />
              <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-zinc-400 hover:text-zinc-300">
                <input
                  type="checkbox"
                  checked={preferences.styleReferences === "Je ne sais pas"}
                  onChange={(e) => setPreferences({...preferences, styleReferences: e.target.checked ? "Je ne sais pas" : ""})}
                  className="rounded border-zinc-700 text-pink-500 focus:ring-pink-500 bg-zinc-900"
                />
                Laisse l'IA proposer
              </label>
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-zinc-300">Contraintes spécifiques (Budget, lieux, temps...)</label>
            <textarea
              value={preferences.constraints}
              onChange={e => setPreferences({...preferences, constraints: e.target.value})}
              placeholder="Ex: Pas de budget, tournage en intérieur uniquement, 1 acteur maximum..."
              className="w-full h-24 bg-zinc-950/50 border border-zinc-700 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:border-pink-500 resize-none"
              disabled={preferences.constraints === "Je ne sais pas"}
            />
            <label className="flex items-center gap-2 cursor-pointer mt-2 text-sm text-zinc-400 hover:text-zinc-300">
              <input
                type="checkbox"
                checked={preferences.constraints === "Je ne sais pas"}
                onChange={(e) => setPreferences({...preferences, constraints: e.target.checked ? "Je ne sais pas" : ""})}
                className="rounded border-zinc-700 text-pink-500 focus:ring-pink-500 bg-zinc-900"
              />
              Aucune contrainte, laisse l'IA imaginer
            </label>
          </div>

          <div className="pt-6 flex justify-center gap-4 border-t border-zinc-800/50">
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
              <Sparkles className="w-5 h-5" /> Générer la Stratégie
            </button>
          </div>
        </motion.div>
      )}

      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-20 bg-zinc-900/20 rounded-3xl border border-zinc-800/50">
          <div className="w-16 h-16 border-4 border-pink-500/30 border-t-pink-500 rounded-full animate-spin mb-6"></div>
          <p className="text-xl font-medium text-pink-400 animate-pulse">Analyse du scénario et création des concepts viraux...</p>
        </div>
      )}

      {(editedPromo && !showPreferences && !isGenerating) && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-pink-500/30 transition-colors">
              <div className="flex items-center gap-3 mb-6">
                <TrendingUp className="w-5 h-5 text-pink-400" />
                <h3 className="text-xl font-bold text-white">Tendances & Idées Directrices</h3>
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
                  <h3 className="font-bold text-white">Audience Cible</h3>
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

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-white flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-orange-400" />
              Concepts de Vidéos Courtes
            </h3>

            {editedPromo.promoIdeas.map((idea, index) => (
              <div key={index} className="bg-zinc-900/30 border border-zinc-800/50 rounded-3xl overflow-hidden relative group">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pink-500 to-orange-500" />
                
                <div className="p-8">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
                    <div className="flex-1">
                      {isEditing ? (
                        <input
                          type="text"
                          value={idea.title}
                          onChange={e => handleIdeaChange(index, 'title', e.target.value)}
                          className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl p-3 text-xl font-bold text-white focus:outline-none focus:border-pink-500"
                        />
                      ) : (
                        <h4 className="text-2xl font-bold text-white mb-2">{idea.title}</h4>
                      )}
                      
                      {isEditing ? (
                        <textarea
                          value={idea.concept}
                          onChange={e => handleIdeaChange(index, 'concept', e.target.value)}
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
                             <input type="number" max="10" min="1" value={idea.viralScore} onChange={e => handleIdeaChange(index, 'viralScore', parseInt(e.target.value)||1)} className="bg-transparent text-xl font-bold text-orange-400 w-10 text-center focus:outline-none" />
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
                             <input type="number" max="10" min="1" value={idea.efficiencyScore} onChange={e => handleIdeaChange(index, 'efficiencyScore', parseInt(e.target.value)||1)} className="bg-transparent text-xl font-bold text-emerald-400 w-10 text-center focus:outline-none" />
                          ) : (
                            <span className="text-2xl font-bold text-emerald-400">{idea.efficiencyScore}</span>
                          )}
                          <span className="text-zinc-600 font-bold">/10</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <h5 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Video className="w-4 h-4" /> Script / Déroulé
                      </h5>
                      {isEditing ? (
                        <textarea
                          value={idea.script}
                          onChange={e => handleIdeaChange(index, 'script', e.target.value)}
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
                          <Sparkles className="w-4 h-4" /> Style Visuel & Montage
                        </h5>
                        {isEditing ? (
                          <textarea
                            value={idea.visualStyle}
                            onChange={e => handleIdeaChange(index, 'visualStyle', e.target.value)}
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
                            onChange={e => handleIdeaChange(index, 'explanation', e.target.value)}
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
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
