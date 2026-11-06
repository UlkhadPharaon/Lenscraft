import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { useAppContext } from "../context";
import { VideoTreatment } from "../types";
import { Music, Sparkles, Youtube, UploadCloud, FileAudio, Trash2, Loader2, Clapperboard, Globe } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const { setTreatment, selectedModel } = useAppContext();
  
  const [description, setDescription] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [language, setLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFile = (file: File) => {
    if (file && file.type.startsWith('audio/')) {
      if (file.size > 20 * 1024 * 1024) {
        setError("La taille du fichier ne doit pas dépasser 20 Mo.");
        return;
      }
      setAudioFile(file);
      setError(null);
    } else {
      setError("Veuillez sélectionner un fichier audio valide (MP3, WAV, etc.), les fichiers vidéo ne sont pas supportés directement.");
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const encoded = reader.result as string;
        resolve(encoded.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description && !lyrics && !audioFile && !youtubeUrl) return;
    
    setLoading(true);
    setError(null);

    try {
      let audioBase64 = undefined;
      let audioMimeType = undefined;

      if (audioFile) {
        audioBase64 = await getBase64(audioFile);
        audioMimeType = audioFile.type;
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, lyrics, audioBase64, audioMimeType, youtubeUrl, language, model: selectedModel }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Échec de la génération (Erreur ${res.status}). Le modèle est peut-être surchargé, veuillez réessayer.`);
      }

      const data: VideoTreatment = await res.json();
      
      const newProject: VideoTreatment = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      
      setTreatment(newProject);
      navigate("/analysis");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-10">
         <h2 className="text-3xl font-bold mb-3">Nouveau Projet</h2>
         <p className="text-zinc-400">Générez des scénarios, listes de plans et dossiers de production cinématiques à partir de votre musique.</p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-6 bg-zinc-900/50 p-6 sm:p-8 rounded-3xl border border-zinc-800/50 backdrop-blur-sm">
        
        <div className="space-y-4">
          <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Music className="w-4 h-4 text-indigo-400" />
            Source Audio
          </label>
          
          {audioFile ? (
             <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-lg shrink-0">
                    <FileAudio className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-200 text-sm">{audioFile.name}</p>
                    <p className="text-xs text-zinc-500">{(audioFile.size / 1024 / 1024).toFixed(2)} Mo</p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => setAudioFile(null)}
                  className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
          ) : (
            <div 
              className={`relative flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-xl transition-colors ${isDragging ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-700 hover:border-zinc-600 bg-zinc-950'}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <div className="space-y-2 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-zinc-500" />
                <div className="flex text-sm text-zinc-400 justify-center">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer rounded-md font-medium text-indigo-400 hover:text-indigo-300 focus-within:outline-none"
                  >
                    <span>Uploadez un fichier</span>
                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} />
                  </label>
                  <p className="pl-1">ou glissez-déposez ici</p>
                </div>
                <p className="text-xs text-zinc-500">MP3, WAV, M4A jusqu'à 20 Mo</p>
              </div>
            </div>
          )}

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Youtube className="h-5 w-5 text-zinc-500" />
            </div>
            <input
              type="url"
              className="block w-full pl-10 bg-zinc-950 border border-zinc-800 rounded-xl py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
              placeholder="Ou collez un lien YouTube..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-emerald-400" />
            Langue ou Origine (optionnel)
          </label>
          <input
            id="language"
            type="text"
            className="block w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all text-sm"
            placeholder="Ex: Français, Anglais, Mooré (Burkina Faso), etc..."
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            Concept de la Chanson
          </label>
          <textarea
            id="description"
            rows={2}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none"
            placeholder="Décrivez le genre, l'ambiance, ou le message sous-jacent..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="lyrics" className="text-sm font-medium text-zinc-300 flex items-center gap-2">
            <Music className="w-4 h-4 text-purple-400" />
            Paroles / Structure Musicale
          </label>
          <textarea
            id="lyrics"
            rows={4}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all resize-none font-mono text-sm"
            placeholder="Collez les paroles ou la structure musicale (Intro, Couplet 1, Refrain)..."
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (!description && !lyrics && !audioFile && !youtubeUrl)}
          className="w-full group relative flex items-center justify-center gap-2 bg-white text-zinc-950 font-medium py-3.5 px-6 rounded-xl hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden shadow-lg shadow-white/5"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyse en cours...
            </>
          ) : (
            <>
              <Clapperboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
              Lancer l'Analyse
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
}
