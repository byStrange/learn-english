import {describe, expect, it} from 'vitest';
import {COMFORTABLE_BOX, INTERVALS, type ItemState, boxLabel, dueItems, grade, isComfortable, isDue, newItem} from './srs';
import {addDays, diffDays} from './dates';

const D = '2026-03-02';

describe('spaced review (Leitner boxes)', () => {
  it('starts a new item in box 0, due today', () => {
    const s = newItem('w-apple', D);
    expect(s).toMatchObject({id: 'w-apple', box: 0, due: D, seen: 0, correct: 0, wrong: 0});
    expect(isDue(s, D)).toBe(true);
  });

  it('moves up one box on a right answer and schedules by INTERVALS', () => {
    const s = grade(newItem('w-apple', D), true, D);
    expect(s.box).toBe(1);
    expect(s.due).toBe(addDays(D, INTERVALS[1]));
    expect(s.seen).toBe(1);
    expect(s.correct).toBe(1);
    expect(isDue(s, D)).toBe(false);
    expect(isDue(s, addDays(D, 1))).toBe(true);
  });

  it('promotes only once per day, however many right answers', () => {
    let s = newItem('v-go', D);
    s = grade(s, true, D);
    s = grade(s, true, D);
    s = grade(s, true, D);
    expect(s.box).toBe(1);
    expect(s.correct).toBe(3);
    const next = grade(s, true, addDays(D, 1));
    expect(next.box).toBe(2);
    expect(next.due).toBe(addDays(D, 1 + INTERVALS[2]));
  });

  it('follows 1, 2, 4, 7, 14, 30 days when always right', () => {
    let s = newItem('v-go', D);
    let day = D;
    const gaps: number[] = [];
    for (let i = 0; i < 6; i++) {
      s = grade(s, true, day);
      gaps.push(diffDays(day, s.due));
      day = s.due;
    }
    expect(gaps).toEqual([1, 2, 4, 7, 14, 30]);
    expect(s.box).toBe(6);
  });

  it('never goes past the last box', () => {
    let s = {...newItem('v-go', D), box: 6};
    s = grade(s, true, D);
    expect(s.box).toBe(6);
    expect(s.due).toBe(addDays(D, 30));
  });

  it('sends a wrong answer back to box 1, due again today', () => {
    let s: ItemState = {...newItem('v-go', D), box: 5, lastPromoted: '2026-01-01'};
    s = grade(s, false, D);
    expect(s.box).toBe(1);
    expect(s.due).toBe(D);
    expect(s.wrong).toBe(1);
    expect(s.lastSeen).toBe(D);
  });

  it('keeps a new item in box 0 when it is wrong', () => {
    const s = grade(newItem('v-go', D), false, D);
    expect(s.box).toBe(0);
    expect(s.due).toBe(D);
  });

  it('lists due items oldest first, then lower box, then id; respects the limit', () => {
    const states = [
      {...newItem('c', D), box: 2, due: '2026-03-01'},
      {...newItem('a', D), box: 3, due: '2026-03-01'},
      {...newItem('b', D), box: 1, due: '2026-02-20'},
      {...newItem('z', D), box: 1, due: '2026-03-09'}, // not due
      {...newItem('d', D), box: 2, due: '2026-03-01'},
    ];
    expect(dueItems(states, D).map(s => s.id)).toEqual(['b', 'c', 'd', 'a']);
    expect(dueItems(states, D, 2).map(s => s.id)).toEqual(['b', 'c']);
  });

  it('calls an item comfortable from box 4', () => {
    expect(COMFORTABLE_BOX).toBe(4);
    expect(isComfortable({...newItem('a', D), box: 3})).toBe(false);
    expect(isComfortable({...newItem('a', D), box: 4})).toBe(true);
    expect(isComfortable(undefined)).toBe(false);
  });

  it('names boxes in plain words', () => {
    expect(boxLabel(0)).toBe('New');
    expect(boxLabel(1)).toBe('Practising');
    expect(boxLabel(3)).toBe('Getting there');
    expect(boxLabel(4)).toBe('Comfortable');
  });

  it('becomes comfortable after four right reviews on different days', () => {
    let s = newItem('w-apple', D);
    let day = D;
    for (let i = 0; i < 4; i++) {
      expect(isComfortable(s)).toBe(false);
      s = grade(s, true, day);
      day = s.due;
    }
    expect(isComfortable(s)).toBe(true);
  });
});
