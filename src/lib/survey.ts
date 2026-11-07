/**
 * Market-validation questionnaire for LensCraft AI.
 *
 * Design constraints: answerable in under a minute (10 questions, mostly single
 * taps), no login, no email required. Shared by the survey page (src/pages/Survey.tsx),
 * the results dashboard (src/pages/SurveyResults.tsx) and the server (server/survey.ts).
 */

export type QuestionKind = 'single' | 'multi' | 'text';

export interface Question {
  id: string;
  kind: QuestionKind;
  /** French label shown to the respondent. */
  label: string;
  /** Shown under the label, when the choice needs context. */
  hint?: string;
  options?: string[];
  optional?: boolean;
  /** Maps each option to a comparable value (used for aggregation). */
  values?: Record<string, number>;
}

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: 'role',
    kind: 'single',
    label: 'Vous êtes…',
    options: [
      'Artiste indépendant',
      'Producteur / beatmaker',
      'Réalisateur ou chef opérateur',
      'Équipe de production / label',
      'Étudiant en cinéma ou musique',
      'Autre',
    ],
  },
  {
    id: 'clips_per_year',
    kind: 'single',
    label: 'Combien de clips Produisez-vous par an ?',
    options: ['Aucun pour le moment', '1 à 2', '3 à 5', '6 à 10', 'Plus de 10'],
    values: { 'Aucun pour le moment': 0, '1 à 2': 1.5, '3 à 5': 4, '6 à 10': 8, 'Plus de 10': 12 },
  },
  {
    id: 'current_method',
    kind: 'single',
    label: 'Aujourd’hui, comment préparez-vous un dossier de production ?',
    hint: 'Scénario, liste de plans, planning de tournage…',
    options: [
      'Je ne le fais pas',
      'Tout seul(e), à la main',
      'Je paie un freelance ou consultant',
      'J’utilise un modèle (Word, Notion…)',
      'J’utilise déjà un outil IA',
    ],
  },
  {
    id: 'biggest_blocker',
    kind: 'single',
    label: 'Quel est LE plus gros blocage quand vous préparez un clip ?',
    options: [
      'Le scénario',
      'La liste de plans',
      'Le planning de tournage',
      'Le budget et l’organisation',
      'La stratégie promo après la sortie',
      'Aucun, tout va bien',
    ],
  },
  {
    id: 'time_spent',
    kind: 'single',
    label: 'Combien de temps passe la pré-production d’un clip ?',
    options: ['Moins d’une journée', '1 à 3 jours', 'Une semaine', 'Plus d’une semaine'],
    values: {
      'Moins d’une journée': 0.5,
      '1 à 3 jours': 2,
      'Une semaine': 7,
      'Plus d’une semaine': 14,
    },
  },
  {
    id: 'paid_before',
    kind: 'single',
    label: 'Qu’avez-vous déjà payé pour faire produire un traitement ou un dossier ?',
    hint: 'Ce que le marché accepte de payer aujourd’hui.',
    options: [
      'Rien, 0 FCFA',
      'Moins de 25 000 FCFA',
      '25 000 à 100 000 FCFA',
      '100 000 à 300 000 FCFA',
      'Plus de 300 000 FCFA',
    ],
    values: {
      'Rien, 0 FCFA': 0,
      'Moins de 25 000 FCFA': 12500,
      '25 000 à 100 000 FCFA': 62500,
      '100 000 à 300 000 FCFA': 200000,
      'Plus de 300 000 FCFA': 350000,
    },
  },
  {
    id: 'willing_to_pay',
    kind: 'single',
    label: 'Que paieriez-vous par mois pour un outil qui génère le dossier complet depuis votre musique ?',
    hint: 'Script, liste de plans, planning et stratégie promo, exportables.',
    options: ['0 FCFA', '2 000 FCFA', '5 000 FCFA', '10 000 FCFA', '15 000 FCFA ou plus'],
    values: {
      '0 FCFA': 0,
      '2 000 FCFA': 2000,
      '5 000 FCFA': 5000,
      '10 000 FCFA': 10000,
      '15 000 FCFA ou plus': 17500,
    },
  },
  {
    id: 'top_feature',
    kind: 'single',
    label: 'Quelle fonctionnalité compte le plus pour vous ?',
    options: [
      'Analyse de l’audio',
      'Script détaillé',
      'Découpage technique',
      'Planning de tournage',
      'Stratégie promo (TikTok, Reels, Shorts)',
      'Export DOCX / PDF',
    ],
  },
  {
    id: 'platforms',
    kind: 'multi',
    label: 'Où publiez-vous vos contenus pour promouvoir votre musique ?',
    hint: 'Plusieurs réponses possibles.',
    options: ['TikTok', 'Instagram Reels', 'YouTube Shorts', 'Facebook', 'WhatsApp', 'Snapchat', 'Aucun'],
  },
  {
    id: 'trial_interest',
    kind: 'single',
    label: 'Voulez-vous tester l’outil gratuitement et donner votre avis ?',
    options: ['Oui, envoyez-moi l’accès', 'Peut-être plus tard', 'Non merci'],
  },
  {
    id: 'email',
    kind: 'text',
    label: 'Votre email (optionnel)',
    hint: 'Uniquement pour vous envettre l’accès de test. Jamais revendu, jamais partagé.',
    optional: true,
  },
];

