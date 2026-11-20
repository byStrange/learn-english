export type TrackId = 'g1' | 'g2';
export type GrammarRole = 'subject' | 'verb' | 'object' | 'time';
export type HintLang = 'uz' | 'ar' | 'none';

export interface Hint {
  uz?: string;
  ar?: string;
}

/** One vocabulary item. `id` starts with "w-". */
export interface Word {
  id: string;
  en: string;
  hint?: Hint;
  /** An emoji or an image path such as "/images/apple.webp" (content only, never UI). */
  picture?: string;
  /** Optional recording, e.g. "/audio/apple.mp3" in public/audio/. Used instead of the phone voice. */
  audio?: string;
  example?: string;
  role?: GrammarRole;
}

/** One verb with its three forms. `id` starts with "v-". */
export interface Verb {
  id: string;
  v1: string;
  v2: string;
  v3: string;
  kind: 'regular' | 'irregular';
  hint?: Hint;
  audio?: string;
  picture?: string;
}

export interface Tile {
  text: string;
  role: GrammarRole;
}

export interface FormulaCard {
  title: string;
  /** One formula line, shown as coloured chips joined by `joiner` (default "+"). */
  parts: Tile[];
  /** Extra formula lines (e.g. "I / you + play" and "he / she + plays"). */
  rows?: Tile[][];
  joiner?: string;
  examples: string[];
  note?: string;
}

export type Exercise =
  /** See a picture / hint → pick the English word. */
  | {type: 'pick-word'; itemId: string}
  /** Hear a word → pick the written word. */
  | {type: 'listen-pick'; itemId: string}
  /** Hear a word → type it (Group 1 only). */
  | {type: 'listen-type'; itemId: string}
  /** See V1 → pick V2 or V3. */
  | {type: 'verb-form'; verbId: string; ask: 'v2' | 'v3'}
  /** Tap the coloured tiles into order. */
  | {type: 'build-sentence'; tiles: Tile[]; answer: string[]; audio?: boolean; prompt?: string}
  /** "Yesterday I ___ to school." */
  | {type: 'fill-gap'; sentence: string; options: string[]; answer: string; reviewId?: string}
  /** Hear a sentence → pick e.g. every day / now / yesterday. */
  | {type: 'listen-sentence'; sentence: string; options: string[]; answer: string; question?: string}
  /** Look, listen, flip, grade yourself. */
  | {type: 'flashcard'; itemId: string};

export type ExerciseType = Exercise['type'];

export interface Lesson {
  id: string;
  title: string;
  minutes: number;
  formula?: FormulaCard;
  /** Words and verbs this lesson introduces (they join the word bank). */
  newItems: string[];
  exercises: Exercise[];
  /** Counts toward the Group 2 goal "sentences learned". */
  sentenceGoal?: 'present' | 'past';
}

export interface Unit {
  id: string;
  title: string;
  /** Colours the unit on the lesson path. */
  role: GrammarRole;
  description?: string;
  lessons: Lesson[];
  status?: 'ready' | 'coming-soon';
}

export interface Learner {
  id: string;
  name: string;
  nickname?: string;
  age?: number;
}

export interface Track {
  id: TrackId;
  name: string;
  shortName: string;
  description: string;
  learners: Learner[];
  mode: 'standard' | 'kids';
  goal: {title: string; description: string; targets: {words: number; sentences: number}};
  units: Unit[];
  dailyGoal: {lessons: number};
  /** How many due reviews open a lesson. */
  sessionReviewCap: number;
  /** How many items a Review session holds. */
  reviewSessionCap: number;
  speechRate: number;
}
