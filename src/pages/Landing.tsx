import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  Clapperboard, Sparkles, UploadCloud, Download, FileText, ListVideo,
  CalendarDays, Share2, Check, ChevronRight, ArrowRight, Star,
} from 'lucide-react';
import { useAuth } from '../components/auth/AuthProvider';
import GitHubLoginButton from '../components/auth/GitHubLoginButton';
import toast from 'react-hot-toast';

const STEPS = [
  { icon: UploadCloud, title: 'Uploadez votre musique', text: 'Un fichier audio (MP3, WAV), un lien YouTube, vos paroles ou simplement votre concept.' },
  { icon: Sparkles, title: "L'IA rédige le dossier", text: 'Analyse, scénario, tableau des scènes, découpage technique, planning de tournage et stratégie promo.' },
  { icon: Download, title: 'Exportez et tournez', text: 'Tout est modifiable puis exportable en DOCX ou PDF, prêt à être présenté à votre équipe.' },
];

const FEATURE_STYLES: Record<string, { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-400' },
};

const FEATURES = [
  { icon: FileText, color: 'amber', title: 'Script détaillé', text: "Scénario professionnel complet avec indications de mise en scène, plans et actions." },
  { icon: ListVideo, color: 'rose', title: 'Découpage technique', text: 'Liste de plans caméra : type, mouvement, objectif, durée et description.' },
  { icon: CalendarDays, color: 'amber', title: 'Planning optimisé', text: 'Jours de tournage organisés par lieu, casting et équipement nécessaire.' },
  { icon: Share2, color: 'pink', title: 'Stratégie promo', text: 'Concepts viraux pour TikTok, Reels et Shorts avec scores de viralité.' },
];

const USE_CASES = [
  { title: 'Artistes indépendants', text: 'Pitchez votre clip auprès des labels, sponsors et équipes de production.' },
  { title: 'Réalisateurs & DOP', text: 'Préparez des dossiers clients complets en quelques minutes.' },
  { title: 'Écoles de cinéma', text: 'Enseignez la pré-production avec des documents structurés.' },
];

const FAQ = [
  { q: 'Est-ce que je garde les droits sur le contenu généré ?', a: 'Oui. Les documents générés vous appartiennent : modifiez-les, exportez-les et utilisez-les librement pour vos projets.' },
  { q: 'Puis-je modifier le texte après génération ?', a: 'Chaque section est éditable directement dans l\'application, et l\'assistant IA peut appliquer vos demandes de modification.' },
  { q: "Quels formats d'export sont disponibles ?", a: 'DOCX (.docx) et PDF. Le plan Studio ajoute en plus l\'export Markdown et le white-label.' },
];

