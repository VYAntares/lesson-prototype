# Format des leçons v3

Code : `app/src/format/` (schémas zod + checks). Exemple complet écrit à la main :
`app/src/format/examples/fr-subject-pronouns.{brief,content}.json`.

## Principes

- **10 minutes, calculées.** Chaque type d'exercice et de fiche a une durée fixe dans le code
  (`exercises.ts`, `durations.ts`). Le check additionne et refuse plus de 600 s, dès le brief (plan)
  puis sur le content. Le LLM n'écrit aucune durée.
- **Des points.** Une leçon a 1 à 4 points (une règle, un groupe de mots, une situation). Chaque
  point a une section : une fiche de théorie, puis ses exercices. Les points forment la barre
  latérale du lecteur.
- **Un seul score, à la fin.** Seul le contrôle final est noté (0–100). La pratique a des indices et
  ne compte pas. Aucune minuterie.
- **Toutes les réponses correctes.** Saisie : `accepted` liste toutes les réponses justes. QCM :
  chaque choix a `correct`, plusieurs peuvent l'être. Casse, apostrophes, espaces et ponctuation
  finale sont normalisés par le code ; une faute d'accent compte juste, avec une remarque.
- **Pas de prérequis cachés.** Tout mot d'un exercice doit être connu : mots de base de la langue
  (`lexicon.ts`), mots introduits par une leçon précédente de l'outline, mots de la leçon
  (`introduces`, `glossary`) et `names`.
- **Langue des explications (décision C).** Langue maternelle (en/fr/de sauf la langue du cours) en
  A1–A2, langue du cours à partir de B1. Les exemples sont traduits en A1–A2. Les consignes
  génériques (« Choisis… ») sont dans l'i18n du front, pas dans les données.

## Brief (`brief.ts`)

| Champ | Rôle |
|---|---|
| `kind`, `topic`, `theme` | égaux à l'entrée d'outline |
| `title` | dans la langue du cours (≤ 80) |
| `summary`, `objective`, `outOfScope` | dans la langue des explications |
| `points[]` | `id`, `title`, `summary` |
| `introduces[]` | mots enseignés, connus dans toutes les leçons suivantes |
| `glossary[]` | mots donnés avec leur sens, jamais évalués, pas retenus ensuite |
| `names[]` | prénoms et lieux utilisables |
| `practice[]` | plan : `{ pointId, type, count }`, dans l'ordre des points |
| `quiz[]` | plan du contrôle : `{ pointIds, type, count }`, 4 à 8 exercices |
| `reading` | lecture seulement : genre, nombre de mots, faits à retrouver |
| `tooBig` | rempli par le générateur si le sujet dépasse 10 min même réduit ; jamais découpé |

Un mot (`introduces`, `glossary`) : `term` (forme du dictionnaire, sans article), `pos`, `gender`
(obligatoire pour les noms en fr/de), `forms` (toutes les formes qui apparaîtront), `meaning`,
`register` (expressions), `pointId`.

## Content (`content.ts`)

