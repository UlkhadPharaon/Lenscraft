import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { ListVideo, Map, Users, Download, Edit3, Save, Check, Trash2, Plus } from 'lucide-react';
import { exportToDocx } from '../utils/export';

export default function Scenes() {
  const { treatment, setTreatment } = useAppContext();
  const navigate = useNavigate();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedScenes, setEditedScenes] = useState(treatment?.scenes || []);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treatment) {
      navigate('/');
    } else if (!isEditing) {
       setEditedScenes(treatment.scenes);
    }
  }, [treatment, navigate, isEditing]);

  const handleSave = () => {
    if (treatment) {
      setTreatment({
        ...treatment,
        scenes: editedScenes
      });
      setIsEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExport = () => {
    if (treatment) {
      exportToDocx({ ...treatment, scenes: editedScenes });
    }
  };

  const handleCellChange = (index: number, field: string, value: string) => {
     const newScenes = [...editedScenes];
     newScenes[index] = { ...newScenes[index], [field]: value };
     setEditedScenes(newScenes);
  };

  const addScene = () => {
     const newSceneNumber = editedScenes.length > 0 ? Math.max(...editedScenes.map(s => s.sceneNumber)) + 1 : 1;
     setEditedScenes([...editedScenes, {
         sceneNumber: newSceneNumber,
         action: '',
         set: '',
         actors: '',
         actionDescription: ''
     }]);
  };

  const removeScene = (index: number) => {
     setEditedScenes(editedScenes.filter((_, i) => i !== index));
  };

  if (!treatment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-500/10 rounded-xl flex items-center justify-center">
            <ListVideo className="w-6 h-6 text-rose-400" />
          </div>
          <h2 className="text-3xl font-bold">Tableau des Scènes</h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Exporter (.docx)
          </button>
          
          {isEditing ? (
             <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-rose-500 hover:bg-rose-400 text-rose-950 font-medium py-2 px-4 rounded-lg transition-colors"
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
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-zinc-900/80 border-b border-zinc-800 text-zinc-400 text-sm">
                  <th className="py-4 px-6 font-medium w-24">Scène</th>
                  <th className="py-4 px-6 font-medium">Action & Timing</th>
                  <th className="py-4 px-6 font-medium">Lieu / Décor</th>
                  <th className="py-4 px-6 font-medium">Description Détaillée</th>
                  <th className="py-4 px-6 font-medium">Artistes / Acteurs</th>
                  {isEditing && <th className="py-4 px-6 font-medium w-16"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {editedScenes.map((scene, i) => (
                  <tr key={i} className="hover:bg-zinc-800/20 transition-colors">
                    <td className="py-4 px-6 align-top">
                       <div className="text-xl font-bold text-zinc-500">
                          {String(scene.sceneNumber).padStart(2, '0')}
                       </div>
                    </td>
                    <td className="py-4 px-6 align-top">
                       {isEditing ? (
                          <textarea 
                             value={scene.action} 
                             onChange={(e) => handleCellChange(i, 'action', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                             rows={2}
                          />
                       ) : (
                          <p className="text-zinc-200 font-medium">{scene.action}</p>
                       )}
                    </td>
                    <td className="py-4 px-6 align-top">
                       {isEditing ? (
                          <textarea 
                             value={scene.set} 
                             onChange={(e) => handleCellChange(i, 'set', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                             rows={2}
                          />
                       ) : (
                          <div className="flex items-start gap-2">
                              <Map className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                              <span className="text-zinc-300">{scene.set}</span>
                          </div>
                       )}
                    </td>
                    <td className="py-4 px-6 align-top w-[30%]">
                       {isEditing ? (
                          <textarea 
                             value={scene.actionDescription} 
                             onChange={(e) => handleCellChange(i, 'actionDescription', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-400"
                             rows={4}
                          />
                       ) : (
                          <p className="text-zinc-400 text-sm leading-relaxed">
                             {scene.actionDescription}
                          </p>
                       )}
                    </td>
                    <td className="py-4 px-6 align-top">
                       {isEditing ? (
                          <textarea 
                             value={scene.actors} 
                             onChange={(e) => handleCellChange(i, 'actors', e.target.value)}
                             className="w-full bg-zinc-950/50 border border-zinc-700 rounded p-2 text-sm text-zinc-200"
                             rows={2}
                          />
                       ) : (
                          <div className="flex items-start gap-2">
                              <Users className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
                              <span className="text-zinc-300">{scene.actors}</span>
                          </div>
                       )}
                    </td>
                    {isEditing && (
                      <td className="py-4 px-6 align-top">
                        <button onClick={() => removeScene(i)} className="p-2 text-rose-500/50 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors">
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
               <button onClick={addScene} className="flex items-center gap-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 py-2 px-4 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Ajouter une Scène
               </button>
            </div>
         )}
      </div>
    </motion.div>
  );
}
