import React from 'react';
import { Github } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface GitHubLoginButtonProps {
  className?: string;
  label?: string;
}

/** GitHub OAuth sign-in button (dark themed). */
export default function GitHubLoginButton({ className, label = 'Continuer avec GitHub' }: GitHubLoginButtonProps) {
  const { signInWithGithub } = useAuth();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithGithub();
    } catch (err: any) {
      setError(err?.message || 'Connexion GitHub impossible.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          'w-full flex items-center justify-center gap-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-zinc-500 text-zinc-100 font-medium py-3 px-4 rounded-xl transition-all disabled:opacity-60'
        }
      >
        <Github className="w-5 h-5" />
        {loading ? 'Redirection...' : label}
      </button>
      {error && <p className="text-xs text-red-400 mt-2 text-center">{error}</p>}
    </div>
  );
}
