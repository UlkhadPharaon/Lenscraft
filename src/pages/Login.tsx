import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clapperboard, Mail, Lock, Loader2, User as UserIcon, ArrowRight } from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import GitHubLoginButton from '../components/auth/GitHubLoginButton';
import toast from 'react-hot-toast';

/** Shared shell for the sign-in / sign-up screens. */
function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.12),_transparent_55%)] pointer-events-none" />
      <div className="relative flex-1 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 space-y-6 backdrop-blur-sm"
        >
          <Link to="/" className="flex items-center justify-center gap-3 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
            </span>
          </Link>
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-sm text-zinc-400">{subtitle}</p>
          </div>
          {children}
          <div className="pt-2 border-t border-zinc-800 text-center text-sm text-zinc-500">{footer}</div>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const { signInWithGoogle, signInWithEmail, mode, signInAsLocalGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const afterAuth = () => navigate(redirect, { replace: true });

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      toast.success('Content de vous revoir !');
      afterAuth();
    } catch (err: any) {
      setError(err?.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Connexion Google impossible.');
    }
  };

  const handleLocalGuest = async () => {
    setLoading(true);
    try {
      await signInAsLocalGuest();
      toast.success('Session démo lancée.');
      afterAuth();
    } catch (err: any) {
      setError(err?.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Se connecter"
      subtitle="Accédez à vos dossiers de production depuis n'importe quel appareil."
      footer={<>Pas encore de compte ? <Link to="/signup" className="text-indigo-400 hover:text-indigo-300">Créer un compte</Link></>}
    >
      {mode === 'local' && (
        <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          PocketBase n'est pas configuré : la connexion par email/OAuth est désactivée. Utilisez la session démo locale pour explorer l'application.
        </div>
      )}

      {mode === 'pocketbase' && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-950 font-medium py-3 px-4 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.67 4.1-5.5 4.1A6.2 6.2 0 0 1 12 5.8c1.6 0 2.8.6 3.7 1.5l2.7-2.6A9.6 9.6 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4.1 9.6-9.8 0-.6-.06-1.1-.16-1.6H12z" />
            </svg>
            Continuer avec Google
          </button>
          <GitHubLoginButton />
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="flex-1 h-px bg-zinc-800" /> ou <span className="flex-1 h-px bg-zinc-800" />
          </div>
          <form onSubmit={handleEmail} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="login-email" className="text-xs font-medium text-zinc-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-xs font-medium text-zinc-400">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="••••••••"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Se connecter
            </button>
          </form>
        </>
      )}

      {mode === 'local' && (
        <button
          type="button"
          onClick={handleLocalGuest}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Continuer en session démo
        </button>
      )}
    </AuthShell>
  );
}

export function SignupPage() {
  const { signUpWithEmail, signInWithGoogle, mode, signInAsLocalGuest } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/app';

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmail(email, password, fullName);
      setInfo('Compte créé ! Vérifiez vos emails pour confirmer votre adresse, puis connectez-vous.');
      toast.success('Compte créé.');
      setTimeout(() => navigate(redirect, { replace: true }), 1500);
    } catch (err: any) {
      setError(err?.message || 'Inscription impossible.');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalGuest = async () => {
    setLoading(true);
    try {
      await signInAsLocalGuest();
      toast.success('Session démo lancée.');
      navigate(redirect, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Créer un compte"
      subtitle="1 dossier de production gratuit par mois, sans carte bancaire."
      footer={<>Déjà inscrit ? <Link to="/login" className="text-indigo-400 hover:text-indigo-300">Se connecter</Link></>}
    >
      {mode === 'local' && (
        <div className="text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          PocketBase n'est pas configuré : l'inscription par email/OAuth est désactivée. Utilisez la session démo locale pour explorer l'application.
        </div>
      )}

      {mode === 'pocketbase' && (
        <>
          <button
            type="button"
            onClick={() => signInWithGoogle().catch(err => setError(err?.message))}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-950 font-medium py-3 px-4 rounded-xl transition-all"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.67 4.1-5.5 4.1A6.2 6.2 0 0 1 12 5.8c1.6 0 2.8.6 3.7 1.5l2.7-2.6A9.6 9.6 0 0 0 12 2a10 10 0 1 0 0 20c5.8 0 9.6-4.1 9.6-9.8 0-.6-.06-1.1-.16-1.6H12z" />
            </svg>
            S'inscrire avec Google
          </button>
          <GitHubLoginButton label="S'inscrire avec GitHub" />
          <div className="flex items-center gap-3 text-xs text-zinc-600">
            <span className="flex-1 h-px bg-zinc-800" /> ou <span className="flex-1 h-px bg-zinc-800" />
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="signup-name" className="text-xs font-medium text-zinc-400">Nom complet</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="signup-name"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="Votre nom"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-email" className="text-xs font-medium text-zinc-400">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="signup-email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="vous@exemple.com"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="signup-password" className="text-xs font-medium text-zinc-400">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="signup-password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                  placeholder="6 caractères minimum"
                />
              </div>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            {info && <p className="text-xs text-emerald-400">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-60"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              Créer mon compte
            </button>
          </form>
        </>
      )}

      {mode === 'local' && (
        <button
          type="button"
          onClick={handleLocalGuest}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl transition-all disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
          Essayer gratuitement (démo)
        </button>
      )}
    </AuthShell>
  );
}
