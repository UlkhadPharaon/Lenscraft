import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { Sparkles, Activity, MessageCircle, Music, Edit3, Save, Check } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Analysis() {
  const { treatment, setTreatment } = useAppContext();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [editedAnalysis, setEditedAnalysis] = useState(treatment?.analysis);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treatment) {
      navigate('/app');
    } else if (!isEditing) {
       setEditedAnalysis(treatment.analysis);
    }
  }, [treatment, navigate, isEditing]);

  const handleSave = () => {
    if (treatment && editedAnalysis) {
      setTreatment({
        ...treatment,
        analysis: editedAnalysis
      });
      setIsEditing(false);
      setSaved(true);
      toast.success('Analyse sauvegardée.');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleChange = (field: string, value: string) => {
    if (editedAnalysis) {
      setEditedAnalysis({ ...editedAnalysis, [field]: value });
    }
  };

  if (!treatment || !editedAnalysis) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 rounded-xl">
            <Sparkles className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-3xl font-bold">Analyse de l'Oeuvre</h2>
        </div>

        {isEditing ? (
           <button
              onClick={handleSave}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" /> Enregistrer
           </button>
        ) : (
           <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {saved ? <><Check className="w-4 h-4 text-emerald-400" /> Sauvegardé</> : <><Edit3 className="w-4 h-4" /> Éditer</>}
           </button>
        )}
      </div>

      {/* En-tête / Titre du Projet */}
      <div className="relative overflow-hidden mb-8 bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 sm:p-10 group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-indigo-500 to-cyan-500" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-pink-500/10 blur-3xl rounded-full" />
        
        <div className="relative z-10">
          <div className="flex flex-col gap-4">
            <span className="text-pink-400 text-sm font-semibold tracking-widest uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Titre du Projet
            </span>
            {isEditing ? (
              <input
                type="text"
                value={editedAnalysis.title || ''}
                onChange={(e) => handleChange('title', e.target.value)}
                className="w-full bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-3xl sm:text-4xl font-black text-zinc-100 focus:outline-none focus:border-pink-500 focus:ring-2 focus:ring-pink-500/20 transition-all font-sans"
                placeholder="Ex: Titre du clip..."
              />
            ) : (
              <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight">
                {editedAnalysis.title || 'Projet Sans Titre'}
              </h1>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-indigo-500/10 rounded-xl group-hover:bg-indigo-500/20 transition-colors">
               <MessageCircle className="w-5 h-5 text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Description & Concept</h3>
          </div>
          {isEditing ? (
            <textarea
              value={editedAnalysis.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full h-48 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-base text-zinc-200 focus:outline-none focus:border-indigo-500 transition-all resize-none"
            />
          ) : (
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
              {editedAnalysis.description}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-cyan-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-cyan-500/10 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
               <Sparkles className="w-5 h-5 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Thème Principal</h3>
          </div>
          {isEditing ? (
            <textarea
              value={editedAnalysis.theme}
              onChange={(e) => handleChange('theme', e.target.value)}
              className="w-full h-48 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-base text-zinc-200 focus:outline-none focus:border-cyan-500 transition-all resize-none"
            />
          ) : (
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
              {editedAnalysis.theme}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-emerald-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
               <Activity className="w-5 h-5 text-emerald-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Rythme & Dynamique</h3>
          </div>
          {isEditing ? (
            <textarea
              value={editedAnalysis.rhythm}
              onChange={(e) => handleChange('rhythm', e.target.value)}
              className="w-full h-48 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-base text-zinc-200 focus:outline-none focus:border-emerald-500 transition-all resize-none"
            />
          ) : (
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
              {editedAnalysis.rhythm}
            </div>
          )}
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-8 hover:border-purple-500/50 transition-colors group">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-purple-500/10 rounded-xl group-hover:bg-purple-500/20 transition-colors">
               <Music className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-zinc-100">Ambiance Visuelle (Vibe)</h3>
          </div>
          {isEditing ? (
            <textarea
              value={editedAnalysis.vibe}
              onChange={(e) => handleChange('vibe', e.target.value)}
              className="w-full h-48 bg-zinc-950/50 border border-zinc-700 rounded-xl p-4 text-base text-zinc-200 focus:outline-none focus:border-purple-500 transition-all resize-none"
            />
          ) : (
            <div className="text-zinc-300 leading-relaxed whitespace-pre-wrap text-base">
              {editedAnalysis.vibe}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
