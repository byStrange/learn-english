import {useEffect, useState} from 'react';
import {Button} from '@curialy/ui/Button';
import {FireIcon} from '@heroicons/react/24/solid';
import type {Learner, Lesson, Track} from '../content/types';
import {getItem, hintText} from '../content/index';
import type {SessionSummary} from '../lib/session';
import {xpFor} from '../lib/xp';
import type {LearnerProgress} from '../state/model';
import {dueCount, streakNow} from '../state/selectors';
import {prefersReducedMotion} from '../lib/viewTransition';
import {Picture} from '../components/Picture';
import {GoalCard} from '../components/GoalCard';

interface Props {
  track: Track;
  learner: Learner;
  today: string;
  kind: 'lesson' | 'review';
  lesson?: Lesson;
  summary: SessionSummary;
  before: LearnerProgress;
  after: LearnerProgress;
}

/** Counts from `from` to `to` once over 800 ms; reduced motion shows the end number. */
function useCountUp(from: number, to: number): number {
  const [value, setValue] = useState(() => (prefersReducedMotion() ? to : from));
  useEffect(() => {
    if (prefersReducedMotion() || from === to) {
      setValue(to);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 800);
      const eased = 1 - Math.pow(1 - k, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [from, to]);
  return value;
}

export function FinishScreen({track, learner, today, kind, lesson, summary, before, after}: Props) {
  const base = `/learn/${learner.id}`;
  const streakBefore = streakNow(before, today);
  const streakAfter = streakNow(after, today);
  const shown = useCountUp(streakBefore, streakAfter);
  const xp = xpFor(kind, summary);
  const due = dueCount(after, today);
  const newWords = (lesson?.newItems ?? []).map(id => getItem(id)).filter(x => x !== undefined).slice(0, 6);
  const practise = summary.mistakes.map(id => getItem(id)).filter(x => x !== undefined);
  const hint = after.settings.hint;
  const kids = track.mode === 'kids';

  return (
    <div className="screen finish">
      <main className="finish-main" id="main">
        <h1 className="screen-title">{kind === 'lesson' ? `${lesson?.title ?? 'Lesson'} done!` : 'Review done!'}</h1>

        <section className="finish-streak" aria-label="Streak">
          <FireIcon className="finish-flame" aria-hidden="true" />
          <p className="finish-streak-num" aria-hidden="true">
            {shown}
          </p>
          <p className="finish-streak-text">
            <span className="visually-hidden">{streakAfter} </span>day streak
          </p>
          {streakAfter > streakBefore ? <p className="finish-streak-note">{streakAfter === 1 ? 'Your streak has started.' : 'One more day — well done.'}</p> : null}
        </section>

        <dl className="finish-stats">
          <div>
            <dt>XP earned</dt>
            <dd>+{xp}</dd>
          </div>
          <div>
            <dt>Right first time</dt>
            <dd>{summary.accuracy}%</dd>
          </div>
          <div>
            <dt>Total XP</dt>
            <dd>{after.xp}</dd>
          </div>
        </dl>

        {newWords.length > 0 ? (
          <section className="finish-words" aria-labelledby="new-words">
            <h2 id="new-words" className="section-title">
              New words
            </h2>
            <ul className="card-fan">
              {newWords.map((w, i) => (
                <li key={w.id} className={`fan-card role-card-${w.role ?? 'object'}`} style={{'--i': i, '--n': newWords.length} as React.CSSProperties}>
                  <Picture value={w.picture} label="" size="sm" />
                  <span className="fan-word">{w.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {practise.length > 0 ? (
          <section className="finish-practise" aria-labelledby="again">
            <h2 id="again" className="section-title">
              Words to practise again
            </h2>
            <ul className="chip-list">
              {practise.map(w => (
                <li key={w.id} className="word-chip">
                  {w.text}
                  {hintText(w, hint) ? <span className="word-chip-hint"> · {hintText(w, hint)}</span> : null}
                </li>
              ))}
            </ul>
            <p className="muted">They will come back in your next lessons until you know them.</p>
          </section>
        ) : null}

        {kids ? <GoalCard track={track} progress={after} compact /> : null}
      </main>
      <footer className="finish-actions">
        <Button label="Back to my path" variant="primary" size="lg" width="100%" href={base} />
        {due > 0 ? <Button label={`Review now · ${due} due`} variant="secondary" size="lg" width="100%" href={`${base}/review`} /> : null}
      </footer>
    </div>
  );
}