export default function Landing() {
  const { user, mode, signInAsLocalGuest } = useAuth();
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleNotify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      toast.error('Entrez une adresse email valide.');
      return;
    }
    setNotified(true);
    toast.success('Merci ! Nous vous préviendrons du lancement.');
  };

  const handleLocalCta = async () => {
    try {
      await signInAsLocalGuest();
      toast.success('Session démo lancée.');
    } catch (err: any) {
      toast.error(err?.message || 'Connexion impossible.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      {/* ------------------------------------------------------------- header */}
      <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <Clapperboard className="w-5 h-5 text-indigo-400" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              LensCraft <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">AI</span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#fonctionnalites" className="hover:text-zinc-100 transition-colors">Fonctionnalités</a>
            <a href="#tarifs" className="hover:text-zinc-100 transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-zinc-100 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/app" className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
                Tableau de bord <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm text-zinc-400 hover:text-zinc-100 transition-colors">Se connecter</Link>
                <Link to="/signup" className="flex items-center gap-2 text-sm bg-zinc-100 hover:bg-white text-zinc-950 font-medium px-4 py-2 rounded-lg transition-colors">
                  Essayer gratuitement
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* --------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-indigo-600/10 blur-3xl rounded-full" />
        <div className="relative max-w-5xl mx-auto px-4 pt-20 pb-24 text-center space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-full">
              <Sparkles className="w-3.5 h-3.5" /> Propulsé par Google Gemini
            </span>
            <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-[1.05]">
              Votre dossier de production
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-cyan-400 to-indigo-400">musical en 5 minutes</span>
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Générez scénarios, listes de plans, plannings de tournage et stratégies promo depuis votre musique —
              sans consultant, sans attendre des semaines.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                to="/signup"
                className="group flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3.5 px-7 rounded-xl transition-all shadow-lg shadow-white/5"
              >
                Essayer gratuitement
                <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/pricing"
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-100 font-medium py-3.5 px-7 rounded-xl transition-all"
              >
                Voir une démo des plans
              </Link>
            </div>
            <p className="text-xs text-zinc-600">1 dossier gratuit par mois — sans carte bancaire.</p>
          </motion.div>
        </div>
      </section>

      {/* -------------------------------------------------------- social proof */}
      <section className="border-y border-zinc-800/60 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm text-zinc-400 text-center md:text-left">
            Rejoignez les artistes et réalisateurs qui préparent leurs clips avec LensCraft AI.
          </p>
          {notified ? (
            <p className="flex items-center gap-2 text-sm text-emerald-400">
              <Check className="w-4 h-4" /> Vous êtes sur la liste.
            </p>
          ) : (
            <form onSubmit={handleNotify} className="flex items-center gap-2 w-full md:w-auto">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="votre@email.com"
                className="flex-1 md:w-64 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              />
              <button type="submit" className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl transition-colors">
                Me notifier
              </button>
            </form>
          )}
        </div>
      </section>

      {/* -------------------------------------------------------- how it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="text-center mb-14 space-y-3">
          <h2 className="text-3xl font-bold">Comment ça marche</h2>
          <p className="text-zinc-400">Trois étapes, aucune compétence technique requise.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="relative bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-8"
            >
              <span className="absolute top-6 right-7 text-5xl font-black text-zinc-800/60 select-none">{i + 1}</span>
              <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit mb-5">
                <step.icon className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{step.text}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ---------------------------------------------------------- features */}
      <section id="fonctionnalites" className="border-y border-zinc-800/60 bg-zinc-900/20">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <div className="text-center mb-14 space-y-3">
            <h2 className="text-3xl font-bold">Un dossier complet, section par section</h2>
            <p className="text-zinc-400">Tout ce qu'une équipe de production attend d'un traitement professionnel.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(feature => (
              <div key={feature.title} className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-6 hover:border-indigo-500/40 transition-colors">
                <div className={`p-3 rounded-2xl w-fit mb-5 ${FEATURE_STYLES[feature.color].bg}`}>
                  <feature.icon className={`w-6 h-6 ${FEATURE_STYLES[feature.color].text}`} />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">{feature.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --------------------------------------------------------- use cases */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-bold">Conçu pour les créateurs qui n'ont pas d'équipe de pré-production</h2>
            <p className="text-zinc-400 leading-relaxed">
              Un traitement de clip vidéo coûte traditionnellement entre 2 000 $ et 15 000 $ et prend plusieurs semaines.
              LensCraft AI produit un document équivalent en quelques minutes, pour une fraction du prix.
            </p>
            <div className="space-y-4">
              {USE_CASES.map(useCase => (
                <div key={useCase.title} className="flex gap-3">
                  <div className="mt-1 p-1 bg-emerald-500/10 rounded-full h-fit">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-100">{useCase.title}</p>
                    <p className="text-sm text-zinc-400">{useCase.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500" /> Aperçu du dossier généré
            </div>
            {[
              { label: '1. Analyse de l\'œuvre', color: 'text-indigo-300' },
              { label: '2. Script & scénario', color: 'text-amber-300' },
              { label: '3. Tableau des scènes', color: 'text-rose-300' },
              { label: '4. Découpage technique', color: 'text-purple-300' },
              { label: '5. Planning de tournage', color: 'text-amber-300' },
              { label: '6. Stratégie promo virale', color: 'text-pink-300' },
            ].map(line => (
              <div key={line.label} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 rounded-xl px-4 py-3">
                <span className={`text-sm font-medium ${line.color}`}>{line.label}</span>
                <Star className="w-3.5 h-3.5 text-zinc-700" />
              </div>
            ))}
            <p className="text-xs text-zinc-600 text-center pt-2">Chaque section est éditable puis exportable en DOCX ou PDF.</p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ pricing */}
      <section id="tarifs" className="border-y border-zinc-800/60 bg-zinc-900/20">
        <div className="max-w-5xl mx-auto px-4 py-20">
          <div className="text-center mb-12 space-y-3">
            <h2 className="text-3xl font-bold">Des tarifs pensés pour les créateurs</h2>
            <p className="text-zinc-400">Commencez gratuitement, passez au Pro quand vos projets s'enchaînent.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 flex flex-col">
              <h3 className="text-lg font-semibold text-zinc-300">Gratuit</h3>
              <p className="mt-4 text-4xl font-black">0 $<span className="text-base font-normal text-zinc-500">/mois</span></p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-400 flex-1">
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> 1 dossier de production / mois</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Modèle Flash</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Export DOCX & PDF</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Édition complète</li>
              </ul>
              <Link to="/signup" className="mt-8 text-center bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-medium py-3 rounded-xl transition-colors">
                Commencer gratuitement
              </Link>
            </div>

            <div className="relative bg-gradient-to-b from-indigo-500/15 to-zinc-900/50 border border-indigo-500/30 rounded-3xl p-8 flex flex-col">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-indigo-500 text-white px-3 py-1 rounded-full">Le plus populaire</span>
              <h3 className="text-lg font-semibold text-indigo-300">Pro</h3>
              <p className="mt-4 text-4xl font-black">
                5 000 FCFA<span className="text-base font-normal text-zinc-500"> / mois</span>
              </p>
              <ul className="mt-6 space-y-3 text-sm text-zinc-300 flex-1">
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Dossiers illimités</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Modèles Flash + Pro</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Historique 30 jours</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Promo : 3 campagnes / mois</li>
                <li className="flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0" /> Export sans watermark</li>
              </ul>
              <Link to="/pricing" className="mt-8 text-center bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3 rounded-xl transition-colors">
                Voir tous les plans
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- faq */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Questions fréquentes</h2>
        <div className="space-y-4">
          {FAQ.map((item, i) => (
            <details key={i} className="group bg-zinc-900/50 border border-zinc-800 rounded-2xl px-6 py-4 open:border-indigo-500/40 transition-colors">
              <summary className="flex items-center justify-between cursor-pointer list-none font-medium text-zinc-100">
                {item.q}
                <ChevronRight className="w-4 h-4 text-zinc-500 group-open:rotate-90 transition-transform" />
              </summary>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ----------------------------------------------------------- final CTA */}
      <section className="border-t border-zinc-800/60 bg-gradient-to-b from-indigo-500/10 to-transparent">
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-bold">Toujours aussi simple. Commencez maintenant.</h2>
          <p className="text-zinc-400">Votre premier dossier de production est offert.</p>
          {user ? (
            <Link to="/app/new" className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3.5 px-8 rounded-xl transition-all">
              Créer un projet <ArrowRight className="w-4 h-4" />
            </Link>
          ) : mode === 'local' ? (
            <button
              onClick={handleLocalCta}
              className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3.5 px-8 rounded-xl transition-all"
            >
              Essayer la démo locale <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/signup" className="inline-flex items-center gap-2 bg-white hover:bg-zinc-100 text-zinc-950 font-semibold py-3.5 px-8 rounded-xl transition-all">
                Créer mon premier projet <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="w-full sm:w-64">
                <GitHubLoginButton label="GitHub" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- footer */}
      <footer className="border-t border-zinc-800/60">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-3">
            <Clapperboard className="w-4 h-4 text-indigo-400" />
            <span>© 2026 LensCraft AI by Ulkhad Empire</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link to="/pricing" className="hover:text-zinc-300 transition-colors">Tarifs</Link>
            <a href="#fonctionnalites" className="hover:text-zinc-300 transition-colors">Fonctionnalités</a>
            <a href="#faq" className="hover:text-zinc-300 transition-colors">FAQ</a>
            <Link to="/login" className="hover:text-zinc-300 transition-colors">Connexion</Link>
          </nav>
          <div className="flex items-center gap-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors" aria-label="Instagram">Instagram</a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors" aria-label="YouTube">YouTube</a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" className="hover:text-zinc-300 transition-colors" aria-label="TikTok">TikTok</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
