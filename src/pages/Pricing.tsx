import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Clapperboard, Check, Crown, Loader2, Sparkles, X, BadgeCheck, RefreshCcw } from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import { useAiConfig, formatCfa } from '../lib/aiConfig';
import { postJson, messageFor } from '../utils/api';
import toast from 'react-hot-toast';

type Tier = 'free' | 'pro' | 'studio';

interface PlanDef {
  tier: Tier;
  name: string;
  price: number | null;
  cadence: string;
  tagline: string;
  highlight?: boolean;
  features: string[];
  cta: string;
}

/** Prix en Franc CFA (XOF). */
const PLANS: PlanDef[] = [
  {
    tier: 'free',
    name: 'Gratuit',
    price: 0,
    cadence: 'FCFA / mois',
    tagline: 'Pour découvrir LensCraft et produire un premier dossier.',
    features: [
      '1 dossier de production / mois',
      'Modèle IA Flash',
      'Édition complète des sections',
      'Export DOCX + PDF',
      'Historique 7 jours',
    ],
    cta: 'Commencer gratuitement',
  },
  {
    tier: 'pro',
    name: 'Pro',
    price: 5000,
    cadence: 'FCFA / mois',
    tagline: 'Pour les artistes qui produisent régulièrement.',
    highlight: true,
    features: [
      'Dossiers illimités',
      'Modèles Flash + Pro',
      '3 campagnes promo / mois',
      'Historique 30 jours',
      'Export sans watermark',
      'Support prioritaire',
    ],
    cta: 'Passer au Pro',
  },
  {
    tier: 'studio',
    name: 'Studio',
    price: 15000,
    cadence: 'FCFA / mois',
    tagline: 'Pour les réalisateurs et les équipes de production.',
    features: [
      'Tout le plan Pro',
      'Campagnes promo illimitées',
      'Historique illimité',
      'Export Markdown + white-label',
      'Collaboration jusqu\'à 10 membres',
      'Accès API complet',
    ],
    cta: 'Passer au Studio',
  },
];

const COMPARISON: { label: string; values: Record<Tier, string> }[] = [
  { label: 'Dossiers / mois', values: { free: '1', pro: 'Illimité', studio: 'Illimité' } },
  { label: 'Modèles IA', values: { free: 'Flash', pro: 'Flash + Pro', studio: 'Flash + Pro + Turbo' } },
  { label: 'Exports', values: { free: 'DOCX + PDF', pro: 'DOCX + PDF', studio: 'DOCX + PDF + MD' } },
  { label: 'Historique', values: { free: '7 jours', pro: '30 jours', studio: 'Illimité' } },
  { label: 'Campagnes promo', values: { free: '1', pro: '3 / mois', studio: 'Illimité' } },
  { label: 'Collaboration', values: { free: '—', pro: '2 membres', studio: '10 membres' } },
  { label: 'Accès API', values: { free: '—', pro: 'Lecture seule', studio: 'Complet' } },
  { label: 'Branding', values: { free: '—', pro: 'Sans watermark', studio: 'White-label' } },
];

