import {mergeProgress, sameProgress} from './merge';
import {emptyProgress, type HistoryEntry, type LabSentence, type LearnerProgress} from './model';
import {newItem, grade} from '../lib/srs';
import {streakFromDays} from '../lib/streak';

const base = (): LearnerProgress => emptyProgress('abdulloh', 'g1');
const entry = (id: string | undefined, date: string, lessonId = 'g1-u1-l1'): HistoryEntry => ({
  id,
  date,
  kind: 'lesson',
  lessonId,
  correct: 8,
  wrong: 2,
  seconds: 300,
  mistakes: [],
  xp: 18,
});
const sentence = (id: string, text: string, createdAt: string): LabSentence => ({
  id,
  text,
  tense: 'past-simple',
  form: 'positive',
  tokens: [{text, role: 'subject'}],
  date: createdAt.slice(0, 10),
  createdAt,
});

describe('mergeProgress: two phones, one learner', () => {
  it('keeps what each phone did (disjoint sessions)', () => {
    const phone = {
      ...base(),
      updatedAt: '2026-05-01T10:00:00.000Z',
      xp: 18,
      completed: {'g1-u1-l1': {firstCompleted: '2026-05-01', lastCompleted: '2026-05-01', times: 1, bestAccuracy: 0.8}},
      items: {'w-apple': grade(newItem('w-apple', '2026-05-01'), true, '2026-05-01')},
      history: [entry('a1', '2026-05-01')],
      streak: streakFromDays(['2026-05-01']),
    };
    const tablet = {
      ...base(),
      updatedAt: '2026-05-02T10:00:00.000Z',
      xp: 12,
      completed: {'g1-u2-l1': {firstCompleted: '2026-05-02', lastCompleted: '2026-05-02', times: 1, bestAccuracy: 0.9}},
      items: {'v-go': newItem('v-go', '2026-05-02')},
      history: [entry('b1', '2026-05-02', 'g1-u2-l1')],
      streak: streakFromDays(['2026-05-02']),
    };
    const m = mergeProgress(phone, tablet);
    expect(Object.keys(m.completed).sort()).toEqual(['g1-u1-l1', 'g1-u2-l1']);
    expect(Object.keys(m.items).sort()).toEqual(['v-go', 'w-apple']);
    expect(m.history.map(h => h.id)).toEqual(['a1', 'b1']);
    expect(m.updatedAt).toBe('2026-05-02T10:00:00.000Z');
    expect(m.xp).toBe(18);
  });

  it('rebuilds the streak from both phones’ days and keeps the longest', () => {
    const a = {...base(), streak: {...streakFromDays(['2026-05-01', '2026-05-02']), longest: 9}};
    const b = {...base(), streak: streakFromDays(['2026-05-03'])};
    const m = mergeProgress(a, b);
    expect(m.streak.current).toBe(3);
    expect(m.streak.lastActive).toBe('2026-05-03');
    expect(m.streak.activeDays).toEqual(['2026-05-01', '2026-05-02', '2026-05-03']);
    expect(m.streak.longest).toBe(9);
  });

  it('keeps the item that was practised more', () => {
    let more = newItem('w-apple', '2026-05-01');
    more = grade(more, true, '2026-05-01');
    more = grade(more, true, '2026-05-02');
    const less = newItem('w-apple', '2026-05-01');
    const m = mergeProgress({...base(), items: {'w-apple': less}}, {...base(), items: {'w-apple': more}});
    expect(m.items['w-apple']).toEqual(more);
  });

  it('is idempotent: merge(a, a) is a', () => {
    const a = {
      ...base(),
      xp: 30,
      items: {'w-apple': newItem('w-apple', '2026-05-01')},
      history: [entry('x', '2026-05-01'), entry('y', '2026-05-01')],
      streak: streakFromDays(['2026-05-01']),
      sentences: [sentence('s1', 'I played football.', '2026-05-01T09:00:00.000Z')],
    };
    expect(mergeProgress(a, a)).toEqual(a);
    expect(sameProgress(mergeProgress(a, a), a)).toBe(true);
  });

  it('does not duplicate old history entries that have no id', () => {
    const old = entry(undefined, '2026-04-01');
    const m = mergeProgress({...base(), history: [old]}, {...base(), history: [{...old}]});
    expect(m.history).toHaveLength(1);
  });

  it('joins the sentences both phones saved', () => {
    const a = {...base(), sentences: [sentence('s1', 'I went home.', '2026-05-01T09:00:00.000Z')]};
    const b = {...base(), sentences: [sentence('s2', 'He played football.', '2026-05-02T09:00:00.000Z'), sentence('s1', 'I went home.', '2026-05-01T09:00:00.000Z')]};
    expect(mergeProgress(a, b).sentences.map(s => s.id)).toEqual(['s1', 's2']);
  });
});

describe('streakFromDays', () => {
  it('counts the run that ends on the last active day', () => {
    const s = streakFromDays(['2026-03-28', '2026-03-29', '2026-03-30', '2026-03-25']);
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
    expect(s.lastActive).toBe('2026-03-30');
  });
  it('handles no days and a floor for longest', () => {
    expect(streakFromDays([])).toEqual({current: 0, longest: 0, lastActive: null, activeDays: []});
    expect(streakFromDays(['2026-12-31', '2027-01-01'], 7).longest).toBe(7);
    expect(streakFromDays(['2026-12-31', '2027-01-01']).current).toBe(2);
  });
});
