import type {Exercise, FormulaCard, Lesson} from '../content/types';

/**
 * The in-lesson queue. Pure functions: every call returns a new queue.
 * A wrong answer sends the task back a few places later in the same lesson;
 * after three wrong tries the answer is shown and the task counts as "helped".
 */
export const MAX_ATTEMPTS = 3;
export const REQUEUE_GAP = 3;

export type TaskContent = Exercise | {type: 'formula'; card: FormulaCard};

export interface Task {
  key: string;
  exercise: TaskContent;
  isReview: boolean;
  itemIds: string[];
  attempts: number;
  status: 'todo' | 'done' | 'helped';
  /** Set once answered: true when the first try was right. */
  firstTry?: boolean;
}

/** Words/verbs a task practises (used for spaced-review grades). */
export function exerciseItemIds(e: TaskContent): string[] {
  switch (e.type) {
    case 'pick-word':
    case 'listen-pick':
    case 'listen-type':
    case 'flashcard':
      return [e.itemId];
    case 'verb-form':
      return [e.verbId];
    case 'fill-gap':
      return e.reviewId ? [e.reviewId] : [];
    default:
      return [];
  }
}

export function makeTask(key: string, exercise: TaskContent, isReview: boolean): Task {
  return {key, exercise, isReview, itemIds: exerciseItemIds(exercise), attempts: 0, status: 'todo'};
}

/** Review warm-up first (already capped by the caller), then the formula card, then the lesson. */
export function buildQueue(lesson: Lesson | null, reviewExercises: Exercise[]): Task[] {
  const queue: Task[] = reviewExercises.map((e, i) => makeTask(`r${i}`, e, true));
  if (lesson?.formula) queue.push(makeTask('formula', {type: 'formula', card: lesson.formula}, false));
  lesson?.exercises.forEach((e, i) => queue.push(makeTask(`e${i}`, e, false)));
  return queue;
}

/** Index of the first task still to do, or -1. */
export function currentIndex(queue: Task[]): number {
  return queue.findIndex(t => t.status === 'todo');
}

export function answer(queue: Task[], index: number, correct: boolean): Task[] {
  const task = queue[index];
  if (!task || task.status !== 'todo') return queue;
  const attempts = task.attempts + 1;
  const firstTry = task.firstTry ?? correct;
  if (correct) {
    return queue.map((t, i) => (i === index ? {...t, attempts, firstTry, status: 'done'} : t));
  }
  if (attempts >= MAX_ATTEMPTS) {
    return queue.map((t, i) => (i === index ? {...t, attempts, firstTry, status: 'helped'} : t));
  }
  // Move it back: at most REQUEUE_GAP places, never past the end.
  const rest = queue.slice(index + 1);
  const remaining = rest.filter(t => t.status === 'todo').length;
  const gap = Math.min(REQUEUE_GAP, remaining);
  const moved: Task = {...task, attempts, firstTry};
  // Insert after the `gap`-th remaining todo task.
  let seen = 0;
  let insertAt = rest.length;
  if (gap === 0) insertAt = 0;
  else {
    for (let i = 0; i < rest.length; i++) {
      if (rest[i].status === 'todo') seen++;
      if (seen === gap) {
        insertAt = i + 1;
        break;
      }
    }
  }
  const nextRest = [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
  return [...queue.slice(0, index), ...nextRest];
}

export function isFinished(queue: Task[]): boolean {
  return queue.every(t => t.status !== 'todo');
}

export interface SessionSummary {
  total: number;
  firstTryCorrect: number;
  accuracy: number;
  mistakes: string[];
  /** One grade per practised item: right only if every task with it was right the first time. */
  grades: {itemId: string; correct: boolean}[];
}

export function summarize(queue: Task[]): SessionSummary {
  const graded = queue.filter(t => t.exercise.type !== 'formula');
  const firstTryCorrect = graded.filter(t => t.firstTry === true && t.status === 'done').length;
  const byItem = new Map<string, boolean>();
  for (const t of graded) {
    const ok = t.status === 'done' && t.firstTry === true;
    for (const id of t.itemIds) byItem.set(id, (byItem.get(id) ?? true) && ok);
  }
  const grades = [...byItem].map(([itemId, correct]) => ({itemId, correct}));
  return {
    total: graded.length,
    firstTryCorrect,
    accuracy: graded.length ? Math.round((firstTryCorrect / graded.length) * 100) : 100,
    mistakes: grades.filter(g => !g.correct).map(g => g.itemId),
    grades,
  };
}

/** Progress for the bar: finished tasks over all tasks (a re-queued task is not counted twice). */
export function progressOf(queue: Task[]): {done: number; total: number} {
  return {done: queue.filter(t => t.status !== 'todo').length, total: queue.length};
}
