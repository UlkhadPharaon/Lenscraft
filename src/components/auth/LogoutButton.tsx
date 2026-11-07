import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

/** Signs the user out and returns them to the landing page. */
export default function LogoutButton({ className, label = 'Déconnexion' }: LogoutButtonProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await signOut();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className={
        className ??
        'flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors px-3 py-1.5 hover:bg-zinc-900 rounded-lg border border-zinc-800 disabled:opacity-60'
      }
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{loading ? 'Déconnexion...' : label}</span>
    </button>
  );
}
