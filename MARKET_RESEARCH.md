# Étude de marché — Questionnaire & Plan de Diffusion

> Objectif : **30 réponses qualifiées en 2 semaines** pour décider quoi construire, à quel prix,
> et pour qui. Tout est déjà intégré dans l'application — il n'y a rien d'autre à installer.

---

## 1. Le questionnaire (déjà en ligne)

**Lien public :** `https://votre-domaine/survey`
**Tableau de bord :** `https://votre-domaine/survey/results`

| # | Question | Pourquoi elle existe |
|---|----------|----------------------|
| 1 | Vous êtes… (rôle) | Segmente artistes / réals / équipes / étudiants |
| 2 | Combien de clips par an ? | Fréquence d'usage = valeur d'un abonnement |
| 3 | Comment préparez-vous un dossier aujourd'hui ? | Mesure la **douleur réelle** et l'alternative utilisée |
| 4 | LE plus gros blocage | Valide l'ordre de priorité des fonctionnalités |
| 5 | Temps passé en pré-production | Chiffre le temps qu'on leur fait gagner |
| 6 | Montant déjà payé par le passé | Prix que le marché **accepte réellement** |
| 7 | Prix mensuel accepté | Valide l'échelle 2 000 / 5 000 / 15 000 FCFA |
| 8 | Fonctionnalité la plus importante | Roadmap produit |
| 9 | Plateformes de promotion | Où publier les concepts générés |
| 10 | Envie de tester gratuitement ? | **Liste de testeurs** — la métrique la plus importante |
| 11 | Email (optionnel) | Recrutement des testeurs |

Temps de réponse constaté : **45 à 70 secondes** (les questions à choix unique avancent automatiquement).

---

## 2. Diffuser avec traçabilité par canal

Ajoutez `?src=` à chaque lien pour savoir **quel canal marche** :

| Canal | Lien à partager |
|-------|-----------------|
| Groupes WhatsApp d'artistes | `/survey?src=whatsapp` |
| Bio Instagram / story | `/survey?src=instagram` |
| TikTok | `/survey?src=tiktok` |
| Groupes Facebook | `/survey?src=facebook` |
| Emailing direct | `/survey?src=email` |

Le tableau de bord ventile les réponses par canal : vous saurez où concentrer l'effort la semaine suivante.

### Message de partage (copier-coller)

> Salut ! Je construis un outil qui génère automatiquement un dossier de production
> complet pour un clip (scénario, liste de plans, planning, stratégie promo TikTok/Reels)
> à partir de ton son. Avant de le finaliser, j'ai besoin de 1 minute de ton temps —
> 11 questions, anonyme, et ça m'aide vraiment à bien le calibrer :
> https://votre-domaine/survey?src=whatsapp

---

## 3. Lire les résultats

Le tableau de bord calcule un **score de demande sur 100** :
- 60 % basé sur le prix mensuel moyen accepté (question 7)
- 40 % basé sur la part de « Oui, envoyez-moi l'accès » (question 10)

| Score | Lecture | Action |
|-------|---------|--------|
| < 25 | Problème de marché ou de prix | Revoir l'ICP, retester auprès d'un autre segment |
| 25 – 50 | Demande tiède | Itérer sur le prix et la fonctionnalité phare |
| 50 – 75 | Bon signal | Lancer la beta privée avec les emails collectés |
| > 75 | Fort | Facturer dès la beta, prioriser la file d'attente |

**Seuils de décision que je recommande :**
- ≥ 30 % de « Oui, envoyez-moi l'accès » → le produit résout un vrai problème
- ≥ 50 % prêts à payer 5 000 FCFA → le palier Pro est le bon
- Question 6 (déjà payé) > 100 000 FCFA pour ≥ 20 % → envisager une offre « à la commande » au-dessus de l'abonnement

---

## 4. Où sont stockées les réponses

- `POST /api/survey` ajoute une ligne JSON à `data/survey-responses.jsonl` (dossier git-ignoré)
- `GET /api/survey/stats` → compteurs agrégés, sans donnée personnelle
- `GET /api/survey/export` → CSV complet (protégé par `SURVEY_TOKEN` si vous en définissez un)
- En cas d'échec réseau, le navigateur garde les réponses en local et le répondant peut les télécharger

```bash
# Sur le serveur : définir un token pour protéger l'export CSV
SURVEY_TOKEN=mon-token-secret
```

---

## 5. Récupérer les testeurs

Les emails collectés sont dans le CSV (`email` = question 11).
Filtrez sur `trial_interest = "Oui, envoyez-moi l'accès"` → c'est votre liste de beta.

Relance type :

> Merci d'avoir répondu ! Voici ton accès à LensCraft AI : [lien]
> Tu as 1 dossier gratuit. Dis-moi ce qui bloque ou ce qui déçoit —
> c'est exactement ce qui m'intéresse.
