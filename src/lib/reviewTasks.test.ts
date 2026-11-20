import {describe, expect, it} from 'vitest';
import {g1, g2} from '../content/tracks';
import {getItem} from '../content/index';
import {newItem} from './srs';
import {distractors, reviewExercisesFor, reviewTypeFor, shuffle} from './reviewTasks';
import {buildQueue} from './session';

const D = '2026-03-10';

describe('review tasks', () => {
  it('turns due items into exercises, capped, oldest first', () => {
    const items = {
      'v-go': {...newItem('v-go', D), box: 2, due: '2026-03-08'},
      'w-apple': {...newItem('w-apple', D), box: 1, due: '2026-03-09'},
      'w-milk': {...newItem('w-milk', D), box: 1, due: '2026-03-20'},
      'w-egg': {...newItem('w-egg', D), box: 0, due: D},
    };
    const ex = reviewExercisesFor(g1, items, D, 2);
    expect(ex).toHaveLength(2);
    expect(ex.map(e => ('itemId' in e ? e.itemId : 'verbId' in e ? e.verbId : ''))).toEqual(['v-go', 'w-apple']);
    expect(reviewExercisesFor(g1, items, D, 10)).toHaveLength(3);
  });

  it('flags review tasks in the lesson queue', () => {
    const items = {'w-apple': {...newItem('w-apple', D), box: 1, due: D}};
    const q = buildQueue(g1.units[0].lessons[0], reviewExercisesFor(g1, items, D, 6));
    expect(q[0].isReview).toBe(true);
    expect(q[0].itemIds).toEqual(['w-apple']);
    expect(q.slice(1).every(t => !t.isReview)).toBe(true);
  });

  it('rotates the exercise type as the box grows', () => {
    const apple = getItem('w-apple')!;
    const go = getItem('v-go')!;
    expect(['pick-word', 'listen-pick']).toContain(reviewTypeFor(g1, apple, 0, 0).type);
    expect(reviewTypeFor(g1, apple, 1, 0).type).not.toBe(reviewTypeFor(g1, apple, 1, 1).type);
    expect(reviewTypeFor(g1, go, 2, 0)).toEqual({type: 'verb-form', verbId: 'v-go', ask: 'v2'});
    expect(reviewTypeFor(g1, go, 3, 0)).toEqual({type: 'verb-form', verbId: 'v-go', ask: 'v3'});
    expect(reviewTypeFor(g1, apple, 4, 0).type).toBe('listen-type');
    // Kids never get typing tasks.
    expect(reviewTypeFor(g2, apple, 5, 0).type).toBe('listen-pick');
  });

  it('picks distractors from the pool only, same kind first, deterministic', () => {
    const go = getItem('v-go')!;
    const pool = ['v-go', 'v-eat', 'v-see', 'w-apple', 'w-milk'];
    const a = distractors(go, pool, 3, 42);
    const b = distractors(go, pool, 3, 42);
    expect(a.map(x => x.id)).toEqual(b.map(x => x.id));
    expect(a).toHaveLength(3);
    expect(a.map(x => x.id)).not.toContain('v-go');
    expect(a.slice(0, 2).every(x => x.kind === 'verb')).toBe(true);
    expect(a.every(x => pool.includes(x.id))).toBe(true);
  });

  it('shuffles deterministically without losing items', () => {
    const list = [1, 2, 3, 4, 5, 6];
    expect(shuffle(list, 7)).toEqual(shuffle(list, 7));
    expect([...shuffle(list, 7)].sort()).toEqual(list);
  });
});
