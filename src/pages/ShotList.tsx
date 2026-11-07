import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { Camera, Edit3, Save, Check, Trash2, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import ExportButtons from '../components/ExportButtons';

export default function ShotList() {
  const { treatment, setTreatment } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedShots, setEditedShots] = useState(treatment?.shotList || []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treatment) {
      navigate('/app');
    } else if (!isEditing && treatment.shotList) {
       setEditedShots(treatment.shotList);
    }
  }, [treatment, navigate, isEditing]);
  const handleSave = () => {
    if (treatment) {
      setTreatment({
        ...treatment,
        shotList: editedShots
      });
      setIsEditing(false);
      setSaved(true);
      toast.success('Découpage technique sauvegardé.');
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleCellChange = (index: number, field: string, value: string) => {
     const newShots = [...editedShots];
     newShots[index] = { ...newShots[index], [field]: value };
     setEditedShots(newShots);
  };

  // C2 fix: builds a shot matching the `Shot` interface exactly
  // (sceneNumber/shotNumber as NUMBERS, type/cameraMovement/lens/duration/description).
  const addShot = () => {
    const numbers = editedShots.map(s => Number(s.shotNumber) || 0);
    const newShotNumber = (numbers.length > 0 ? Math.max(...numbers) : 0) + 1;
    const sceneNumbers = editedShots.map(s => Number(s.sceneNumber) || 0);
    const fallbackScene = sceneNumbers.length > 0 ? sceneNumbers[sceneNumbers.length - 1] : 1;
    setEditedShots([...editedShots, {
       sceneNumber: fallbackScene,
       shotNumber: newShotNumber,
       type: '',
       cameraMovement: '',
       lens: '',
       duration: '',
       description: ''
    }]);
  };

  const removeShot = (index: number) => {
    setEditedShots(editedShots.filter((_, i) => i !== index));
  };

  // A blank (manually created) dossier has no shotList yet — render it as an
  // empty editable table instead of returning null.
  if (!treatment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-500/10 rounded-xl flex items-center justify-center">
            <Camera className="w-6 h-6 text-purple-400" />
          </div>
          <h2 className="text-3xl font-bold">Découpage Technique (Shot List)</h2>
        </div>

        <div className="flex items-center gap-3">
          <ExportButtons treatment={treatment} override={{ ...treatment, shotList: editedShots }} label="Exporter" />
          
          {isEditing ? (
             <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
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

      <div className="bg-zinc-900/50 rounded-2xl border border-zinc-800/50 overflow-hidden">
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-sm">
                  <th className="py-4 px-4 font-medium w-24">Scène/Plan</th>
                  <th className="py-4 px-4 font-medium">Type</th>
                  <th className="py-4 px-4 font-medium">Mouvement</th>
                  <th className="py-4 px-4 font-medium">Objectif (Lens)</th>
                  <th className="py-4 px-4 font-medium">Durée</th>
                  <th className="py-4 px-4 font-medium">Description</th>
                  {isEditing && <th className="py-4 px-4 font-medium w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {editedShots.map((shot, i) => (
                  <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-4 align-top">
                       <div className="text-lg font-mono font-bold text-zinc-500">
                          {String(shot.sceneNumber).padStart(2, '0')}/{String(shot.shotNumber).padStart(2, '0')}
                       </div>
                    </td>
                    <td className="py-4 px-4 align-top">
                       {isEditing ? (
                          <input 
                             value={shot.type} 
                             onChange={(e) => handleCellChange(i, 'type', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                          />
                       ) : (
                          <span className="inline-flex px-2 py-1 bg-purple-500/10 text-purple-300 rounded text-sm font-medium">
                            {shot.type}
                          </span>
                       )}
                    </td>
                    <td className="py-4 px-4 align-top">
                       {isEditing ? (
                          <input 
                             value={shot.cameraMovement} 
                             onChange={(e) => handleCellChange(i, 'cameraMovement', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                          />
                       ) : (
                          <p className="text-zinc-300 text-sm">{shot.cameraMovement}</p>
                       )}
                    </td>
                    <td className="py-4 px-4 align-top">
                       {isEditing ? (
                          <input 
                             value={shot.lens} 
                             onChange={(e) => handleCellChange(i, 'lens', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                          />
                       ) : (
                          <span className="text-zinc-400 font-mono text-sm">{shot.lens}</span>
                       )}
                    </td>
                    <td className="py-4 px-4 align-top">
                       {isEditing ? (
                          <input 
                             value={shot.duration} 
                             onChange={(e) => handleCellChange(i, 'duration', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                          />
                       ) : (
                          <span className="text-zinc-500 font-mono text-sm">{shot.duration}</span>
                       )}
                    </td>
                    <td className="py-4 px-4 align-top w-[35%]">
                       {isEditing ? (
                          <textarea 
                             value={shot.description} 
                             onChange={(e) => handleCellChange(i, 'description', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-400"
                             rows={3}
                          />
                       ) : (
                          <p className="text-zinc-400 text-sm leading-relaxed">
                             {shot.description}
                          </p>
                       )}
                    </td>
                    {isEditing && (
                      <td className="py-4 px-4 align-top">
                        <button onClick={() => removeShot(i)} className="p-2 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
                           <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
         </div>
         {isEditing && (
            <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-center">
               <button onClick={addShot} className="flex items-center gap-2 text-sm font-medium text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 py-2 px-4 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Ajouter un Plan
               </button>
            </div>
         )}
      </div>
    </motion.div>
  );
}
