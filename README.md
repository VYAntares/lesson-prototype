# Lesson prototype — copie locale et version éditable

Copie de https://bastian-schnitzler.github.io/lesson_prototype/ (React + Vite).

## Arborescence
- `mirror/` : miroir exact du site publié (35 fichiers, 1,8 Mo). Ne rien exécuter ni compiler dedans.
- `scripts/mirror.mjs` : script qui (re)télécharge le miroir. Écrit `mirror-report.json`.
- `reference/` : JS et CSS du miroir reformatés avec prettier (référence en lecture seule).
- `app/` : reconstruction éditable (Vite + React + TypeScript + Zod).

## Lancer le miroir
    node scripts/mirror.mjs                                          # re-télécharger (facultatif)
    python3 -m http.server 4173 --bind 127.0.0.1 --directory mirror  # http://127.0.0.1:4173

## Lancer l'app
    cd app && npm install
    npm run dev      # http://localhost:5173
    npm test         # valide tous les JSON livrés (schémas + règles croisées)
    npm run build    # build statique dans app/dist (chemins relatifs)

## Données
Tout est dans `app/public/content/` :
- `manifest.json` : point d'entrée (cours, et pour chaque leçon `draft` = brief, `content` = leçon).
- `outlines/<lang>-<niveau>.json` : plan du cours (une entrée par leçon).
- `briefs/<id>.json` : brief. Une leçon de **vocabulaire** est générée à partir du brief seul.
- `lessons/<id>.json` : contenu complet d'une leçon de **grammaire**.

## Ajouter une leçon
1. Ajouter l'entrée dans `outlines/fr-a1.json` et l'id dans `courses[0].lessonIds` du manifest.
2. Créer `briefs/<id>.json` (et `lessons/<id>.json` pour la grammaire).
3. Dans `manifest.json` → `artifacts[<id>]` : `outlineHash`, `draft` (et `content`) avec `url`,
   `sourceHash` = SHA-256 du fichier (`shasum -a 256 fichier`) et `status: "valid"`.
4. `npm test` signale les erreurs de schéma ou de cohérence ; la fiche de leçon de l'app les affiche aussi.

## Code (app/src)
- `schemas/` : schémas Zod (manifest, outline, brief, leçon).
- `lib/` : chargement et validation (`content/`), plan de leçon (`lesson/plan.ts`), génération du
  vocabulaire (`vocabulary/`), session, notation et sauvegarde localStorage (`session/`),
  synthèse vocale (`speech.ts`), i18n (`i18n.ts` + `i18n/`).
- `screens/` : `CourseIndex`, `LessonDetail` (fiche, brief, aperçu, Raw JSON), `Player` (départ,
  pages, examen, résultats). `Player/exercises/` : un composant par type d'exercice, avec un
  registre dans `registry.tsx`.
- `styles/` : CSS d'origine découpé en fichiers dans le même ordre (variables dans `tokens.css`).

## Vérification et différences connues
Comparaison automatisée au pixel près avec le miroir : liste des leçons (EN/FR, mobile, filtres), fiches
(grammaire, vocabulaire, plan seul, Raw JSON, onglets) et parcours complets des leçons 02, 19 et
03, 14, jusqu'aux résultats. Tout est identique, à l'exception du compte à rebours qui peut être
décalé d'une seconde entre les deux captures (effet du timing du test).
Non vérifié visuellement : les messages d'erreur sur des JSON invalides, périmés ou mal formés
(logique et textes repris à l'identique), ainsi que les pages d'écoute avec une vraie voix
(pas de voix dans le navigateur headless de test).
Volontairement omis : la variante « liste déroulante » d'un exercice à choix, inaccessible depuis
les données dans l'original.
