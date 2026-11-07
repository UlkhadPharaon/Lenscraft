import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { CalendarDays, MapPin, Users, Hammer, Edit3, Save, Check, Video, Film, LayoutList, TextSelection, Trash2, Plus } from 'lucide-react';
import { ProductionSchedule, ShootDay } from '../types';
import toast from 'react-hot-toast';
import ExportButtons from '../components/ExportButtons';

export default function Schedule() {
  const { treatment, setTreatment } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedSchedule, setEditedSchedule] = useState<ShootDay[]>(treatment?.schedule || []);
  const [editedProduction, setEditedProduction] = useState<ProductionSchedule>(treatment?.production || {
    prepDays: 0,
    shootDays: 0,
    postProdDays: 0,
    locationScouting: '',
    rehearsals: '',
    otherPrep: ''
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treatment) {
      navigate('/app');
    } else if (!isEditing) {
       if (treatment.schedule) setEditedSchedule(treatment.schedule);
       if (treatment.production) setEditedProduction(treatment.production);
    }
  }, [treatment, navigate, isEditing]);

  const handleSave = () => {
    if (treatment) {
      setTreatment({
        ...treatment,
        schedule: editedSchedule,
        production: editedProduction
      });
      setIsEditing(false);
      setSaved(true);
      toast.success('Planning sauvegardé.');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCellChange = (index: number, field: string, value: string) => {
     const newSched = [...editedSchedule];
     if (field === 'scenesToShoot') {
       newSched[index] = { ...newSched[index], [field]: value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n)) };
     } else if (field === 'castNeeded' || field === 'equipmentNeeded') {
       newSched[index] = { ...newSched[index], [field]: value.split(',').map(s => s.trim()).filter(s => s) };
     } else {
       newSched[index] = { ...newSched[index], [field]: value };
     }
     setEditedSchedule(newSched);
  };

  const addScheduleDay = () => {
    const newDayNumber = editedSchedule.length > 0 ? Math.max(...editedSchedule.map(d => typeof d.day === 'number' ? d.day : parseInt(d.day) || 0)) + 1 : 1;
    setEditedSchedule([...editedSchedule, {
       day: newDayNumber,
       location: '',
       estimatedTime: '',
       scenesToShoot: [],
       castNeeded: [],
       equipmentNeeded: []
    }]);
  };

  const removeScheduleDay = (index: number) => {
    setEditedSchedule(editedSchedule.filter((_, i) => i !== index));
  };

  const handleProductionChange = (field: keyof ProductionSchedule, value: string | number) => {
     setEditedProduction(prev => ({ ...prev, [field]: value }));
  };

  if (!treatment) return null;
  const hasSchedule = Boolean(treatment.schedule?.length || treatment.production);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-12 pb-20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-amber-500/10 rounded-xl flex items-center justify-center">
            <CalendarDays className="w-6 h-6 text-amber-400" />
          </div>
          <h2 className="text-3xl font-bold">Planning de Tournage</h2>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons
            treatment={treatment}
            override={{ ...treatment, schedule: editedSchedule, production: editedProduction }}
            label="Exporter"
          />
          
          {isEditing ? (
             <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-medium py-2 px-4 rounded-lg transition-colors"
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
      </div>

      <div className="space-y-8">
        {!hasSchedule && (
          <div className="text-center py-10 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl text-zinc-500">
            <p>Aucun planning défini.</p>
            <p className="text-xs mt-1">Cliquez sur « Éditer » puis « Ajouter un Jour de Tournage » pour le construire à la main.</p>
          </div>
        )}
        {/* Production Overview */}
        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-6 border-b border-zinc-800/50 pb-4">
            <LayoutList className="w-5 h-5 text-indigo-400" />
            <h3 className="text-xl font-bold text-zinc-100">Vue d'ensemble de la production</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
             <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Jours de Prépa</span>
                {isEditing ? (
                  <input type="number" value={editedProduction.prepDays} onChange={e => handleProductionChange('prepDays', parseInt(e.target.value) || 0)} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-center w-24 text-xl font-bold text-indigo-400" />
                ) : (
                  <span className="text-3xl font-bold text-indigo-400">{editedProduction.prepDays}</span>
                )}
             </div>
             <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Jours de Tournage</span>
                {isEditing ? (
                  <input type="number" value={editedProduction.shootDays} onChange={e => handleProductionChange('shootDays', parseInt(e.target.value) || 0)} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-center w-24 text-xl font-bold text-amber-400" />
                ) : (
                  <span className="text-3xl font-bold text-amber-400">{editedProduction.shootDays}</span>
                )}
             </div>
             <div className="bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 flex flex-col items-center justify-center">
                <span className="text-zinc-500 text-xs font-medium uppercase tracking-wider mb-2">Jours de Post-Prod</span>
                {isEditing ? (
                  <input type="number" value={editedProduction.postProdDays} onChange={e => handleProductionChange('postProdDays', parseInt(e.target.value) || 0)} className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-center w-24 text-xl font-bold text-rose-400" />
                ) : (
                  <span className="text-3xl font-bold text-rose-400">{editedProduction.postProdDays}</span>
                )}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                 <MapPin className="w-4 h-4 text-emerald-400" /> Repérages & Décors
               </label>
               {isEditing ? (
                 <textarea 
                   value={editedProduction.locationScouting} 
                   onChange={e => handleProductionChange('locationScouting', e.target.value)}
                   className="w-full bg-zinc-950/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 min-h-[100px]"
                   placeholder="Détails sur les visites de décors, autorisations..."
                 />
               ) : (
                 <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 min-h-[100px] whitespace-pre-wrap">
                   {editedProduction.locationScouting || <span className="italic opacity-50">Non spécifié</span>}
                 </div>
               )}
            </div>
            
            <div className="space-y-2">
               <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                 <Users className="w-4 h-4 text-blue-400" /> Répétitions & Chorégraphie
               </label>
               {isEditing ? (
                 <textarea 
                   value={editedProduction.rehearsals} 
                   onChange={e => handleProductionChange('rehearsals', e.target.value)}
                   className="w-full bg-zinc-950/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 min-h-[100px]"
                   placeholder="Détails sur les répétitions, danseurs, temps en studio..."
                 />
               ) : (
                 <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 min-h-[100px] whitespace-pre-wrap">
                   {editedProduction.rehearsals || <span className="italic opacity-50">Non spécifié</span>}
                 </div>
               )}
            </div>

            <div className="space-y-2 md:col-span-2">
               <label className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                 <TextSelection className="w-4 h-4 text-purple-400" /> Autres Éléments de Préparation
               </label>
               {isEditing ? (
                 <textarea 
                   value={editedProduction.otherPrep} 
                   onChange={e => handleProductionChange('otherPrep', e.target.value)}
                   className="w-full bg-zinc-950/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-200 min-h-[80px]"
                   placeholder="Casting, essayages, essais caméra, location de matériel..."
                 />
               ) : (
                 <div className="bg-zinc-950/30 border border-zinc-800/50 rounded-lg p-4 text-sm text-zinc-400 min-h-[80px] whitespace-pre-wrap">
                   {editedProduction.otherPrep || <span className="italic opacity-50">Non spécifié</span>}
                 </div>
               )}
            </div>
          </div>
        </div>

        {/* Detailed Shoot Schedule */}
        <div className="flex items-center gap-2 mt-12 mb-6 border-b border-zinc-800/50 pb-4">
          <Film className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-bold text-zinc-100">Détail des Jours de Tournage</h3>
        </div>

        <div className="space-y-6">
           {editedSchedule.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/30 border border-zinc-800/50 rounded-2xl text-zinc-500">
              Aucun jour de tournage défini.
            </div>
          )}
          {editedSchedule.map((day, i) => (
          <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
            {isEditing && (
              <button 
                onClick={() => removeScheduleDay(i)}
                className="absolute top-4 right-4 p-2 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors z-10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            
            <div className="flex gap-6">
               <div className="w-24 shrink-0 flex flex-col items-center justify-center py-4 bg-zinc-950/50 rounded-xl border border-zinc-800">
                  <span className="text-xs font-medium text-zinc-500 uppercase tracking-widest mb-1">Jour</span>
                  <span className="text-3xl font-bold text-amber-400">{day.day}</span>
               </div>
               
               <div className="flex-1 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Lieu de tournage</label>
                        {isEditing ? (
                           <input 
                              value={day.location}
                              onChange={(e) => handleCellChange(i, 'location', e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                           />
                        ) : (
                           <div className="flex items-center gap-2 text-zinc-200 font-medium">
                              <MapPin className="w-4 h-4 text-emerald-400" /> {day.location}
                           </div>
                        )}
                     </div>
                     <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Horaires estimés</label>
                        {isEditing ? (
                           <input 
                              value={day.estimatedTime}
                              onChange={(e) => handleCellChange(i, 'estimatedTime', e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                           />
                        ) : (
                           <span className="inline-block bg-zinc-800/50 text-amber-300/80 px-3 py-1 rounded-full text-sm font-mono">
                              {day.estimatedTime}
                           </span>
                        )}
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/50">
                     <div className="space-y-3">
                        <div>
                           <label className="text-xs text-zinc-500 mb-1 block">Scènes à tourner</label>
                           {isEditing ? (
                              <input 
                                 value={day.scenesToShoot.join(', ')}
                                 onChange={(e) => handleCellChange(i, 'scenesToShoot', e.target.value)}
                                 className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                                 placeholder="Ex: 1, 2, 5"
                              />
                           ) : (
                              <div className="flex flex-wrap gap-2">
                                 {day.scenesToShoot.map(s => (
                                    <span key={s} className="bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2 py-0.5 rounded text-xs font-mono font-medium">
                                       Scène {s}
                                    </span>
                                 ))}
                              </div>
                           )}
                        </div>
                        <div>
                           <label className="text-xs text-zinc-500 mb-1 block">Casting (Call Time)</label>
                           {isEditing ? (
                              <textarea 
                                 value={day.castNeeded.join(', ')}
                                 onChange={(e) => handleCellChange(i, 'castNeeded', e.target.value)}
                                 className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                                 rows={2}
                                 placeholder="Cast séparés par des virgules"
                              />
                           ) : (
                              <div className="flex items-start gap-2">
                                 <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                                 <span className="text-sm text-zinc-300 leading-relaxed">{day.castNeeded.join(', ')}</span>
                              </div>
                           )}
                        </div>
                     </div>
                     
                     <div>
                        <label className="text-xs text-zinc-500 mb-1 block">Équipement Spécifique</label>
                        {isEditing ? (
                           <textarea 
                              value={day.equipmentNeeded.join(', ')}
                              onChange={(e) => handleCellChange(i, 'equipmentNeeded', e.target.value)}
                              className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                              rows={3}
                              placeholder="Equipements séparés par des virgules"
                           />
                        ) : (
                           <div className="flex items-start gap-2 bg-zinc-950/50 p-3 rounded-xl">
                               <Hammer className="w-4 h-4 text-zinc-500 shrink-0 mt-0.5" />
                               <ul className="text-sm text-zinc-400 leading-relaxed list-disc list-inside">
                                  {day.equipmentNeeded.map((eq, j) => (
                                     <li key={j}>{eq}</li>
                                  ))}
                               </ul>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          </div>
        ))}
        {isEditing && (
           <div className="flex justify-center mt-6">
              <button onClick={addScheduleDay} className="flex items-center gap-2 text-sm font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 py-3 px-6 rounded-xl transition-colors">
                 <Plus className="w-5 h-5" /> Ajouter un Jour de Tournage
              </button>
           </div>
        )}
      </div>
     </div>
    </motion.div>
  );
}
