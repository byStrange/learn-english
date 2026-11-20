import {act, render, screen} from '@testing-library/react';
import {ProgressProvider, useProgress, type ProgressApi} from './ProgressContext';
import {KEYS, _resetStorageForTests} from './storage';
import {getLearner} from '../content/index';
import {answer, buildQueue, isFinished, summarize} from '../lib/session';
import type {SessionInput} from './model';

let api: ProgressApi | null = null;

function Probe({id}: {id: string}) {
  api = useProgress();
  const p = api.get(id);
  const done = Object.keys(p.completed).length;
  return (
    <p data-testid="probe">
      {id}: streak {p.streak.current}, xp {p.xp}, done {done}
    </p>
  );
}

const mount = (id = 'abdulloh') =>
  render(
    <ProgressProvider>
      <Probe id={id} />
    </ProgressProvider>,
  );

/** The first Group 1 lesson, every task answered right on the first try. */
function perfectFirstLesson(): SessionInput {
  const {track} = getLearner('abdulloh')!;
  const lesson = track.units[0].lessons[0];
  let q = buildQueue(lesson, []);
  for (let guard = 0; !isFinished(q) && guard < 100; guard++) {
    const i = q.findIndex(t => t.status === 'todo');
    q = answer(q, i, true);
  }
  return {kind: 'lesson', lesson, summary: summarize(q), seconds: 300};
}

const stored = (id: string) => {
  const raw = localStorage.getItem(KEYS.learner(id));
  return raw ? JSON.parse(raw) : null;
};

beforeEach(() => {
  localStorage.clear();
  _resetStorageForTests();
  api = null;
});

describe('progress store', () => {
  it('saves a finished lesson for that learner only', () => {
    mount();
    act(() => {
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-01');
    });
    const saved = stored('abdulloh');
    expect(saved.streak.current).toBe(1);
    expect(saved.xp).toBeGreaterThan(0);
    expect(saved.completed['g1-qc-1']).toBeTruthy();
    expect(Object.keys(saved.items).length).toBeGreaterThan(0);
    expect(screen.getByTestId('probe').textContent).toBe(`abdulloh: streak 1, xp ${saved.xp}, done 1`);

    // The other boys are not touched.
    for (const other of ['said-umar', 'said-ali', 'said-amir']) {
      const o = stored(other);
      expect(o === null || (o.xp === 0 && o.streak.current === 0)).toBe(true);
    }
  });

  it('reads the same values back after a reload', () => {
    const first = mount();
    act(() => {
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-01');
    });
    const before = screen.getByTestId('probe').textContent;
    first.unmount();

    mount();
    expect(screen.getByTestId('probe').textContent).toBe(before);
    expect(api!.get('said-ali').xp).toBe(0);
  });

  it('counts the next day as a 2-day streak, and the same day only once', () => {
    mount();
    act(() => {
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-01');
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-01');
    });
    expect(stored('abdulloh').streak.current).toBe(1);
    act(() => {
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-02');
    });
    expect(stored('abdulloh').streak.current).toBe(2);
    expect(stored('abdulloh').completed['g1-qc-1'].times).toBe(3);
  });

  it('does not crash on broken saved data, and starts fresh', () => {
    localStorage.setItem(KEYS.learner('abdulloh'), '{not json');
    mount();
    expect(screen.getByTestId('probe').textContent).toBe('abdulloh: streak 0, xp 0, done 0');
    act(() => {
      api!.completeSession('abdulloh', perfectFirstLesson(), '2026-05-01');
    });
    expect(stored('abdulloh').streak.current).toBe(1);
  });

  it('grades a flashcard into the review schedule', () => {
    mount();
    act(() => {
      api!.gradeFlashcard('said-ali', 'w-apple', false, '2026-05-01');
    });
    const item = stored('said-ali').items['w-apple'];
    expect(item.wrong).toBe(1);
    expect(item.due).toBe('2026-05-01');
  });
});
