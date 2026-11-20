import {useState} from 'react';
import {useNavigate} from 'react-router';
import {Button} from '@curialy/ui/Button';
import {SegmentedControl, SegmentedControlItem} from '@curialy/ui/SegmentedControl';
import type {HintLang} from '../content/types';
import {formatDay, weekday} from '../lib/dates';
import {useProgress} from '../state/ProgressContext';
import {logout} from '../state/auth';
import {SyncStatusLine} from '../components/SyncStatusLine';
import {comfortableCount, lessonsDone, streakNow, weekCalendar} from '../state/selectors';
import {useLearner} from './learnerContext';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** #/learn/:id/me — calendar, totals, hint language, sync status and Log out. */
export function Me() {
  const {learner, track, today} = useLearner();
  const {get, setHint, flush} = useProgress();
  const navigate = useNavigate();
  const p = get(learner.id);
  const [leaving, setLeaving] = useState(false);
  const {done, total} = lessonsDone(track, p);
  const weeks = weekCalendar(p, today);
  const activeCount = weeks.flat().filter(d => d.active).length;

  const leave = async () => {
    setLeaving(true);
    // Send anything not yet on the server before the session ends.
    await Promise.race([flush(), new Promise(res => setTimeout(res, 3000))]);
    await logout('learner');
    navigate('/', {replace: true});
  };

  return (
    <main className="screen tab-screen" id="main">
      <header className="screen-head">
        <h1 className="screen-title">{learner.nickname ?? learner.name}</h1>
        <span className="muted">{track.name}</span>
      </header>

      <section className="me-section" aria-labelledby="stats-title">
        <h2 className="section-title" id="stats-title">
          My progress
        </h2>
        <dl className="stat-grid">
          <div className="stat">
            <dt>Streak now</dt>
            <dd>{streakNow(p, today)} days</dd>
          </div>
          <div className="stat">
            <dt>Longest streak</dt>
            <dd>{p.streak.longest} days</dd>
          </div>
          <div className="stat">
            <dt>Lessons done</dt>
            <dd>
              {done} of {total}
            </dd>
          </div>
          <div className="stat">
            <dt>Comfortable words</dt>
            <dd>{comfortableCount(p)}</dd>
          </div>
          <div className="stat">
            <dt>Points</dt>
            <dd>{p.xp}</dd>
          </div>
        </dl>
      </section>

      <section className="me-section" aria-labelledby="cal-title">
        <h2 className="section-title" id="cal-title">
          Last 5 weeks
        </h2>
        <p className="muted">
          {activeCount} active {activeCount === 1 ? 'day' : 'days'}. Orange days are days you practised.
        </p>
        <div className="calendar" role="table" aria-label="Practice calendar, last 5 weeks">
          <div role="row" style={{display: 'contents'}}>
            {DAY_NAMES.map(d => (
              <span key={d} role="columnheader" className="cal-head">
                {d}
              </span>
            ))}
          </div>
          {weeks.map(week => (
            <div role="row" key={week[0].day} style={{display: 'contents'}}>
              {week.map(d => (
                <span
                  key={d.day}
                  role="cell"
                  className={`cal-day${d.active ? ' is-active' : ''}${d.isToday ? ' is-today' : ''}${d.isFuture ? ' is-future' : ''}`}
                >
                  <span className="cal-num" aria-hidden="true">
                    {Number(d.day.slice(8))}
                  </span>
                  <span className="visually-hidden">
                    {DAY_NAMES[weekday(d.day)]} {formatDay(d.day)}: {d.isFuture ? 'not yet' : d.active ? 'practised' : 'no practice'}
                    {d.isToday ? ' (today)' : ''}
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="me-section" aria-labelledby="hint-title">
        <h2 className="section-title" id="hint-title">
          Help words
        </h2>
        <SegmentedControl label="Show help words in" value={p.settings.hint} onChange={v => setHint(learner.id, v as HintLang)} layout="fill" size="lg">
          <SegmentedControlItem value="uz" label="Uzbek" />
          <SegmentedControlItem value="ar" label="Arabic" />
          <SegmentedControlItem value="none" label="None" />
        </SegmentedControl>
      </section>

      <section className="me-section" aria-labelledby="account-title">
        <h2 className="section-title" id="account-title">
          My account
        </h2>
        <p>Signed in as {learner.name}.</p>
        <SyncStatusLine />
        <p className="note">Your progress is saved on the server, so it is safe if this phone is lost, and your teacher can see it.</p>
        <Button label="Log out" variant="secondary" size="lg" width="100%" isLoading={leaving} onClick={() => void leave()} />
      </section>
    </main>
  );
}
