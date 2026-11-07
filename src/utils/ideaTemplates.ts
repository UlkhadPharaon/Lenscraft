/**
 * Curated short-form concepts (TikTok / Reels / Shorts).
 *
 * These are inserted locally — no API key required — so the promo section is
 * useful even before an AI provider is configured. Each entry is a complete,
 * editable PromoIdea.
 */
import type { PromoIdea } from '../types';

export interface IdeaTemplate {
  id: string;
  label: string;
  tagline: string;
  idea: PromoIdea;
}

export const IDEA_TEMPLATES: IdeaTemplate[] = [
  {
    id: 'hook-3s',
    label: 'Hook 3 secondes',
    tagline: 'Ouvrir sur l\'image la plus forte du clip pour retenir le scroll.',
    idea: {
      title: 'Le hook 3 secondes',
      concept: 'Commencer la vidéo sur le plan le plus marquant du clip (regard, silhouette, explosion de lumière), puis couper sur le refrain.',
      script: '0-3s : plan choc en gros plan, son satire/coupe nette.\n3-8s : titre du morceau incrusté en gros, animation rapide.\n8-20s : 2 plans du clip qui plaisent.\n20-30s : écran final « Écoute maintenant » + lien.',
      visualStyle: 'Grain léger, contraste élevé, typo bold capitale, coupe toutes les 1-2 secondes.',
      viralScore: 8,
      efficiencyScore: 8,
      explanation: 'Le hook frontal capte l\'attention avant le swipe ; le rythme de coupe rapide augmente le temps de visionnage.',
    },
  },
  {
    id: 'lyric-karaoke',
    label: 'Paroles en karaoké',
    tagline: 'Paroles qui s\'animent ligne par ligne, format le plus partageable.',
    idea: {
      title: 'Paroles animées ligne par ligne',
      concept: 'Fond noir ou extrait du clip flouté, paroles qui s\'affichent en rythme avec la voix, mot-clé surligné.',
      script: '0-2s : première ligne déjà affichée.\n2-15s : couplet, animation lettre par lettre sur le mot fort.\n15-25s : refrain en plein écran, couleurs de la cover.\n25-30s : appel à l\'action « Commente ta ligne préférée ».',
      visualStyle: 'Typo sans-serif épaisse, surlignage couleur accent, léger glow, alignement centré.',
      viralScore: 9,
      efficiencyScore: 8,
      explanation: 'Format natif des plateformes, lisible sans son, et l\'invitation au commentaire fait grimper l\'engagement.',
    },
  },
  {
    id: 'behind-scenes',
    label: 'Coulisses du tournage',
    tagline: 'Montrer la fabrication du clip crée le lien avec la communauté.',
    idea: {
      title: 'Comment on a tourné ce plan',
      concept: 'Alternance rush brut et image finale : le public voit la technique derrière un plan fort du clip.',
      script: '0-3s : « Tu veux voir comment on a fait ce plan ? » face caméra.\n3-12s : rush du tournage (répétition, erreurs, fous rires).\n12-22s : image finale propre, comparaison avant/après.\n22-30s : « Dis-moi si tu veux la suite des coulisses ».',
      visualStyle: 'Camera phone verticale, lumière naturelle, sous-titres manuscrits, aucune retouche.',
      viralScore: 7,
      efficiencyScore: 9,
      explanation: 'Le contenu authentique performe mieux que le contenu produit ; il humanise l\'artiste et prépare la sortie du clip.',
    },
  },
  {
    id: 'transition',
    label: 'Transition sur le beat',
    tagline: 'Effet de transition synchronisé sur un temps fort du morceau.',
    idea: {
      title: 'Transition sur le drop',
      concept: 'Un geste quotidien (fermer une porte, passer la main, sauter) déclenche un changement de décor et de tenue sur le beat.',
      script: '0-5s : plan fixe, geste de départ, silence.\n5s : impact sonore du morceau, cut sec.\n5-20s : nouveau décor, nouvelle énergie, danse ou travelling.\n20-30s : titre + date de sortie.',
      visualStyle: 'Deux décors contrastés, mouvement de caméra rapide (whip pan), coupe unique sur le temps fort.',
      viralScore: 9,
      efficiencyScore: 7,
      explanation: 'Les transitions sur le beat sont le format le plus repris (duo/stitch), ce qui démultiplie la portée.',
    },
  },
  {
    id: 'dance-challenge',
    label: 'Défi danse',
    tagline: 'Une gestuelle simple, reproductible, sur 8 temps du refrain.',
    idea: {
      title: 'Le défi des 8 temps',
      concept: 'Une chorégraphie très courte et simple que n\'importe qui peut refaire, montrée en boucle sur le refrain.',
      script: '0-4s : l\'artiste face caméra « Reproduis ça avec moi ».\n4-18s : démonstration en boucle, ralenti sur les 8 temps.\n18-26s : 2 versions (seul / à deux) côte à côte.\n26-30s : hashtag du défi + lien vers le son.',
      visualStyle: 'Plan fixe large, lumière uniforme, tenue reconnaissable, cadre dégagé pour la reprise.',
      viralScore: 8,
      efficiencyScore: 9,
      explanation: 'Le son devient le vecteur : plus il y a de reprises, plus le morceau est exposé. C\'est le format le plus efficace pour la viralité musicale.',
    },
  },
  {
    id: 'storytelling',
    label: 'Mini-histoire',
    tagline: 'Un récit de 30 secondes avec chute, très forte mémorisation.',
    idea: {
      title: 'L\'histoire en 30 secondes',
      concept: 'Adapter le thème du morceau en saynète complète : situation, tension, chute inattendue.',
      script: '0-4s : situation normale en plan large.\n4-14s : tension monte, plans de plus en plus serrés.\n14-24s : chute / révélation, coupe brutale.\n24-30s : écran noir, titre du morceau, dernier accord.',
      visualStyle: 'Focale de plus en plus courte, lumière qui se dégrade, sound design du morceau en guide.',
      viralScore: 8,
      efficiencyScore: 8,
      explanation: 'Le public reste jusqu\'à la chute ; le récit marque plus qu\'un simple extrait et incite au partage.',
    },
  },
  {
    id: 'text-on-screen',
    label: 'Texte seul + son',
    tagline: 'Aucune image nécessaire : le texte porte tout,idéal sans tournage.',
    idea: {
      title: 'L\'avis qui divise',
      concept: 'Une phrase forte liée au morceau s\'affiche seule à l\'écran, coupée en trois temps, sur un fond animé minimal.',
      script: '0-3s : phrase choc (« Tout le monde dit que… »).\n3-12s : retournement (« …mais personne n\'a écouté la 2e moitié »).\n12-22s : extrait du morceau en fond, texte qui pulse.\n22-30s : « Toi t\'en penses quoi ? » + commentaire épinglé.',
      visualStyle: 'Fond uni ou dégradé animé, typographie unique et grande, animations de frappe.',
      viralScore: 7,
      efficiencyScore: 8,
      explanation: 'Coût de production nul, lecture possible sans son, et le débat génère des commentaires.',
    },
  },
  {
    id: 'duet-stitch',
    label: 'Format duo / réaction',
    tagline: 'Conçu pour être réutilisé par d\'autres comptes.',
    idea: {
      title: 'Réaction au prime écoute',
      concept: 'Une personne (fan, influenceur, proche) écoute le morceau pour la première fois, caméra sur son visage, son en fond.',
      script: '0-3s : « Première écoute, zéro contexte ».\n3-18s : visage qui réagit, extrait du morceau en audio.\n18-26s : verdict en une phrase.\n26-30s : invitation à refaire le même format avec le son.',
      visualStyle: 'Caméra frontale, cadrage serré visage, qualité brute volontaire.',
      viralScore: 8,
      efficiencyScore: 9,
      explanation: 'Le format réaction est massivement repris en duo ; chaque reprise ramène de nouveaux auditeurs vers le son.',
    },
  },
  {
    id: 'lore-series',
    label: 'Série en 3 épisodes',
    tagline: 'Découper la promo en épisodes pour créer l\'attente.',
    idea: {
      title: 'Épisode 1 : la genèse',
      concept: 'Trois vidéos racontent la naissance du morceau : l\'idée, l\'enregistrement, le clip. Chaque épisode se termine sur un cliffhanger.',
      script: 'Ép.1 (20s) : note vocale d\'origine + images du studio.\nÉp.2 (25s) : session d\'écriture, phrase qui devient le refrain.\nÉp.3 (30s) : extrait du clip final + date de sortie.\nChaque épisode : « La suite demain » en dernier plan.',
      visualStyle: 'Codes récurrents (même typo, même couleur, même accroche sonore) pour créer la reconnaissance.',
      viralScore: 7,
      efficiencyScore: 9,
      explanation: 'La sérialisation transforme les spectateurs en abonnés en attente, et chaque épisode relance la portée du précédent.',
    },
  },
  {
    id: 'vertical-clip-cut',
    label: 'Recadrage du clip',
    tagline: 'Rien à tourner : re-découper le clip existant en 9:16.',
    idea: {
      title: 'Le clip en format vertical',
      concept: 'Reprendre trois séquences fortes du clip, recadrées 9:16, rythmées par les temps du morceau.',
      script: '0-4s : séquence d\'ouverture du clip, recadrage serré.\n4-18s : deux autres séquences, coupes sur le beat.\n18-26s : plan final du clip en plein écran.\n26-30s : « Clip complet sur YouTube » + flèche vers le lien.',
      visualStyle: 'Recadrage 9:16 propre (sujet centré), sous-titres ajoutés, aucune image inédite requise.',
      viralScore: 6,
      efficiencyScore: 7,
      explanation: 'Production quasi nulle et réutilisation d\'assets existants ; efficace pour diriger le trafic vers le clip complet.',
    },
  },
];

/** Platform and style options offered in the promo preferences form. */
export const PLATFORM_OPTIONS = ['TikTok', 'Instagram Reels', 'YouTube Shorts'] as const;
export const STYLE_OPTIONS = [
  'Humour',
  'Émotion / lore',
  'Coulisses',
  'Défi danse',
  'Paroles / karaoké',
  'Transition / motion',
  'Duo / réaction',
  'Storytelling',
] as const;
export const DURATION_OPTIONS = ['15s', '30s', '60s'] as const;
export const BUDGET_OPTIONS = ['Sans budget', 'Low-cost', 'Production'] as const;
export const GOAL_OPTIONS = ['Streams / écoutes', 'Nouveaux abonnés', 'Ventes / merch', 'Buzz & notoriété'] as const;