`sections[]` (une par point, dans l'ordre) : `theory` + `practice[]`, puis `quiz[]`. Pour la lecture,
`reading` contient le texte, visible des questions jusqu'à la fin.

Fiches de théorie :
- `rule` (grammaire) : règle courte en Markdown restreint, tableau facultatif, 1 à 4 exemples avec
  la forme surlignée et traduits, astuce facultative ;
- `words` (vocabulaire, mots-clés de lecture) : cartes avec audio, forme affichée, exemple ;
- `expressions` (functions) : situation, expressions, petit dialogue.

Champs communs des exercices : `id`, `pointIds` (le premier est celui de la section), `hint`
(obligatoire en pratique, interdit au contrôle), `explanation` (affichée après la réponse).

| Type | Interaction | Durée (s) | Types de leçon |
|---|---|---|---|
| `gap_choice` | clic | 12 | tous |
| `question_choice` | clic | 15 | reading, functions |
| `situation_choice` | clic | 15 | functions |
| `listen_choice` | clic | 12 | vocabulary, functions |
| `pick_reply` | clic | 15 | functions |
| `true_false` (vrai / faux / on ne sait pas, avec citation) | clic | 10 | reading |
| `match_meaning` | clic | 6 + 6 par paire | vocabulary, functions, reading |
| `match_forms` | clic | 6 + 6 par paire | grammar |
| `gender` (noms qui ont un genre) | clic | 6 | vocabulary |
| `order_words` | clic | 18 | grammar, functions |
| `order_dialogue` | clic | 10 + 5 par réplique | functions |
| `conjugation_pick` | clic | 6 + 5 par ligne | grammar |
| `gap_typing` | saisie | 20 | tous |
| `translate` (langue maternelle → langue du cours) | saisie | 25 | grammar, vocabulary, functions |
| `short_answer` | saisie | 20 | reading |
| `conjugation_typing` | saisie | 6 + 8 par ligne | grammar |

Fiches : règle = 20 + 1 par 15 caractères + 8 par exemple + 3 par ligne de tableau (+5 astuce) ;
mot = 12 ; expressions = 15 + 10 par expression + 5 par réplique. Lecture : 60 mots/min en A1
(80, 110, 140, 170, 200 ensuite). Écrans de début et de résultats : 20.

## Checks (`checks.ts`)

Erreur = bloque ; avertissement = signalé seulement.

Brief :
1. identique à l'entrée d'outline (id, kind, topic/theme, niveau) ;
2. `tooBig` rempli → erreur (une personne décide) ;
3. mots : `forms` contient le terme, genre pour les noms (fr/de) et seulement pour eux, pas
   d'article dans le terme (fr), pas de doublon ; avertissement si un mot introduit est déjà connu ;
4. vocabulary : 6 à 12 mots, au moins 2 par point ; functions : au moins une expression par point ;
   reading : `reading` présent (et seulement là) ;
5. pratique dans l'ordre des points, chaque point pratiqué, ouvert par un exercice à cliquer ;
6. contrôle de 4 à 8 exercices qui couvre chaque point ;
7. types d'exercices autorisés pour le type de leçon ;
8. au plus 40 % de saisie en pratique, 30 à 60 % au contrôle (0 à 50 % en lecture) ;
9. exercices de genre : au moins 3 noms avec un genre ;
10. durée du plan ≤ 600 s.

Content :
1. identique au brief (id, kind, niveau) ; texte présent pour la lecture seulement, longueur
   à ±30 % du plan ;
2. une section par point, dans l'ordre ; fiche du bon type (obligatoire, sauf sections suivantes
   d'une lecture) ;
3. fiches : Markdown restreint avec les mêmes formes dans toutes les langues, exemples traduits en
   A1–A2, surlignages présents dans la phrase, tableaux réguliers, tous les mots ou expressions du
   point affichés ;
4. exercices conformes au plan du brief (types et nombres) ; `pointIds` du point ou d'un point
   précédent ;
5. indice en pratique, aucun au contrôle ; aucun exercice du contrôle ne répète la pratique ;
6. réponses : au moins un choix juste et un faux, pas de doublon après normalisation (choix,
   réponses acceptées, ordres) ; phrase à trous avec au moins 3 mots autour du trou et sans `___` ;
   ordres de mots = permutations ; appariements sans doublon ; genre conforme au brief ; vrai/faux
   cité exactement depuis le texte ; conjugaison : un choix juste par ligne ;
7. ids uniques ;
8. mots connus seulement : erreur si tous les briefs précédents existent, avertissement sinon ;
9. durée calculée ≤ 600 s.

Générateur (étape suivante) : solveur LLM qui résout chaque exercice sans la réponse ; si sa liste de
réponses diffère de `accepted` / des choix justes, l'exercice est renvoyé à la correction puis
signalé.

## Compatibilité ft_transcendence

Le brief contient de quoi remplir `LessonDraftEntry` (`title`, `summary`, `brief.objective`,
`points`, `examples`, `pitfalls`, `vocabulary`) ; la fonction de conversion viendra avec le
générateur. Écart à signaler à l'équipe : `VocabularyEntrySchema` veut tout dans la langue du cours,
ce qui ne tient pas en A1–A2 avec la décision C.
