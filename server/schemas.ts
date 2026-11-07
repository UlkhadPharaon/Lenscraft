/**
 * Single source of truth for the AI response schemas, expressed as standard
 * JSON Schema so both providers can consume them:
 *
 *   - Gemini       -> converted to `Type`-based responseSchema (toGeminiSchema)
 *   - OpenRouter   -> passed straight into response_format.json_schema
 *
 * Keeping one definition avoids the two providers drifting apart.
 */

export const TREATMENT_SCHEMA = {
  type: 'object',
  properties: {
    analysis: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Un titre proposé pour le clip vidéo' },
        description: { type: 'string' },
        theme: { type: 'string' },
        rhythm: { type: 'string' },
        vibe: { type: 'string' },
      },
      required: ['title', 'description', 'theme', 'rhythm', 'vibe'],
    },
    script: { type: 'string', description: "Un script complet sous forme de texte de l'histoire/scenario du clip" },
    scenes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sceneNumber: { type: 'integer' },
          action: { type: 'string' },
          set: { type: 'string' },
          actors: { type: 'string' },
          actionDescription: { type: 'string' },
        },
        required: ['sceneNumber', 'action', 'set', 'actors', 'actionDescription'],
      },
    },
    shotList: {
      type: 'array',
      description: 'Le découpage technique détaillé (Shot list). Feature majeure.',
      items: {
        type: 'object',
        properties: {
          sceneNumber: { type: 'integer' },
          shotNumber: { type: 'integer' },
          type: { type: 'string' },
          cameraMovement: { type: 'string' },
          lens: { type: 'string' },
          duration: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['sceneNumber', 'shotNumber', 'type', 'cameraMovement', 'lens', 'duration', 'description'],
      },
    },
    schedule: {
      type: 'array',
      description: 'Le planning de tournage complet et optimisé. Feature majeure.',
      items: {
        type: 'object',
        properties: {
          day: { type: 'integer' },
          location: { type: 'string' },
          estimatedTime: { type: 'string' },
          scenesToShoot: { type: 'array', items: { type: 'integer' } },
          castNeeded: { type: 'array', items: { type: 'string' } },
          equipmentNeeded: { type: 'array', items: { type: 'string' } },
        },
        required: ['day', 'location', 'estimatedTime', 'scenesToShoot', 'castNeeded', 'equipmentNeeded'],
      },
    },
    production: {
      type: 'object',
      description: 'Le planning préparatif complet et gestion globale du tournage (repérages, jours requis, etc.)',
      properties: {
        prepDays: { type: 'integer' },
        shootDays: { type: 'integer' },
        postProdDays: { type: 'integer' },
        locationScouting: { type: 'string', description: 'Détails sur les repérages de décors' },
        rehearsals: { type: 'string', description: 'Détails sur les répétitions, notamment avec les danseurs' },
        otherPrep: { type: 'string', description: 'Autres éléments nécessaires et indispensables à la préparation' },
      },
      required: ['prepDays', 'shootDays', 'postProdDays', 'locationScouting', 'rehearsals', 'otherPrep'],
    },
  },
  required: ['analysis', 'script', 'scenes', 'shotList', 'schedule', 'production'],
};

export const PROMO_SCHEMA = {
  type: 'object',
  properties: {
    targetAudience: { type: 'string', description: 'Description détaillée de l\'audience cible pour ces vidéos courtes.' },
    numberOfVideos: { type: 'integer', description: 'Nombre de vidéos recommandées pour la campagne.' },
    trendsAndIdeas: { type: 'string', description: 'Explication des tendances actuelles (trends) à utiliser et idées générales.' },
    promoIdeas: {
      type: 'array',
      description: 'Liste détaillée des concepts de vidéos (Shorts/Reels/TikTok).',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Titre accrocheur de la vidéo courte.' },
          concept: { type: 'string', description: 'Idée et concept de base.' },
          script: { type: 'string', description: 'Script complet ou description étape par étape de la vidéo.' },
          visualStyle: { type: 'string', description: 'Décors, style de tournage, effets au montage.' },
          viralScore: { type: 'integer', description: 'Score de viralité estimé (1 à 10).' },
          efficiencyScore: { type: 'integer', description: 'Score d\'efficacité promotionnelle estimé (1 à 10).' },
          explanation: { type: 'string', description: 'Explication de ces scores et pourquoi cette vidéo va fonctionner.' },
        },
        required: ['title', 'concept', 'script', 'visualStyle', 'viralScore', 'efficiencyScore', 'explanation'],
      },
    },
  },
  required: ['targetAudience', 'numberOfVideos', 'trendsAndIdeas', 'promoIdeas'],
};

export const ASSISTANT_SCHEMA = {
  type: 'object',
  properties: {
    assistantMessage: { type: 'string', description: 'La réponse ou l\'explication de l\'assistant IA.' },
    treatment: TREATMENT_SCHEMA,
  },
  required: ['assistantMessage', 'treatment'],
};

/**
 * Converts a standard JSON Schema into the @google/genai `Type`-based shape.
 * Only the keywords used by the schemas above are handled.
 */
export function toGeminiSchema(schema: any, Type: any): any {
  const typeMap: Record<string, any> = {
    object: Type.OBJECT,
    string: Type.STRING,
    integer: Type.INTEGER,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
    array: Type.ARRAY,
  };

  const out: any = {};
  const type = typeMap[schema.type];
  if (type !== undefined) out.type = type;
  if (schema.description) out.description = schema.description;

  if (schema.properties) {
    out.properties = {};
    for (const [key, value] of Object.entries<any>(schema.properties)) {
      out.properties[key] = toGeminiSchema(value, Type);
    }
  }
  if (schema.items) out.items = toGeminiSchema(schema.items, Type);
  if (Array.isArray(schema.required)) out.required = [...schema.required];

  return out;
}
