import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Clapperboard, FileText, ListVideo, Sparkles, ArrowLeft, Plus, Camera, CalendarDays, Share2, Cpu } from 'lucide-react';
import { useAppContext } from '../context';
import { useAuth } from './auth/AuthProvider';
import { useAiConfig } from '../lib/aiConfig';
import ChatAssistant from './ChatAssistant';
import LoginButton from './auth/LoginButton';
import LogoutButton from './auth/LogoutButton';

const SECTION_TABS = [
  { to: '/app/analysis', label: 'Analyse', icon: Sparkles },
  { to: '/app/script', label: 'Script', icon: FileText },
  { to: '/app/scenes', label: 'Scènes', icon: ListVideo },
  { to: '/app/shotlist', label: 'Plans', icon: Camera },
  { to: '/app/schedule', label: 'Planning', icon: CalendarDays },
  { to: '/app/promo', label: 'Promo', icon: Share2, promo: true },
] as const;

export default function Layout() {
  const { treatment, setTreatment, selectedModel, setSelectedModel } = useAppContext();
  const { user, profile } = useAuth();
  const aiConfig = useAiConfig();
  const navigate = useNavigate();

  const handleReset = () => {
    setTreatment(null);
    navigate('/app');
  };

  // Only offer the models that belong to the configured provider.
  const providerModels = aiConfig.models.filter(m => m.provider === aiConfig.provider);
  const modelsToShow = providerModels.length ? providerModels : aiConfig.models;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <NavLink to="/app" className="flex items-center gap-3 group">
            <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span></h1>
          </NavLink>

          {treatment && (
            <nav className="hidden md:flex items-center space-x-1">
              {SECTION_TABS.map(({ to, label, icon: Icon, ...rest }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? ('promo' in rest && rest.promo ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400')
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}

          <div className="flex items-center gap-3">
            <div className="relative group/model">
              <button
                className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors px-2 py-1.5 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800"
                title={`Modèle IA (${aiConfig.provider === 'openrouter' ? 'OpenRouter' : 'Gemini'})`}
              >
                <Cpu className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {modelsToShow.find(m => m.id === selectedModel)?.label
                    || selectedModel.replace('gemini-', '').replace('qwen/', 'Qwen ').replace('-preview', '')}
                </span>
              </button>
              <div className="absolute top-full right-0 mt-1 w-48 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 invisible group-hover/model:opacity-100 group-hover/model:visible transition-all z-50 overflow-hidden">
                <p className="px-3 pt-2 pb-1 text-[10px] uppercase tracking-wider text-zinc-600">
                  {aiConfig.provider === 'openrouter' ? 'OpenRouter' : 'Google Gemini'}
                </p>
                {modelsToShow.map(model => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id as any)}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors ${selectedModel === model.id ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'}`}
                  >
                    {model.label}
                  </button>
                ))}
              </div>
            </div>

            {treatment ? (
              <NavLink to="/app" className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 hover:bg-zinc-900 rounded-lg border border-zinc-800">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Tableau de bord</span>
              </NavLink>
            ) : (
              <NavLink to="/app/new" className="hidden sm:flex items-center gap-2 text-sm bg-zinc-100 hover:bg-white text-zinc-900 transition-colors px-3 py-1.5 rounded-lg">
                <Plus className="w-4 h-4" />
                Nouveau
              </NavLink>
            )}

            {user ? (
              <div className="flex items-center gap-2 pl-3 border-l border-zinc-800">
                <span className="hidden lg:inline text-xs text-zinc-500 max-w-[160px] truncate" title={user.email}>
                  {profile?.subscriptionTier && profile.subscriptionTier !== 'free' ? (
                    <span className="text-amber-400 font-semibold uppercase">{profile.subscriptionTier}</span>
                  ) : (
                    user.fullName || user.email
                  )}
                </span>
                <LogoutButton />
              </div>
            ) : (
              <LoginButton className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-100 transition-colors px-3 py-1.5 rounded-lg" />
            )}
          </div>
        </div>

        {/* Mobile Nav — horizontal scroll */}
        {treatment && (
          <div className="md:hidden flex overflow-x-auto border-t border-zinc-800 px-4 py-2 space-x-2">
            {SECTION_TABS.map(({ to, label, icon: Icon, ...rest }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? ('promo' in rest && rest.promo ? 'bg-pink-500/10 text-pink-400' : 'bg-indigo-500/10 text-indigo-400')
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </NavLink>
            ))}
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
