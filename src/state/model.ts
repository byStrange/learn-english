import type {HintLang, Lesson, TrackId} from '../content/types';
import {grade, newItem, type ItemState} from '../lib/srs';
import {emptyStreak, recordActivity, type StreakState} from '../lib/streak';
import type {SessionSummary} from '../lib/session';
import {xpFor} from '../lib/xp';
import {isValidDayKey, type DayKey} from '../lib/dates';

/** Everything one learner's phone remembers. Stored under le:v1:learner:<id>. */
export interface LearnerProgress {
  version: 1;
  learnerId: string;
  trackId: TrackId;
  /** ISO time of the last change, so the teacher panel can pick the newest copy. */
  updatedAt: string;
  xp: number;
  streak: StreakState;
  completed: Record<string, CompletedLesson>;
  items: Record<string, ItemState>;
  history: HistoryEntry[];
  /** Sentences made in the Tenses lab, oldest first. */
  sentences: LabSentence[];
  settings: {hint: HintLang};
}

/** One sentence a learner built and saved in the Tenses lab. */
export interface LabSentence {
  id: string;
  text: string;
  tense: 'present-simple' | 'past-simple';
  form: 'positive' | 'negative' | 'question';
  tokens: {text: string; role: 'subject' | 'verb' | 'object' | 'time'}[];
  date: DayKey;
  createdAt: string;
}

export interface CompletedLesson {
  firstCompleted: DayKey;
  lastCompleted: DayKey;
  times: number;
  bestAccuracy: number;
}

export interface HistoryEntry {
  /** Unique, so two phones' histories can be merged without duplicates (older saves may lack it). */
  id?: string;
  date: DayKey;
  /** 'lab' = three sentences made in the Tenses lab that day. */
  kind: 'lesson' | 'review' | 'lab';
  lessonId?: string;
  correct: number;
  wrong: number;
  seconds: number;
  mistakes: string[];
  /** XP this session earned (older saves may lack it). */
  xp?: number;
}

export const HISTORY_LIMIT = 200;
export const SENTENCE_LIMIT = 300;

