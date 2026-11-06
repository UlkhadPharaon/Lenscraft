import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppContext } from '../context';
import { Plus, Clapperboard, Trash2, Clock, ChevronRight } from 'lucide-react';

export default function Dashboard() {
  const { projects, deleteProject, setTreatment } = useAppContext();
  const navigate = useNavigate();

  useEffect(() => {
    // Clear currently selected treatment when visiting the dashboard
    setTreatment(null);
  }, [setTreatment]);

  const handleNewProject = () => {
    navigate('/new');
  };

  const handleOpenProject = (id: string) => {
    const project = projects.find(p => p.id === id);
    if (project) {
      setTreatment(project);
      navigate('/analysis');
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Voulez-vous vraiment supprimer ce projet ?')) {
      deleteProject(id);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Clapperboard className="w-8 h-8 text-indigo-400" />
            Mes Projets
          </h2>
          <p className="text-zinc-400 mt-2">Retrouvez et gérez tous vos dossiers de production vidéo.</p>
        </div>
        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 px-6 rounded-xl transition-colors shadow-lg shadow-indigo-500/20"
        >
          <Plus className="w-5 h-5" />
          Nouveau Projet
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl border-dashed">
          <Clapperboard className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-300 mb-2">Aucun projet</h3>
          <p className="text-zinc-500 mb-6">Vous n'avez pas encore généré de dossier de production.</p>
          <button
            onClick={handleNewProject}
            className="flex items-center gap-2 mx-auto bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2.5 px-6 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            Créer mon premier projet
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => (
            <motion.div
               key={project.id}
               whileHover={{ y: -4 }}
               onClick={() => handleOpenProject(project.id!)}
               className="bg-zinc-900/50 border border-zinc-800 hover:border-indigo-500/50 rounded-2xl p-6 cursor-pointer group transition-all relative overflow-hidden"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
               <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-zinc-100 line-clamp-2 leading-tight">
                    {project.analysis.title || "Projet Sans Titre"}
                  </h3>
                  <button 
                    onClick={(e) => handleDelete(e, project.id!)}
                    className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
               </div>
               <p className="text-zinc-400 text-sm line-clamp-2 mb-6">
                 {project.analysis.description || project.analysis.theme}
               </p>
               <div className="flex items-center justify-between mt-auto">
                 <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(project.createdAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                 </div>
                 <div className="text-indigo-400 flex items-center gap-1 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0">
                    Ouvrir <ChevronRight className="w-4 h-4" />
                 </div>
               </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
