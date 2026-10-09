import type { LocalizedText } from '../../schemas/common'

const text = (en: string, fr: string, de: string): LocalizedText => ({ en, fr, de })

/** [label, instructions] for each generated stage. */
export const STAGE_TEXTS = {
  introduction: [
    text('Introduction', 'Introduction', 'Einführung'),
    text(
      'Read the introduction and listen to the new words.',
      'Lisez l’introduction et écoutez les nouveaux mots.',
      'Lies die Einführung und hör dir die neuen Wörter an.',
    ),
  ],
  flashcards: [
    text('Flashcards', 'Cartes mémoire', 'Karteikarten'),
    text(
      'Recall each word, then turn the card to check it.',
      'Rappelez-vous chaque mot, puis retournez la carte pour vérifier.',
      'Erinnere dich an jedes Wort und dreh dann die Karte um.',
    ),
  ],
  matching: [
    text('Matching', 'Association', 'Zuordnen'),
    text(
      'Match each word with its translation.',
      'Associez chaque mot à sa traduction.',
      'Ordne jedem Wort seine Übersetzung zu.',
    ),
  ],
  gender: [
    text('Gender and overview', 'Genre et vue d’ensemble', 'Genus und Übersicht'),
    text(
      'Choose the gender of each noun, then review all words.',
      'Choisissez le genre de chaque nom, puis revoyez tous les mots.',
      'Wähle das Genus jedes Nomens und sieh dir dann alle Wörter an.',
    ),
  ],
  overview: [
    text('Overview', 'Vue d’ensemble', 'Übersicht'),
    text(
      'Review all words of this lesson.',
      'Revoyez tous les mots de cette leçon.',
      'Sieh dir alle Wörter dieser Lektion an.',
    ),
  ],
  practice: [
    text('Practice', 'Entraînement', 'Übung'),
    text(
      'Choose the right word and type it.',
      'Choisissez le bon mot et écrivez-le.',
      'Wähle das richtige Wort und schreibe es.',
    ),
  ],
  listening: [
    text('Listening', 'Écoute', 'Hören'),
    text(
      'Listen and choose the word you hear.',
      'Écoutez et choisissez le mot entendu.',
      'Hör zu und wähle das Wort, das du hörst.',
    ),
  ],
  exam: [
    text('Final exam', 'Examen final', 'Abschlussprüfung'),
    text(
      'Translate each word into French, with its article for nouns.',
      'Traduisez chaque mot en français, avec l’article pour les noms.',
      'Übersetze jedes Wort ins Französische, bei Nomen mit Artikel.',
    ),
  ],
  dictation: [
    text('Dictation', 'Dictée', 'Diktat'),
    text(
      'Listen and write the word, with its article for nouns.',
      'Écoutez et écrivez le mot, avec l’article pour les noms.',
      'Hör zu und schreib das Wort, bei Nomen mit Artikel.',
    ),
  ],
  explanation: [
    text('Explanation', 'Explication', 'Erklärung'),
    text(
      'Read the explanation and the examples.',
      'Lisez l’explication et les exemples.',
      'Lies die Erklärung und die Beispiele.',
    ),
  ],
  feedback: [
    text('Your feedback', 'Votre retour', 'Dein Feedback'),
    text('Continue to the final exam.', 'Passez à l’examen final.', 'Weiter zur Abschlussprüfung.'),
  ],
  grammarExam: [
    text('Final exam', 'Examen final', 'Abschlussprüfung'),
    text(
      'Answer every item before the time runs out.',
      'Répondez à chaque question avant la fin du temps imparti.',
      'Beantworte jede Aufgabe, bevor die Zeit abläuft.',
    ),
  ],
} satisfies Record<string, [LocalizedText, LocalizedText]>
