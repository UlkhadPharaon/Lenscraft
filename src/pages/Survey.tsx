import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clapperboard, ArrowLeft, ArrowRight, Check, Loader2, MessageSquareHeart, Download,
} from 'lucide-react';
import { SURVEY_QUESTIONS, SOURCE_LABELS, type SurveyAnswers } from '../lib/survey';
import { postJson } from '../utils/api';
import toast from 'react-hot-toast';

const STORAGE_KEY = 'lenscraft_survey_answers';

export default function Survey() {
  const [searchParams] = useSearchParams();
  const source = searchParams.get('src') || 'direct';

  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [accepted, setAccepted] = useState(false);

  const questions = SURVEY_QUESTIONS;
  const question = questions[step];
  const progress = Math.round(((step + 1) / questions.length) * 100);

  const isAnswered = useMemo(() => {
    const value = answers[question.id];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'string') return value.trim().length > 0;
    return false;
  }, [answers, question]);

  const canContinue = question.optional ? true : isAnswered;

  const persist = (next: SurveyAnswers) => {
    setAnswers(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable — the survey still works in-session */
    }
  };

  const choose = (option: string) => {
    if (question.kind === 'multi') {
      const current = Array.isArray(answers[question.id]) ? (answers[question.id] as string[]) : [];
      const next = current.includes(option)
        ? current.filter(value => value !== option)
        : [...current, option];
      persist({ ...answers, [question.id]: next });
    } else {
      persist({ ...answers, [question.id]: option });
      // Single-choice questions advance automatically — keeps it under a minute.
      window.setTimeout(() => {
        if (step < questions.length - 1) setStep(step + 1);
      }, 180);
    }
  };

  const setText = (value: string) => persist({ ...answers, [question.id]: value });

  const goNext = () => {
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      void submit();
    }
  };

  const goBack = () => setStep(prev => Math.max(0, prev - 1));

  const submit = async () => {
    setSubmitting(true);
    try {
      const result = await postJson<{ stored: boolean }>('/api/survey', {
        body: { answers, source },
        retries: 2,
      });
      setDone(true);
      toast.success(result?.stored ? 'Merci ! Vos réponses sont enregistrées.' : 'Merci pour vos réponses !');
    } catch (error) {
      // Offline / no server: still record locally so nothing is lost.
      try {
        const existing = JSON.parse(localStorage.getItem('lenscraft_survey_pending') || '[]');
        existing.push({ at: Date.now(), source, answers });
        localStorage.setItem('lenscraft_survey_pending', JSON.stringify(existing));
      } catch {
        /* ignore */
      }
      setDone(true);
      toast('Merci ! Réponses enregistrées sur cet appareil.', { icon: '💾' });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadAnswers = () => {
    const blob = new Blob([JSON.stringify({ source, answers }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lenscraft-mes-reponses.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full bg-zinc-900/60 border border-zinc-800 rounded-3xl p-8 text-center space-y-6"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Check className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Merci, c'est enregistré !</h1>
            <p className="text-sm text-zinc-400">
              Vos réponses servent directement à construire LensCraft AI : quelles fonctionnalités
              sont les plus utiles, à quel prix, et pour quels usages.
            </p>
          </div>

          {answers.trial_interest === 'Oui, envoyez-moi l’accès' && typeof answers.email === 'string' && answers.email && (
            <p className="text-xs text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
              Vous recevrez un accès de test à <strong>{answers.email}</strong> très prochainement.
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <a
              href="/"
              className="flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 px-6 rounded-xl transition-all"
            >
              Découvrir LensCraft AI
            </a>
            <button
              onClick={downloadAnswers}
              className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium py-3 px-6 rounded-xl transition-colors"
            >
              <Download className="w-4 h-4" /> Garder une copie
            </button>
          </div>

          {!accepted && source !== 'direct' && (
            <p className="text-[11px] text-zinc-600">Questionnaire partagé via {SOURCE_LABELS[source] || source}.</p>
          )}
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <header className="border-b border-zinc-800/80">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold tracking-tight">
              LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
            </span>
          </a>
          <span className="text-xs text-zinc-500">
            Question {step + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1 bg-zinc-900">
          <motion.div
            className="h-full bg-gradient-to-r from-indigo-500 to-cyan-500"
            animate={{ width: `${progress}%` }}
            transition={{ ease: 'easeOut', duration: 0.25 }}
          />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={question.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{question.label}</h1>
                {question.hint && <p className="text-sm text-zinc-500">{question.hint}</p>}
              </div>

              {question.kind === 'text' ? (
                <div className="space-y-4">
                  <input
                    type="email"
                    autoFocus
                    value={String(answers[question.id] ?? '')}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') goNext();
                    }}
                    placeholder="vous@exemple.com"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 text-lg"
                  />
                  <p className="text-xs text-zinc-600">Laissez vide et continuez si vous préférez ne pas donner votre email.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {question.options?.map((option, index) => {
                    const selected = Array.isArray(answers[question.id])
                      ? (answers[question.id] as string[]).includes(option)
                      : answers[question.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => choose(option)}
                        className={`w-full flex items-center gap-4 text-left px-5 py-4 rounded-2xl border transition-all ${
                          selected
                            ? 'bg-indigo-500/15 border-indigo-500/50 text-white'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
                        }`}
                      >
                        <span className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold ${
                          selected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-zinc-700 text-zinc-500'
                        }`}>
                          {selected ? <Check className="w-3.5 h-3.5" /> : index + 1}
                        </span>
                        <span className="text-base">{option}</span>
                        {question.kind === 'multi' && (
                          <span className="ml-auto text-[11px] text-zinc-600">plusieurs choix</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex items-center justify-between pt-4">
                <button
                  type="button"
                  onClick={goBack}
                  disabled={step === 0}
                  className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour
                </button>

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!canContinue || submitting}
                  className="flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 px-6 rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Envoi…</>
                  ) : step === questions.length - 1 ? (
                    <><MessageSquareHeart className="w-4 h-4" /> Envoyer mes réponses</>
                  ) : (
                    <>Suivant <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <footer className="py-6 text-center text-[11px] text-zinc-600">
        Réponses anonymes, utilisées uniquement pour améliorer LensCraft AI.
      </footer>
    </div>
  );
}
