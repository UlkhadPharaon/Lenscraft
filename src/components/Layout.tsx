import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Clapperboard, FileText, ListVideo, Sparkles, ArrowLeft, Plus, Camera, CalendarDays, Share2, Cpu } from 'lucide-react';
import { useAppContext, AIModel } from '../context';
import ChatAssistant from './ChatAssistant';

export default function Layout() {
  const { treatment, setTreatment, selectedModel, setSelectedModel } = useAppContext();
  const navigate = useNavigate();

  const handleReset = () => {
    setTreatment(null);
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/" className="flex items-center gap-3 group">
            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span></h1>
          </NavLink>
          
          {treatment && (
            <nav className="hidden md:flex items-center space-x-1">
               <NavLink to="/analysis" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Sparkles className="w-4 h-4" />
                 Analyse
               </NavLink>
               <NavLink to="/script" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <FileText className="w-4 h-4" />
                 Script
               </NavLink>
               <NavLink to="/scenes" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <ListVideo className="w-4 h-4" />
                 Scènes
               </NavLink>
               <NavLink to="/shotlist" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Camera className="w-4 h-4" />
                 Plans
               </NavLink>
               <NavLink to="/schedule" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <CalendarDays className="w-4 h-4" />
                 Planning
               </NavLink>
               <NavLink to="/promo" className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-pink-500/10 text-pink-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Share2 className="w-4 h-4" />
                 Promo
               </NavLink>
            </nav>
          )}

          <div className="flex items-center gap-3">
             <div className="relative group/model">
                <button className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1.5 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800">
                  <Cpu className="w-4 h-4" />
                  <span className="hidden sm:inline">{selectedModel.replace('gemini-', '').replace('-preview', '')}</span>
                </button>
                <div className="absolute top-full right-0 mt-1 w-40 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/model:opacity-100 group-hover/model:visible transition-all z-50 overflow-hidden">
                  {(['gemini-3.5-flash', 'gemini-3.1-pro-preview'] as AIModel[]).map(model => (
                    <button
                      key={model}
                      onClick={() => setSelectedModel(model)}
                      className={`w-full text-left px-3 py-2 text-xs transition-colors ${selectedModel === model ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                    >
                      {model.replace('gemini-', '').replace('-preview', '')}
                    </button>
                  ))}
                </div>
             </div>

             {treatment ? (
                <NavLink to="/" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 hover:bg-zinc-900 rounded-lg border border-zinc-800">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Tableau de bord</span>
                </NavLink>
             ) : (
                <NavLink to="/new" className="hidden sm:flex items-center gap-2 text-sm bg-zinc-100 hover:bg-white text-zinc-900 transition-colors px-3 py-1.5 rounded-lg">
                  <Plus className="w-4 h-4" />
                  Nouveau
                </NavLink>
             )}
          </div>
        </div>
        
        {/* Mobile Nav */}
        {treatment && (
           <div className="md:hidden flex overflow-x-auto border-t border-zinc-800 px-4 py-2 space-x-2">
               <NavLink to="/analysis" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Sparkles className="w-3.5 h-3.5" />
                 Analyse
               </NavLink>
               <NavLink to="/script" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <FileText className="w-3.5 h-3.5" />
                 Script
               </NavLink>
               <NavLink to="/scenes" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <ListVideo className="w-3.5 h-3.5" />
                 Scènes
               </NavLink>
               <NavLink to="/shotlist" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Camera className="w-3.5 h-3.5" />
                 Plans
               </NavLink>
               <NavLink to="/schedule" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <CalendarDays className="w-3.5 h-3.5" />
                 Planning
               </NavLink>
               <NavLink to="/promo" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive ? 'bg-pink-500/10 text-pink-400' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'}`}>
                 <Share2 className="w-3.5 h-3.5" />
                 Promo
               </NavLink>
           </div>
        )}
      </header>
      
      <main className="max-w-6xl mx-auto p-4 md:p-8">
        <Outlet />
      </main>

      <ChatAssistant />
    </div>
  );
}
