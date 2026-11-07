import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clapperboard, Loader2, Download, Users, TrendingUp, Clock } from 'lucide-react';
import { aggregateSurvey, demandScore, surveyToCsv, SOURCE_LABELS } from '../lib/survey';

interface Stats {
  total: number;
  withEmail: number;
  bySource: Record<string, number>;
  firstAt: number | null;
  lastAt: number | null;
}

interface RawResponse {
  at: number;
  source: string;
  answers: Record<string, string | string[]>;
}

const ADMIN_TOKEN_KEY = 'lenscraft_survey_token';

/** Results dashboard — reads /api/survey/stats and the raw responses for charts. */
export default function SurveyResults() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [responses, setResponses] = useState<RawResponse[]>([]);
  const [token, setToken] = useState(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const statsRes = await fetch('/api/survey/stats');
        if (!statsRes.ok) throw new Error('Stats indisponibles.');
        const statsBody = await statsRes.json();
        if (!active) return;
        setStats(statsBody.stats);

        const rawRes = await fetch(token ? `/api/survey/export?token=${encodeURIComponent(token)}` : '/api/survey/export');
        if (rawRes.ok) {
          const csv = await rawRes.text();
          const rows = csv
            .replace(/^\uFEFF/, '')
            .split(/\r?\n/)
            .slice(1)
            .filter(line => line.trim().length > 0)
            .map(line => {
              const cells = line.match(/("([^"]|"")*"|[^,]*)(,|$)/g) || [];
              return cells
                .map(cell => cell.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"'))
                .slice(0, -1);
            });
          const header = csv.replace(/^\uFEFF/, '').split(/\r?\n/)[0]
            .split(',').map(cell => cell.replace(/"/g, ''));
          setResponses(rows.map(cells => {
            const answers: Record<string, string | string[]> = {};
            header.slice(2).forEach((key, index) => {
              const value = cells[index + 2] ?? '';
              answers[key] = value.includes(' | ') ? value.split(' | ') : value;
            });
            return { at: Date.parse(cells[0]) || Date.now(), source: cells[1] || 'direct', answers };
          }));
        }
      } catch (err: any) {
        if (active) setError(err?.message || 'Impossible de charger les résultats.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const aggregated = useMemo(() => aggregateSurvey(responses), [responses]);
  const score = useMemo(() => demandScore(responses), [responses]);

  const downloadCsv = () => {
    const blob = new Blob([surveyToCsv(responses)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lenscraft-survey.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 text-zinc-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        <p className="text-sm">Chargement des réponses…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold tracking-tight">
              LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={downloadCsv}
              className="flex items-center gap-2 text-sm bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" /> CSV
            </button>
            <Link to="/survey" className="text-sm text-zinc-400 hover:text-zinc-100">Questionnaire</Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10 space-y-10">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Résultats de l'étude de marché</h1>
          <p className="text-sm text-zinc-400">
            Questionnaire de 1 minute diffusé auprès d'artistes et d'équipes de production.
          </p>
        </div>

        {error && !stats && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-2xl px-5 py-4 text-sm">
            {error} — les résultats bruts nécessitent un token si <code>SURVEY_TOKEN</code> est défini côté serveur.
            <div className="mt-3 flex gap-2">
              <input
                value={token}
                onChange={e => {
                  setToken(e.target.value);
                  localStorage.setItem(ADMIN_TOKEN_KEY, e.target.value);
                }}
                placeholder="Token d'administration"
                className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200"
              />
            </div>
          </div>
        )}

        {/* Headline numbers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" /> Réponses
            </div>
            <p className="text-4xl font-black">{stats?.total ?? responses.length}</p>
            {stats && stats.withEmail > 0 && (
              <p className="text-xs text-zinc-500 mt-1">{stats.withEmail} avec email (candidats au test)</p>
            )}
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
              <TrendingUp className="w-4 h-4" /> Score de demande
            </div>
            <p className="text-4xl font-black text-indigo-400">{score}<span className="text-lg text-zinc-600">/100</span></p>
            <p className="text-xs text-zinc-500 mt-1">Prix accepté + intention de tester</p>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 text-zinc-500 text-xs uppercase tracking-wider mb-2">
              <Clock className="w-3.5 h-3.5" /> Canaux
            </div>
            <div className="space-y-1 text-sm">
              {stats && Object.keys(stats.bySource).length > 0
                ? Object.entries(stats.bySource).map(([key, count]) => (
                    <div key={key} className="flex justify-between">
                      <span className="text-zinc-400">{SOURCE_LABELS[key] || key}</span>
                      <span className="font-semibold">{count}</span>
                    </div>
                  ))
                : <p className="text-zinc-600 text-xs">Aucune donnée encore.</p>}
            </div>
          </div>
        </div>

        {responses.length === 0 ? (
          <div className="text-center py-20 bg-zinc-900/30 border border-zinc-800/50 rounded-3xl">
            <h2 className="text-xl font-semibold text-zinc-300 mb-2">Aucune réponse pour l'instant</h2>
            <p className="text-sm text-zinc-500 mb-6">
              Partagez le lien du questionnaire avec un paramètre de source, par exemple :
            </p>
            <code className="text-xs text-indigo-300 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 block max-w-xl mx-auto">
              https://votre-domaine/survey?src=whatsapp
            </code>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(aggregated).map(([id, block]) => (
              <motion.div
                key={id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-zinc-900/40 border border-zinc-800/60 rounded-3xl p-6 sm:p-8"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
                  <h2 className="text-lg font-bold text-white">{block.label}</h2>
                  {block.average !== undefined && (
                    <span className="text-xs text-zinc-500">
                      Moyenne : <strong className="text-indigo-300">
                        {id === 'paid_before' || id === 'willing_to_pay'
                          ? `${Math.round(block.average).toLocaleString('fr-FR')} FCFA`
                          : block.average.toFixed(1)}
                      </strong>
                    </span>
                  )}
                </div>
                <div className="space-y-3">
                  {block.counts.map(row => (
                    <div key={row.option} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-300">{row.option}</span>
                        <span className="text-zinc-500 tabular-nums">
                          {row.count} · {Math.round(row.share * 100)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-zinc-950 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                          initial={{ width: 0 }}
                          animate={{ width: `${row.share * 100}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
