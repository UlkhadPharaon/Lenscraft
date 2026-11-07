import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';

interface LoadingOverlayProps {
  visible: boolean;
  title?: string;
  description?: string;
}

/**
 * Full-screen blocking overlay used while AI generation runs.
 * Announced politely for screen readers via role="status".
 */
export default function LoadingOverlay({
  visible,
  title = 'Génération en cours',
  description = 'L\'IA analyse votre projet...',
}: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-6 px-6"
          role="status"
          aria-live="polite"
        >
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin" />
            <Loader2 className="w-6 h-6 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-zinc-100">{title}</p>
            <p className="text-sm text-zinc-400 max-w-sm">{description}</p>
          </div>
          <p className="text-xs text-zinc-600">Cela prend généralement 30 à 60 secondes.</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
