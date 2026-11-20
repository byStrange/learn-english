import type {Exercise, Track} from '../content/types';
import {getItem, type Item} from '../content/index';
import {dueItems, type ItemState} from './srs';
import type {DayKey} from './dates';

/** Small deterministic PRNG so tests (and a re-render) give the same order. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function shuffle<T>(list: readonly T[], seed: number): T[] {
  const rand = mulberry32(seed);
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Wrong options for a word: same kind first (verbs with verbs), from the
 * learner's own unlocked items, never a duplicate spelling of the answer.
 */
export function distractors(item: Item, poolIds: readonly string[], n: number, seed: number): Item[] {
  const pool = poolIds
    .map(id => getItem(id))
    .filter((x): x is Item => !!x && x.id !== item.id && x.text.toLowerCase() !== item.text.toLowerCase());
  const same = shuffle(pool.filter(x => x.kind === item.kind), seed);
  const other = shuffle(pool.filter(x => x.kind !== item.kind), seed + 1);
  const out: Item[] = [];
  for (const x of [...same, ...other]) {
    if (out.length >= n) break;
    if (!out.some(o => o.text.toLowerCase() === x.text.toLowerCase())) out.push(x);
  }
  return out;
}

/** The exercise type for a review, rotating with the box so the task feels different each time. */
export function reviewTypeFor(track: Track, item: Item, box: number, seen: number): Exercise {
  const flip = seen % 2 === 0;
  if (box <= 1) {
    if (item.picture || item.hint) return flip ? {type: 'listen-pick', itemId: item.id} : {type: 'pick-word', itemId: item.id};
    return {type: 'listen-pick', itemId: item.id};
  }
  if (box <= 3) {
    if (item.kind === 'verb' && item.verb) return flip ? {type: 'verb-form', verbId: item.id, ask: box === 2 ? 'v2' : 'v3'} : {type: 'listen-pick', itemId: item.id};
    return {type: 'listen-pick', itemId: item.id};
  }
  if (track.mode === 'kids') return {type: 'listen-pick', itemId: item.id};
  return {type: 'listen-type', itemId: item.id};
}

/** Turns due items into review exercises (capped), oldest due first. */
export function reviewExercisesFor(
  track: Track,
  itemStates: Record<string, ItemState>,
  today: DayKey,
  cap: number,
): Exercise[] {
  return dueItems(Object.values(itemStates), today, cap)
    .map(s => {
      const item = getItem(s.id);
      return item ? reviewTypeFor(track, item, s.box, s.seen) : null;
    })
    .filter((e): e is Exercise => e !== null);
}
