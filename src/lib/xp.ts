import type {SessionSummary} from './session';

export const LESSON_XP = 10;
export const REVIEW_XP = 5;

/** +10 for a finished lesson (+5 for a review session), +1 per first-try correct answer. */
export function xpFor(kind: 'lesson' | 'review', summary: Pick<SessionSummary, 'firstTryCorrect'>): number {
  return (kind === 'lesson' ? LESSON_XP : REVIEW_XP) + summary.firstTryCorrect;
}
