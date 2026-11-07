import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LoginButtonProps {
  className?: string;
  label?: string;
  /** Route to land on after a successful sign-in. */
  redirectTo?: string;
}

/** Primary "Se connecter" button. Sends the user to /login. */
export default function LoginButton({ className, label = 'Se connecter', redirectTo }: LoginButtonProps) {
  const navigate = useNavigate();
  const { signInWithGoogle } = useAuth();
  const [error, setError] = React.useState<string | null>(null);

  const handleClick = async () => {
    // On the marketing pages the button is a shortcut to the full auth screen.
    if (window.location.pathname !== '/login') {
      navigate(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login');
      return;
    }

    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Connexion impossible.');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          className ??
          'flex items-center gap-2 bg-zinc-100 hover:bg-white text-zinc-950 font-medium py-2 px-4 rounded-lg transition-colors text-sm'
        }
      >
        <LogIn className="w-4 h-4" />
        {label}
      </button>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </>
  );
}
