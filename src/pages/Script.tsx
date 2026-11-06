import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { FileText, Save, Check, Download } from 'lucide-react';
import { exportToDocx } from '../utils/export';

export default function Script() {
  const { treatment, setTreatment } = useAppContext();
  const navigate = useNavigate();
  
  const [scriptText, setScriptText] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!treatment) {
      navigate('/');
    } else if (!scriptText) {
      setScriptText(treatment.script);
    }
  }, [treatment, navigate]);

  const handleSave = () => {
    if (treatment) {
      setTreatment({
        ...treatment,
        script: scriptText
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleExport = () => {
    if (treatment) {
      exportToDocx({ ...treatment, script: scriptText });
    }
  };

  if (!treatment) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-amber-500/20 to-rose-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <FileText className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-white tracking-tight">Script & Scénario</h2>
            <p className="text-zinc-500 text-sm mt-1">Éditeur de scénario textuel complet.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-blue-400 border border-zinc-700/50 hover:border-blue-500/50 font-medium py-2 px-5 rounded-xl transition-all"
          >
            <Download className="w-4 h-4" /> Exporter (.docx)
          </button>
          
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-lg shadow-amber-500/20 font-medium py-2 px-6 rounded-xl transition-all font-semibold"
          >
            {saved ? (
               <><Check className="w-5 h-5" /> Enregistré</>
            ) : (
               <><Save className="w-5 h-5" /> Sauvegarder</>
            )}
          </button>
        </div>
      </div>

      <div className="bg-zinc-900/40 rounded-3xl border border-zinc-800/50 flex flex-col h-[75vh] shadow-[0_8px_30px_rgb(0,0,0,0.4)] relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-rose-500 to-purple-500 opacity-70" />
        <div className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/80 p-4 px-6 flex items-center justify-between z-10">
           <div className="flex items-center gap-3">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
              <span className="text-xs font-bold text-zinc-300 uppercase tracking-[0.2em]">Scénario Interactif</span>
           </div>
           
           <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
             <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span>{scriptText.trim().split(/\s+/).filter(w => w.length > 0).length} Mots</span>
             </div>
             <div className="flex items-center gap-1.5 bg-zinc-900/80 border border-zinc-800 px-3 py-1.5 rounded-lg">
                <span>{scriptText.length} Caractères</span>
             </div>
           </div>
        </div>
        
        <div className="flex-1 relative">
           <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/5 via-zinc-900/0 to-zinc-900/0" />
           <textarea
             value={scriptText}
             onChange={(e) => setScriptText(e.target.value)}
             className="absolute inset-0 w-full h-full p-8 md:p-14 bg-transparent text-zinc-200 resize-none focus:outline-none focus:ring-0 font-mono leading-[2.2] text-base md:text-[1.1rem] custom-scrollbar placeholder:text-zinc-700 selection:bg-amber-500/30"
             placeholder="Écrivez le scénario détaillé de votre film ou clip visuel ici..."
             spellCheck={false}
           />
        </div>
      </div>
    </motion.div>
  );
}
