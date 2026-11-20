import type {ItemState} from '../lib/srs';
import {streakFromDays} from '../lib/streak';
import {HISTORY_LIMIT, SENTENCE_LIMIT, normalizeProgress, type CompletedLesson, type HistoryEntry, type LabSentence, type LearnerProgress} from './model';

/**
 * Two copies of one learner's progress (this phone and the server, or two
 * phones) become one, without losing anything either side did. Pure, and
 * order-independent for everything except settings (the newer copy wins).
 *
 * - words: per item, the copy that was practised more (tie: the later due)
 * - lessons: earliest first finish, latest last finish, most times, best score
 * - history and sentences: everything from both, once
 * - streak: rebuilt from both sides' active days
 * - xp: the larger total
 */
export function mergeProgress(aIn: LearnerProgress, bIn: LearnerProgress): LearnerProgress {
  const a = normalizeProgress(aIn);
  const b = normalizeProgress(bIn);
  const newer = b.updatedAt > a.updatedAt ? b : a;

  return {
    version: 1,
    learnerId: a.learnerId,
    trackId: a.trackId,
    updatedAt: newer.updatedAt,
    xp: Math.max(a.xp, b.xp),
    streak: streakFromDays([...a.streak.activeDays, ...b.streak.activeDays], Math.max(a.streak.longest, b.streak.longest)),
    completed: mergeRecord(a.completed, b.completed, mergeCompleted),
    items: mergeRecord(a.items, b.items, pickItem),
    history: mergeHistory(a.history, b.history),
    sentences: mergeSentences(a.sentences, b.sentences),
    settings: {...newer.settings},
  };
}

function mergeRecord<T>(a: Record<string, T>, b: Record<string, T>, pick: (x: T, y: T) => T): Record<string, T> {
  const out: Record<string, T> = {};
  for (const id of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
    const x = a[id];
    const y = b[id];
    out[id] = x === undefined ? y : y === undefined ? x : pick(x, y);
  }
  return out;
}

function pickItem(x: ItemState, y: ItemState): ItemState {
  if (x.seen !== y.seen) return x.seen > y.seen ? x : y;
  if (x.due !== y.due) return x.due > y.due ? x : y;
  // Fully tied: pick deterministically so merge(a, b) equals merge(b, a).
  return JSON.stringify(x) >= JSON.stringify(y) ? x : y;
}

function mergeCompleted(x: CompletedLesson, y: CompletedLesson): CompletedLesson {
  return {
    firstCompleted: x.firstCompleted < y.firstCompleted ? x.firstCompleted : y.firstCompleted,
    lastCompleted: x.lastCompleted > y.lastCompleted ? x.lastCompleted : y.lastCompleted,
    times: Math.max(x.times, y.times),
    bestAccuracy: Math.max(x.bestAccuracy, y.bestAccuracy),
  };
}

/** Old entries have no id: they are the same entry when every field matches. */
export function historyKey(e: HistoryEntry): string {
  return e.id ?? `legacy|${e.date}|${e.kind}|${e.lessonId ?? ''}|${e.correct}|${e.wrong}|${e.seconds}`;
}

function mergeHistory(a: HistoryEntry[], b: HistoryEntry[]): HistoryEntry[] {
  const seen = new Map<string, HistoryEntry>();
  for (const e of [...a, ...b]) if (!seen.has(historyKey(e))) seen.set(historyKey(e), e);
  // Array sort is stable: entries of the same day keep the order they had.
  return [...seen.values()].sort((x, y) => (x.date === y.date ? 0 : x.date < y.date ? -1 : 1)).slice(-HISTORY_LIMIT);
}

function mergeSentences(a: LabSentence[], b: LabSentence[]): LabSentence[] {
  const byId = new Map<string, LabSentence>();
  for (const s of [...a, ...b]) if (!byId.has(s.id)) byId.set(s.id, s);
  return [...byId.values()].sort((x, y) => (x.createdAt === y.createdAt ? 0 : x.createdAt < y.createdAt ? -1 : 1)).slice(-SENTENCE_LIMIT);
}

/** JSON with sorted keys: the server (jsonb) reorders keys, so plain JSON.stringify can't compare copies. */
export function stableStringify(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stableStringify).join(',')}]`;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .filter(k => o[k] !== undefined)
      .sort()
      .map(k => `${JSON.stringify(k)}:${stableStringify(o[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(v) ?? 'null';
}

export function sameProgress(a: LearnerProgress, b: LearnerProgress): boolean {
  return stableStringify(a) === stableStringify(b);
}
