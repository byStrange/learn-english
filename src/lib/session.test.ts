import {describe, expect, it} from 'vitest';
import type {Exercise, Lesson} from '../content/types';
import {MAX_ATTEMPTS, answer, buildQueue, currentIndex, isFinished, progressOf, summarize} from './session';
import {xpFor} from './xp';

const lesson: Lesson = {
  id: 'test-1',
  title: 'Test',
  minutes: 5,
  newItems: ['v-go', 'w-apple'],
  formula: {title: 'S + V + O', parts: [{text: 'I', role: 'subject'}], examples: ['I go.']},
  exercises: [
    {type: 'verb-form', verbId: 'v-go', ask: 'v2'},
    {type: 'pick-word', itemId: 'w-apple'},
    {type: 'listen-pick', itemId: 'w-milk'},
    {type: 'fill-gap', sentence: 'I ___ home.', options: ['go', 'goes'], answer: 'go'},
  ],
};
const reviews: Exercise[] = [
  {type: 'listen-pick', itemId: 'w-bread'},
  {type: 'pick-word', itemId: 'w-egg'},
];

/** Answers the current task until the queue is done; `wrongFor` lists task keys to fail on their first try. */
function play(queue = buildQueue(lesson, reviews), wrongFor: Record<string, number> = {}) {
  let q = queue;
  let guard = 0;
  while (!isFinished(q) && guard++ < 100) {
    const i = currentIndex(q);
    const key = q[i].key;
    const fails = wrongFor[key] ?? 0;
    q = answer(q, i, q[i].attempts >= fails);
  }
  return q;
}

describe('lesson queue', () => {
  it('puts review tasks first, then the formula card, then the lesson', () => {
    const q = buildQueue(lesson, reviews);
    expect(q.map(t => t.key)).toEqual(['r0', 'r1', 'formula', 'e0', 'e1', 'e2', 'e3']);
    expect(q.filter(t => t.isReview).map(t => t.key)).toEqual(['r0', 'r1']);
    expect(q[0].itemIds).toEqual(['w-bread']);
    expect(q.every(t => t.status === 'todo' && t.attempts === 0)).toBe(true);
  });

  it('marks a right answer done', () => {
    const q = answer(buildQueue(lesson, []), 0, true);
    expect(q[0].status).toBe('done');
    expect(q[0].firstTry).toBe(true);
    expect(currentIndex(q)).toBe(1);
  });

  it('brings a wrong answer back three places later', () => {
    const q0 = buildQueue(lesson, reviews);
    const q = answer(q0, 3, false); // e0 wrong
    expect(q.map(t => t.key)).toEqual(['r0', 'r1', 'formula', 'e1', 'e2', 'e3', 'e0']);
    const moved = q.find(t => t.key === 'e0')!;
    expect(moved.status).toBe('todo');
    expect(moved.attempts).toBe(1);
    expect(moved.firstTry).toBe(false);
  });

  it('re-inserts near the end when fewer tasks remain', () => {
    let q = buildQueue(lesson, []);
    for (let i = 0; i < 3; i++) q = answer(q, currentIndex(q), true);
    // e2 wrong with only e3 after it
    q = answer(q, currentIndex(q), false);
    expect(q.map(t => t.key)).toEqual(['formula', 'e0', 'e1', 'e3', 'e2']);
  });

  it('keeps the last task in place when it is the only one left', () => {
    let q = buildQueue(lesson, []);
    for (let i = 0; i < 4; i++) q = answer(q, currentIndex(q), true);
    q = answer(q, currentIndex(q), false);
    expect(q.at(-1)!.key).toBe('e3');
    expect(q.at(-1)!.status).toBe('todo');
    expect(isFinished(q)).toBe(false);
  });

  it(`shows the answer after ${MAX_ATTEMPTS} wrong tries and moves on`, () => {
    const q = play(buildQueue(lesson, []), {e1: 99});
    const t = q.find(x => x.key === 'e1')!;
    expect(t.status).toBe('helped');
    expect(t.attempts).toBe(MAX_ATTEMPTS);
    expect(isFinished(q)).toBe(true);
  });

  it('finishes and summarizes: mistakes and grades per item', () => {
    const q = play(buildQueue(lesson, reviews), {e0: 1, r1: 1});
    expect(isFinished(q)).toBe(true);
    const s = summarize(q);
    expect(s.total).toBe(6); // formula card is not graded
    expect(s.firstTryCorrect).toBe(4);
    expect(s.accuracy).toBe(67);
    expect(s.mistakes.sort()).toEqual(['v-go', 'w-egg']);
    expect(s.grades).toContainEqual({itemId: 'w-apple', correct: true});
    expect(s.grades).toContainEqual({itemId: 'v-go', correct: false});
  });

  it('counts progress without double-counting a re-queued task', () => {
    let q = buildQueue(lesson, []);
    q = answer(q, 0, true);
    q = answer(q, 1, false);
    expect(progressOf(q)).toEqual({done: 1, total: 5});
  });

  it('works for a review-only session', () => {
    const q = play(buildQueue(null, reviews));
    expect(q.length).toBe(2);
    expect(summarize(q).accuracy).toBe(100);
  });

  it('gives +10 XP for a lesson plus 1 per first-try answer', () => {
    expect(xpFor('lesson', {firstTryCorrect: 4})).toBe(14);
    expect(xpFor('review', {firstTryCorrect: 2})).toBe(7);
  });
});