export default function Pricing() {
  const { user, profile, refreshProfile, setSubscriptionTier } = useAuth();
  const aiConfig = useAiConfig();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loadingTier, setLoadingTier] = useState<Tier | null>(null);

  const upgraded = searchParams.get('upgrade') === 'success';
  const currentTier: Tier = profile?.subscriptionTier || 'free';

  React.useEffect(() => {
    if (upgraded) {
      toast.success('Paiement confirmé — votre plan a été mis à jour.');
      void refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upgraded]);

  /** Change de plan : Stripe si la facturation est active, sinon activation locale. */
  const handleChoosePlan = async (tier: Tier) => {
    if (tier === 'free') {
      navigate('/signup');
      return;
    }
    if (!user) {
      navigate('/login?redirect=/pricing');
      return;
    }
    if (tier === currentTier) return;

    setLoadingTier(tier);
    try {
      if (aiConfig.billingEnabled) {
        const { url } = await postJson<{ url: string | null }>('/api/create-checkout-session', { body: { tier } });
        if (url) window.location.href = url;
        return;
      }

      const { checkout } = await setSubscriptionTier(tier);
      if (checkout) {
        const { url } = await postJson<{ url: string | null }>('/api/create-checkout-session', { body: { tier } });
        if (url) window.location.href = url;
        return;
      }

      toast.success(`Plan ${tier === 'pro' ? 'Pro' : 'Studio'} activé — dossiers illimités.`);
      await refreshProfile();
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setLoadingTier(null);
    }
  };

  const handleCancelPlan = async () => {
    setLoadingTier('free');
    try {
      await setSubscriptionTier('free');
      toast.success('Vous êtes de retour sur le plan gratuit.');
      await refreshProfile();
    } catch (err) {
      toast.error(messageFor(err));
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/" className="text-zinc-400 hover:text-zinc-100 transition-colors">Accueil</Link>
            {user ? (
              <Link to="/app" className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
                Tableau de bord
              </Link>
            ) : (
              <Link to="/signup" className="bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
                Essayer gratuitement
              </Link>
            )}
          </div>
        </div>
      </header>

      {upgraded && (
        <div className="max-w-6xl mx-auto px-4 pt-6">
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-2xl px-5 py-4 text-sm">
            <Sparkles className="w-4 h-4" /> Paiement confirmé. Votre plan est maintenant actif.
          </div>
        </div>
      )}

      <section className="max-w-6xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-4xl font-black tracking-tight">Choisissez votre plan</h1>
        <p className="text-zinc-400 max-w-2xl mx-auto">
          Facturation mensuelle en <strong className="text-zinc-200">Franc CFA (FCFA)</strong>, annulable à tout moment.
          Tous les plans incluent la génération IA complète du dossier de production.
        </p>
        {user && (
          <p className="text-sm text-zinc-500">
            Plan actuel : <span className="text-indigo-300 font-semibold uppercase">{currentTier}</span>
          </p>
        )}
        {!aiConfig.billingEnabled && (
          <p className="text-xs text-amber-300/80">
            Paiement Stripe non configuré : l'activation du plan se fait en un clic (mode démo) et reste locale à cet appareil.
          </p>
        )}
      </section>

      <section className="max-w-6xl mx-auto px-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(plan => {
            const isCurrent = user && plan.tier === currentTier;
            return (
              <motion.div
                key={plan.tier}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className={`relative flex flex-col rounded-3xl p-8 border ${
                  plan.highlight
                    ? 'bg-gradient-to-b from-indigo-500/15 to-zinc-900/60 border-indigo-500/30'
                    : 'bg-zinc-900/50 border-zinc-800'
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-indigo-500 text-white px-3 py-1 rounded-full">
                    Le plus populaire
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-zinc-200">{plan.name}</h2>
                  {isCurrent && (
                    <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-full">
                      <BadgeCheck className="w-3 h-3" /> Actif
                    </span>
                  )}
                </div>
                <p className="mt-5 text-4xl font-black">
                  {plan.price === null ? '—' : plan.price === 0 ? 'Gratuit' : formatCfa(plan.price)}
                  {plan.price !== null && plan.price > 0 && (
                    <span className="text-base font-normal text-zinc-500"> {plan.cadence}</span>
                  )}
                </p>
                <p className="mt-3 text-sm text-zinc-400">{plan.tagline}</p>
                <ul className="mt-6 space-y-3 text-sm text-zinc-300 flex-1">
                  {plan.features.map(feature => (
                    <li key={feature} className="flex gap-2.5">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={Boolean(isCurrent) || loadingTier === plan.tier}
                  onClick={() => handleChoosePlan(plan.tier)}
                  className={`mt-8 w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-all disabled:opacity-60 ${
                    plan.highlight
                      ? 'bg-white hover:bg-zinc-100 text-zinc-950'
                      : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-100'
                  }`}
                >
                  {loadingTier === plan.tier ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Plan actuel'
                  ) : plan.tier === 'free' ? (
                    plan.cta
                  ) : (
                    <><Crown className="w-4 h-4" /> {plan.cta}</>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        {user && currentTier !== 'free' && (
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={handleCancelPlan}
              disabled={loadingTier === 'free'}
              className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              {loadingTier === 'free' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
              Revenir au plan gratuit
            </button>
          </div>
        )}
      </section>

      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Comparaison détaillée</h2>
        <div className="overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="bg-zinc-900/80 text-zinc-400">
                <th className="py-4 px-5 font-medium">Fonctionnalité</th>
                <th className="py-4 px-5 font-medium">Gratuit</th>
                <th className="py-4 px-5 font-medium text-indigo-300">Pro</th>
                <th className="py-4 px-5 font-medium text-amber-300">Studio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {COMPARISON.map(row => (
                <tr key={row.label} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="py-3.5 px-5 text-zinc-300">{row.label}</td>
                  <td className="py-3.5 px-5 text-zinc-500">{row.values.free}</td>
                  <td className="py-3.5 px-5 text-zinc-300">{row.values.pro}</td>
                  <td className="py-3.5 px-5 text-zinc-300">{row.values.studio}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-center text-xs text-zinc-600 mt-6 flex items-center justify-center gap-2">
          <X className="w-3.5 h-3.5" /> Sans engagement — résiliable en un clic depuis le tableau de bord.
        </p>
      </section>
    </div>
  );
}
