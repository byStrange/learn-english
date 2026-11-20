import {Link} from 'react-router';
import {Button} from '@curialy/ui/Button';
import {ProgressBar} from '@curialy/ui/ProgressBar';
import {CheckIcon, LockClosedIcon, PlayIcon} from '@heroicons/react/24/solid';
import type {Lesson} from '../content/types';
import {isAtRisk} from '../lib/streak';
import {useProgress} from '../state/ProgressContext';
import {dueCount, lessonStatuses, lessonsToday, nextLesson, streakNow, todayGoalDone, type LessonStatus} from '../state/selectors';
import {StreakChip} from '../components/StreakChip';
import {GoalCard} from '../components/GoalCard';
import {useLearner} from './learnerContext';

const ROLE_NAME = {subject: 'Who', verb: 'Action', object: 'What', time: 'When'} as const;

function PathNode({lesson, status, prev, href}: {lesson: Lesson; status: LessonStatus; prev?: Lesson; href: string}) {
  const icon = status === 'done' ? <CheckIcon aria-hidden="true" /> : status === 'current' ? <PlayIcon aria-hidden="true" /> : <LockClosedIcon aria-hidden="true" />;
  const label = (
    <>
      <span className="path-dot">{icon}</span>
      <span className="path-label">
        <span className="path-title">{lesson.title}</span>
        <span className="path-state">
          {status === 'done' ? 'Done · play again' : status === 'current' ? `Next · about ${lesson.minutes} min` : `Finish "${prev?.title ?? 'the lesson before'}" first`}
        </span>
      </span>
    </>
  );
  if (status === 'locked') {
    return (
      <div className="path-node is-locked" aria-disabled="true">
        {label}
      </div>
    );
  }
  return (
    <Link className={`path-node is-${status}`} to={href} aria-current={status === 'current' ? 'step' : undefined} viewTransition>
      {label}
    </Link>
  );
}

/** #/learn/:id — streak, today's goal, ONE "Continue" action, then the path. */
export function LearnerHome() {
  const {learner, track, today} = useLearner();
  const {get} = useProgress();
  const p = get(learner.id);
  const base = `/learn/${learner.id}`;
  const streak = streakNow(p, today);
  const atRisk = isAtRisk(p.streak, today);
  const due = dueCount(p, today);
  const {lesson: next, allDone} = nextLesson(track, p);
  const statuses = lessonStatuses(track, p);
  const doneToday = Math.min(lessonsToday(p, today), track.dailyGoal.lessons);
  const goalDone = todayGoalDone(track, p, today);
  const kids = track.mode === 'kids';
  let prev: Lesson | undefined;

  return (
    <main className="screen tab-screen" id="main">
      <header className="learner-top">
        <div className="screen-head">
          <h1 className="screen-title">Hi, {learner.nickname ?? learner.name}</h1>
          <StreakChip count={streak} active={p.streak.lastActive === today} />
        </div>
        {atRisk ? <p className="streak-risk">Do a lesson today to keep your streak.</p> : null}
        <div className="today-goal">
          <ProgressBar
            label="Today's goal"
            value={doneToday}
            max={track.dailyGoal.lessons}
            variant={goalDone ? 'success' : 'accent'}
            hasValueLabel
            formatValueLabel={(v: number, max: number) => `${v} of ${max} lesson${max === 1 ? '' : 's'}`}
          />
          <p className="today-goal-text">{goalDone ? 'Goal done for today. Well done!' : 'One lesson keeps your streak going.'}</p>
        </div>
      </header>

      {kids ? <GoalCard track={track} progress={p} /> : null}

      <div className="home-actions">
        <Button
          label={allDone ? `Practise again: ${next.title}` : `Continue: ${next.title}`}
          variant="primary"
          size="lg"
          width="100%"
          href={`${base}/lesson/${next.id}`}
        />
        {due > 0 ? <Button label={`Review · ${due} due`} variant="secondary" size="lg" width="100%" href={`${base}/review`} /> : null}
      </div>

      <section className="path" aria-labelledby="path-title">
        <h2 className="section-title" id="path-title">
          My path
        </h2>
        {track.units.map(unit => {
          const soon = unit.status === 'coming-soon' || unit.lessons.length === 0;
          if (soon) {
            return (
              <div key={unit.id} className="path-unit coming-soon">
                <div className="path-unit-head">
                  <span className="unit-tag">Coming soon</span>
                  <h3 className="section-title">{unit.title}</h3>
                </div>
              </div>
            );
          }
          const done = unit.lessons.filter(l => p.completed[l.id]).length;
          return (
            <div key={unit.id} className={`path-unit role-${unit.role}`}>
              <div className="path-unit-head">
                <span className={`unit-tag role-tag-${unit.role}`}>
                  {ROLE_NAME[unit.role]} · {done} of {unit.lessons.length} done
                </span>
                <h3 className="section-title">{unit.title}</h3>
                {unit.description ? <p className="muted">{unit.description}</p> : null}
              </div>
              <ol className="path-list">
                {unit.lessons.map(lesson => {
                  const before = prev;
                  prev = lesson;
                  return (
                    <li key={lesson.id}>
                      <PathNode lesson={lesson} status={statuses.get(lesson.id) ?? 'locked'} prev={before} href={`${base}/lesson/${lesson.id}`} />
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
      </section>
    </main>
  );
}

