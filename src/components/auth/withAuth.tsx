import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

/**
 * Route guard. Renders `children` only when a session exists; otherwise
 * redirects to /login (preserving the intended destination) or to the landing
 * page when in local mode with no account yet.
 */
export default function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthGuardedComponent(props: P) {
    const { user, initializing, mode } = useAuth();
    const location = useLocation();

    if (initializing) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-zinc-400">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm">Chargement de votre session...</p>
        </div>
      );
    }

    if (!user) {
      const target = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`;
      return <Navigate to={mode === 'local' ? `/login${location.search}` : target} replace />;
    }

    return <Component {...props} />;
  };
}