export type SurveyAnswers = Record<string, string | string[]>;

export interface SurveyResponse {
  /** Server timestamp (ms). */
  at: number;
  /** Distribution channel captured from ?src=, e.g. "whatsapp", "instagram". */
  source: string;
  answers: SurveyAnswers;
  /** Rough device info, for segmentation only. */
  device?: string;
}

export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  twitter: 'Twitter / X',
  email: 'Email',
  direct: 'Lien direct',
};

/** Builds a CSV (Excel-friendly, BOM for French accents). */
export function surveyToCsv(responses: SurveyResponse[]): string {
  const headers = ['date', 'source', ...SURVEY_QUESTIONS.map(q => q.id)];
  const rows = responses.map(response => {
    const cells = [
      new Date(response.at).toISOString(),
      response.source || 'direct',
      ...SURVEY_QUESTIONS.map(q => {
        const value = response.answers[q.id];
        if (Array.isArray(value)) return value.join(' | ');
        return value ?? '';
      }),
    ];
    return cells.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
  });
  return `\uFEFF${[headers.join(','), ...rows].join('\r\n')}`;
}

/** Aggregates responses into per-question counts for the results dashboard. */
export function aggregateSurvey(responses: SurveyResponse[]): Record<string, {
  label: string;
  total: number;
  counts: { option: string; count: number; share: number }[];
  average?: number;
}> {
  const out: ReturnType<typeof aggregateSurvey> = {};

  for (const question of SURVEY_QUESTIONS) {
    if (question.kind === 'text' || !question.options) continue;

    const counts = question.options.map(option => {
      const count = responses.filter(response => {
        const value = response.answers[question.id];
        return Array.isArray(value) ? value.includes(option) : value === option;
      }).length;
      const answered = responses.filter(response => response.answers[question.id] !== undefined).length;
      return { option, count, share: answered > 0 ? count / answered : 0 };
    });

    let average: number | undefined;
    if (question.values) {
      const numeric = responses
        .map(response => question.values?.[String(response.answers[question.id])])
        .filter((value): value is number => typeof value === 'number');
      if (numeric.length > 0) {
        average = numeric.reduce((sum, value) => sum + value, 0) / numeric.length;
      }
    }

    out[question.id] = { label: question.label, total: responses.length, counts, average };
  }

  return out;
}

/** Demand score (0-100) combining willingness to pay and trial interest. */
export function demandScore(responses: SurveyResponse[]): number {
  if (responses.length === 0) return 0;
  const wtp = aggregateSurvey(responses).willing_to_pay;
  const payAvg = wtp?.average ?? 0;
  const trialYes = responses.filter(r => r.answers.trial_interest === 'Oui, envoyez-moi l’accès').length;
  const trialShare = trialYes / responses.length;
  return Math.round(Math.min(100, (payAvg / 15000) * 60 + trialShare * 40));
}
