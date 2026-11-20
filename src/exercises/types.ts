import type {Exercise, HintLang, Track} from '../content/types';

export interface Pending {
  correct: boolean;
  given: string;
}

/** What every exercise component gets from the player. */
export interface ExerciseProps<E extends Exercise = Exercise> {
  exercise: E;
  track: Track;
  hintLang: HintLang;
  /** Item ids allowed as wrong options. */
  pool: string[];
  /** Stable per task, so options don't reshuffle on re-render. */
  seed: number;
  /** True after Check: inputs are read-only and show the answer. */
  locked: boolean;
  /** The player has asked to play sounds (after the first tap). */
  autoPlay: boolean;
  /** The chosen answer, waiting for Check (null = nothing chosen). */
  onPending: (p: Pending | null) => void;
  /** For self-graded tasks (flashcards): answer now, no Check step. */
  onCommit: (correct: boolean, given: string) => void;
}