/** A random id; crypto.randomUUID where the browser has it. */
export function newId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyProgress(learnerId: string, trackId: TrackId): LearnerProgress {
  return {
    version: 1,
    learnerId,
    trackId,
    updatedAt: new Date(0).toISOString(),
    xp: 0,
    streak: emptyStreak(),
    completed: {},
    items: {},
    history: [],
    sentences: [],
    settings: {hint: 'uz'},
  };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

export function isStreak(v: unknown): v is StreakState {
  return (
    isObj(v) &&
    typeof v.current === 'number' &&
    typeof v.longest === 'number' &&
    (v.lastActive === null || isValidDayKey(v.lastActive)) &&
    Array.isArray(v.activeDays)
  );
}

/**
 * Shape check used when reading the local cache and the server copy. Tolerant
 * of saves made before sentences / history ids existed: run `normalizeProgress`
 * after it.
 */
export function isLearnerProgress(v: unknown): v is LearnerProgress {
  return (
    isObj(v) &&
    v.version === 1 &&
    typeof v.learnerId === 'string' &&
    (v.trackId === 'g1' || v.trackId === 'g2') &&
    typeof v.xp === 'number' &&
    isStreak(v.streak) &&
    isObj(v.completed) &&
    isObj(v.items) &&
    Array.isArray(v.history) &&
    (v.sentences === undefined || Array.isArray(v.sentences)) &&
    isObj(v.settings)
  );
}

/** Fills fields that older saves don't have. Doesn't invent history ids (merge keys those by content). */
export function normalizeProgress(p: LearnerProgress): LearnerProgress {
  const hint = p.settings?.hint;
  return {
    ...p,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date(0).toISOString(),
    sentences: Array.isArray(p.sentences) ? p.sentences : [],
    settings: {...p.settings, hint: hint === 'uz' || hint === 'ar' || hint === 'none' ? hint : 'uz'},
  };
}

export interface SessionInput {
  kind: 'lesson' | 'review';
  lesson?: Lesson;
  summary: SessionSummary;
  seconds: number;
}

/**
 * Grades one item practised in a session. A right answer on an item that is
 * not due yet (a warm-up of yesterday's words, or a word that comes back in a
 * later lesson) is counted but doesn't move it up a box early, so the spacing
 * stays 1/2/4/7/14/30 days. A wrong answer always counts.
 */
export function gradeInSession(s: ItemState, correct: boolean, today: DayKey): ItemState {
  if (correct && s.due > today) {
    return {...s, seen: s.seen + 1, correct: s.correct + 1, lastSeen: today};
  }
  return grade(s, correct, today);
}

/**
 * A finished lesson or review: new words join the bank, every practised item
 * is graded for spaced review, the streak counts today, XP is added.
 * Pure: `today` and `now` are passed in.
 */
export function applySession(p: LearnerProgress, input: SessionInput, today: DayKey, now: string): LearnerProgress {
  const items = {...p.items};
  for (const id of input.lesson?.newItems ?? []) {
    if (!items[id]) items[id] = newItem(id, today);
  }
  for (const g of input.summary.grades) {
    items[g.itemId] = gradeInSession(items[g.itemId] ?? newItem(g.itemId, today), g.correct, today);
  }
  const completed = {...p.completed};
  if (input.kind === 'lesson' && input.lesson) {
    const prev = completed[input.lesson.id];
    completed[input.lesson.id] = {
      firstCompleted: prev?.firstCompleted ?? today,
      lastCompleted: today,
      times: (prev?.times ?? 0) + 1,
      bestAccuracy: Math.max(prev?.bestAccuracy ?? 0, input.summary.accuracy),
    };
  }
  const xp = xpFor(input.kind, input.summary);
  const entry: HistoryEntry = {
    id: newId(),
    date: today,
    kind: input.kind,
    lessonId: input.lesson?.id,
    correct: input.summary.firstTryCorrect,
    wrong: input.summary.total - input.summary.firstTryCorrect,
    seconds: Math.max(0, Math.round(input.seconds)),
    mistakes: input.summary.mistakes,
    xp,
  };
  return {
    ...p,
    updatedAt: now,
    xp: p.xp + xp,
    streak: recordActivity(p.streak, today),
    completed,
    items,
    history: [...p.history, entry].slice(-HISTORY_LIMIT),
  };
}

/** One flashcard graded on the Words screen ("I knew it" / "Not yet"). */
export function applyFlashcard(p: LearnerProgress, itemId: string, correct: boolean, today: DayKey, now: string): LearnerProgress {
  const prev = p.items[itemId] ?? newItem(itemId, today);
  return {...p, updatedAt: now, items: {...p.items, [itemId]: gradeInSession(prev, correct, today)}};
}

/** A sentence saved in the Tenses lab (newest kept, at most SENTENCE_LIMIT). */
/** Sentences saved in one day that count as practice for the streak. */
export const LAB_SENTENCES_PER_DAY = 3;
export const LAB_XP = 5;

/**
 * Saves a Tenses-lab sentence. The third one saved on a day counts as that
 * day's practice: the streak goes on, +5 XP, and one 'lab' history entry.
 */
export function applySentence(p: LearnerProgress, sentence: LabSentence, now: string): LearnerProgress {
  const rest = p.sentences.filter(x => x.id !== sentence.id);
  const next: LearnerProgress = {...p, updatedAt: now, sentences: [...rest, sentence].slice(-SENTENCE_LIMIT)};
  const today = sentence.date;
  const todays = next.sentences.filter(x => x.date === today).length;
  const counted = p.history.some(h => h.kind === 'lab' && h.date === today);
  if (todays < LAB_SENTENCES_PER_DAY || counted) return next;
  const entry: HistoryEntry = {id: newId(), date: today, kind: 'lab', correct: todays, wrong: 0, seconds: 0, mistakes: [], xp: LAB_XP};
  return {
    ...next,
    xp: p.xp + LAB_XP,
    streak: recordActivity(p.streak, today),
    history: [...p.history, entry].slice(-HISTORY_LIMIT),
  };
}
