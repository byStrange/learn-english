import {addDays, type DayKey} from './dates';

/**
 * Leitner spaced repetition.
 * Box 0 = new, due today. A right answer moves an item up one box (at most once
 * per day); a wrong answer sends it back to box 1, due again today.
 * Days until the next review, by box:
 */
export const INTERVALS = [0, 1, 2, 4, 7, 14, 30] as const;
export const MAX_BOX = INTERVALS.length - 1;
export const COMFORTABLE_BOX = 4;

export interface ItemState {
  id: string;
  box: number;
  due: DayKey;
  seen: number;
  correct: number;
  wrong: number;
  lastSeen?: DayKey;
  lastPromoted?: DayKey;
}

export function newItem(id: string, today: DayKey): ItemState {
  return {id, box: 0, due: today, seen: 0, correct: 0, wrong: 0};
}

export function grade(s: ItemState, correct: boolean, today: DayKey): ItemState {
  const next: ItemState = {
    ...s,
    seen: s.seen + 1,
    correct: s.correct + (correct ? 1 : 0),
    wrong: s.wrong + (correct ? 0 : 1),
    lastSeen: today,
  };
  if (correct) {
    if (s.lastPromoted !== today) {
      next.box = Math.min(s.box + 1, MAX_BOX);
      next.lastPromoted = today;
    }
    next.due = addDays(today, INTERVALS[next.box]);
  } else {
    next.box = s.box === 0 ? 0 : 1;
    next.due = today;
  }
  return next;
}

export function isDue(s: ItemState, today: DayKey): boolean {
  return s.due <= today;
}

export function dueItems(states: Iterable<ItemState>, today: DayKey, limit = Infinity): ItemState[] {
  return [...states]
    .filter(s => isDue(s, today))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : a.box - b.box || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)))
    .slice(0, limit);
}

export function isComfortable(s: ItemState | undefined): boolean {
  return !!s && s.box >= COMFORTABLE_BOX;
}

/** Plain-words label for a box, shown next to its marks. */
export function boxLabel(box: number): string {
  if (box >= COMFORTABLE_BOX) return 'Comfortable';
  if (box >= 2) return 'Getting there';
  if (box === 1) return 'Practising';
  return 'New';
}
