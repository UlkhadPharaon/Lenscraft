import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Optional custom fallback; the default is the branded recovery card. */
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches render/runtime crashes in the React tree and shows a recovery UI
 * instead of a white screen. Also wired as the place to plug in Sentry later.
 */
export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Future: forward to Sentry / Logtail.
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/60 border border-red-500/30 rounded-3xl p-8 text-center space-y-5">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-zinc-100">Une erreur est survenue</h1>
            <p className="text-sm text-zinc-400">
              L'interface a rencontré un problème inattendu. Vos données sont conservées — vous pouvez relancer l'affichage.
            </p>
          </div>
          {this.state.error?.message && (
            <pre className="text-xs text-left text-zinc-500 bg-zinc-950/60 border border-zinc-800 rounded-xl p-3 overflow-x-auto">
              {this.state.error.message}
            </pre>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-2.5 px-5 rounded-xl transition-colors"
            >
              <RotateCcw className="w-4 h-4" /> Réessayer
            </button>
            <button
              onClick={this.handleReload}
              className="flex items-center justify-center gap-2 bg-red-600/80 hover:bg-red-600 text-white font-medium py-2.5 px-5 rounded-xl transition-colors"
            >
              Recharger la page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
