import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for text and potentially audio processing in the future
  app.use(express.json({ limit: "50mb" }));

  // API Route for generating video treatment
  app.post("/api/generate", async (req, res) => {
    try {
      const { description, lyrics, audioBase64, audioMimeType, youtubeUrl, language, model } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const promptText = `Tu es un réalisateur de clips vidéo visionnaire et un artiste visuel.
Analyse le concept de la chanson, la structure lyrique, le fichier audio ou le lien YouTube fourni pour générer un dossier de production complet pour un clip vidéo. 
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.
Le "script" doit être EXTRÊMEMENT détaillé, complet, avec des indications de mise en scène poussées, des descriptions de plans, des actions détaillées et des dialogues (si applicable). Ne sois pas bref ! C'est le script complet du clip vidéo de A à Z.

Langue ou Contexte Culturel de la chanson:
${language ? language : 'Non spécifié (Détecter automatiquement si possible).'}

Song/Concept Description:
${description ? description : 'Non renseigné.'}

YouTube Link (Reference):
${youtubeUrl ? youtubeUrl : 'Non renseigné. (Note: tu ne peux pas cliquer sur ce lien, essaie de deviner la chanson si le titre est dans l\'URL)'}

Lyrics or Musical Notes:
${lyrics ? lyrics : 'Non renseigné.'}`;

      const contents = [];
      
      if (audioBase64 && audioMimeType) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: audioMimeType
          }
        });
      }
      contents.push(promptText);

      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: {
                type: Type.OBJECT,
                properties: {
              title: { type: Type.STRING, description: "Un titre proposé pour le clip vidéo" },
                  description: { type: Type.STRING },
                  theme: { type: Type.STRING },
                  rhythm: { type: Type.STRING },
                  vibe: { type: Type.STRING }
                },
                required: ["title", "description", "theme", "rhythm", "vibe"]
              },
              script: { type: Type.STRING, description: "Un script complet sous forme de texte de l'histoire/scenario du clip" },
              scenes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    action: { type: Type.STRING },
                    set: { type: Type.STRING },
                    actors: { type: Type.STRING },
                    actionDescription: { type: Type.STRING }
                  },
                  required: ["sceneNumber", "action", "set", "actors", "actionDescription"]
                }
              },
              shotList: {
                type: Type.ARRAY,
                description: "Le découpage technique détaillé (Shot list). Feature majeure.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    sceneNumber: { type: Type.INTEGER },
                    shotNumber: { type: Type.INTEGER },
                    type: { type: Type.STRING },
                    cameraMovement: { type: Type.STRING },
                    lens: { type: Type.STRING },
                    duration: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["sceneNumber", "shotNumber", "type", "cameraMovement", "lens", "duration", "description"]
                }
              },
              schedule: {
                type: Type.ARRAY,
                description: "Le planning de tournage complet et optimisé. Feature majeure.",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.INTEGER },
                    location: { type: Type.STRING },
                    estimatedTime: { type: Type.STRING },
                    scenesToShoot: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                    castNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                    equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
                  },
                  required: ["day", "location", "estimatedTime", "scenesToShoot", "castNeeded", "equipmentNeeded"]
                }
              },
              production: {
                type: Type.OBJECT,
                description: "Le planning préparatif complet et gestion globale du tournage (repérages, jours requis, etc.)",
                properties: {
                  prepDays: { type: Type.INTEGER },
                  shootDays: { type: Type.INTEGER },
                  postProdDays: { type: Type.INTEGER },
                  locationScouting: { type: Type.STRING, description: "Détails sur les repérages de décors" },
                  rehearsals: { type: Type.STRING, description: "Détails sur les répétitions, notamment avec les danseurs" },
                  otherPrep: { type: Type.STRING, description: "Autres éléments nécessaires et indispensables à la préparation" }
                },
                required: ["prepDays", "shootDays", "postProdDays", "locationScouting", "rehearsals", "otherPrep"]
              }
            },
            required: ["analysis", "script", "scenes", "shotList", "schedule", "production"]
          }
        },
      });

      const jsonStr = response.text || "{}";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      let errorMessage = error?.message || "An unexpected error occurred.";
      const isRateLimitOrOverloaded = error?.status === 429 || error?.status === 503 || errorMessage.includes("429") || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("fetch failed");
      
      if (!isRateLimitOrOverloaded) {
         console.error("API error details:", error);
      } else {
         console.log("API temporary issue (handled):", errorMessage);
      }

      if (error?.status === 429 || errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
        errorMessage = "La limite d'utilisation de l'API (Quota) a été atteinte pour l'instant. Veuillez réessayer dans quelques instants ou vérifier votre clé API.";
      } else if (error?.status === 503 || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Le modèle d'IA est actuellement surchargé (forte demande). Veuillez réessayer dans quelques instants.";
      } else if (error?.status === 400 || errorMessage.includes("video is corrupted") || errorMessage.includes("0 Frames found")) {
        errorMessage = "Le fichier multimédia fourni semble corrompu, ne contient pas de données lisibles, ou n'est pas pris en charge par l'analyse IA. Veuillez utiliser un fichier purement audio (MP3, WAV) valide.";
      } else if (errorMessage.includes("fetch failed") || error?.cause?.name === "HeadersTimeoutError" || errorMessage.includes("Headers Timeout")) {
        errorMessage = "La requête a pris trop de temps et a expiré (Timeout). Le traitement peut être long, ou le modèle est très sollicité. Veuillez réessayer avec un fichier plus court ou réessayer plus tard.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route for generating promo strategy
  app.post("/api/generate-promo", async (req, res) => {
    try {
      const { treatment, audioBase64, audioMimeType, preferences, model } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const promptText = `Tu es un stratège marketing digital et créateur de contenu viral.
À partir du scénario et de l'analyse du projet de clip vidéo suivant, ainsi que de la musique (si fournie), crée une stratégie promotionnelle détaillée pour les réseaux sociaux (Shorts, Reels, TikTok).
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.

Dossier de production actuel :
${JSON.stringify(treatment, null, 2)}

Préférences et contraintes du créateur :
- Nombre de vidéos souhaitées : ${preferences?.numberOfVideos || "Laisse l'IA décider"}
- Contraintes spécifiques : ${preferences?.constraints || "Laisse l'IA proposer"}
- Style / Références : ${preferences?.styleReferences || "Laisse l'IA proposer"}

Tu dois proposer des idées de concepts tendances respectant ces préférences, des scripts complets pour des vidéos courtes, des décors, le style de tournage/montage, et estimer le score de viralité et d'efficacité avec des explications. Sois très détaillé et créatif.

Si l'utilisateur demande un nombre spécifique de vidéos (même grand, comme 10, 30, 50), tu DOIS générer exactement ce nombre de concepts (ou déclinaisons) dans la liste "promoIdeas". Ne te limite pas, fournis tout ce qui est demandé.`;

      const contents = [];
      
      if (audioBase64 && audioMimeType) {
        contents.push({
          inlineData: {
            data: audioBase64,
            mimeType: audioMimeType
          }
        });
      }
      contents.push(promptText);

      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              targetAudience: { type: Type.STRING, description: "Description détaillée de l'audience cible pour ces vidéos courtes." },
              numberOfVideos: { type: Type.INTEGER, description: "Nombre de vidéos recommandées pour la campagne." },
              trendsAndIdeas: { type: Type.STRING, description: "Explication des tendances actuelles (trends) à utiliser et idées générales." },
              promoIdeas: {
                type: Type.ARRAY,
                description: "Liste détaillée des concepts de vidéos (Shorts/Reels/TikTok).",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Titre accrocheur de la vidéo courte." },
                    concept: { type: Type.STRING, description: "Idée et concept de base." },
                    script: { type: Type.STRING, description: "Script complet ou description étape par étape de la vidéo." },
                    visualStyle: { type: Type.STRING, description: "Décors, style de tournage, effets au montage." },
                    viralScore: { type: Type.INTEGER, description: "Score de viralité estimé (1 à 10)." },
                    efficiencyScore: { type: Type.INTEGER, description: "Score d'efficacité promotionnelle estimé (1 à 10)." },
                    explanation: { type: Type.STRING, description: "Explication de ces scores et pourquoi cette vidéo va fonctionner." }
                  },
                  required: ["title", "concept", "script", "visualStyle", "viralScore", "efficiencyScore", "explanation"]
                }
              }
            },
            required: ["targetAudience", "numberOfVideos", "trendsAndIdeas", "promoIdeas"]
          }
        },
      });

      const jsonStr = response.text || "{}";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      let errorMessage = error?.message || "An unexpected error occurred.";
      const isRateLimitOrOverloaded = error?.status === 429 || error?.status === 503 || errorMessage.includes("429") || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("fetch failed");
      
      if (!isRateLimitOrOverloaded) {
         console.error("Promo API error details:", error);
      }
      
      if (error?.status === 429 || errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
        errorMessage = "La limite d'utilisation de l'API (Quota) a été atteinte pour l'instant. Veuillez réessayer dans quelques instants ou vérifier votre clé API.";
      } else if (error?.status === 503 || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Le modèle d'IA est actuellement surchargé (forte demande). Veuillez réessayer dans quelques instants.";
      } else if (errorMessage.includes("fetch failed") || error?.cause?.name === "HeadersTimeoutError" || errorMessage.includes("Headers Timeout")) {
        errorMessage = "La requête a pris trop de temps et a expiré (Timeout).";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // API Route for AI Assistant (Chat & Modify Treatment)
  app.post("/api/assistant", async (req, res) => {
    try {
      const { treatment, message, model } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Gemini API key is not configured." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      const promptText = `Tu es l'assistant IA intégré de LensCraft. L'utilisateur veut modifier ou discuter de son projet de clip vidéo.
IMPORTANT: Ta réponse DOIT être entièrement rédigée en FRANÇAIS.

Voici le dossier de production actuel (au format JSON):
${JSON.stringify(treatment, null, 2)}

Requête de l'utilisateur: "${message}"

Modifie le JSON comme demandé (ou améliore-le si l'utilisateur le demande) ET donne une réponse textuelle ('assistantMessage') pour expliquer ce que tu as fait. Conserve la même structure riche et détaillée pour le script et les scènes.`;

      const response = await ai.models.generateContent({
        model: model || "gemini-3.5-flash",
        contents: promptText,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              assistantMessage: { type: Type.STRING, description: "La réponse ou l'explication de l'assistant IA." },
              treatment: {
                type: Type.OBJECT,
                properties: {
                  analysis: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      description: { type: Type.STRING },
                      theme: { type: Type.STRING },
                      rhythm: { type: Type.STRING },
                      vibe: { type: Type.STRING }
                    },
                    required: ["title", "description", "theme", "rhythm", "vibe"]
                  },
                  script: { type: Type.STRING },
                  scenes: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.INTEGER },
                        action: { type: Type.STRING },
                        set: { type: Type.STRING },
                        actors: { type: Type.STRING },
                        actionDescription: { type: Type.STRING }
                      },
                      required: ["sceneNumber", "action", "set", "actors", "actionDescription"]
                    }
                  },
                  shotList: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        sceneNumber: { type: Type.INTEGER },
                        shotNumber: { type: Type.INTEGER },
                        type: { type: Type.STRING },
                        cameraMovement: { type: Type.STRING },
                        lens: { type: Type.STRING },
                        duration: { type: Type.STRING },
                        description: { type: Type.STRING }
                      },
                      required: ["sceneNumber", "shotNumber", "type", "cameraMovement", "lens", "duration", "description"]
                    }
                  },
                  schedule: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        day: { type: Type.INTEGER },
                        location: { type: Type.STRING },
                        estimatedTime: { type: Type.STRING },
                        scenesToShoot: { type: Type.ARRAY, items: { type: Type.INTEGER } },
                        castNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                        equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } }
                      },
                      required: ["day", "location", "estimatedTime", "scenesToShoot", "castNeeded", "equipmentNeeded"]
                    }
                  },
                  production: {
                    type: Type.OBJECT,
                    properties: {
                      prepDays: { type: Type.INTEGER },
                      shootDays: { type: Type.INTEGER },
                      postProdDays: { type: Type.INTEGER },
                      locationScouting: { type: Type.STRING },
                      rehearsals: { type: Type.STRING },
                      otherPrep: { type: Type.STRING }
                    },
                    required: ["prepDays", "shootDays", "postProdDays", "locationScouting", "rehearsals", "otherPrep"]
                  }
                },
                required: ["analysis", "script", "scenes", "shotList", "schedule", "production"]
              }
            },
            required: ["assistantMessage", "treatment"]
          }
        },
      });

      const jsonStr = response.text || "{}";
      const result = JSON.parse(jsonStr);
      res.json(result);
    } catch (error: any) {
      let errorMessage = error?.message || "Erreur assistant inattendue.";
      const isRateLimitOrOverloaded = error?.status === 429 || error?.status === 503 || errorMessage.includes("429") || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("fetch failed");
      
      if (!isRateLimitOrOverloaded) {
         console.error("Assistant API error details:", error);
      } else {
         console.log("Assistant API temporary issue (handled):", errorMessage);
      }

      if (error?.status === 429 || errorMessage.includes("429") || errorMessage.includes("Quota exceeded")) {
        errorMessage = "La limite d'utilisation de l'API (Quota) a été atteinte.";
      } else if (error?.status === 503 || errorMessage.includes("503") || errorMessage.includes("high demand") || errorMessage.includes("UNAVAILABLE")) {
        errorMessage = "Le modèle d'IA est actuellement surchargé.";
      } else if (errorMessage.includes("fetch failed") || error?.cause?.name === "HeadersTimeoutError" || errorMessage.includes("Headers Timeout")) {
        errorMessage = "La requête a pris trop de temps et a expiré (Timeout). Le modèle est distant ou très sollicité, veuillez réessayer.";
      }
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
