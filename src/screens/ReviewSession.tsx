import {useState} from 'react';
import {Button} from '@curialy/ui/Button';
import {buildQueue, type SessionSummary, type Task} from '../lib/session';
import {reviewExercisesFor} from '../lib/reviewTasks';
import {primeAudio} from '../lib/speech';
import {useProgress} from '../state/ProgressContext';
import {distractorPool, dueCount, streakNow} from '../state/selectors';
import type {LearnerProgress} from '../state/model';
import {StreakChip} from '../components/StreakChip';
import {SessionPlayer} from './SessionPlayer';
import {FinishScreen} from './FinishScreen';
import {useLearner} from './learnerContext';

/** Only the words that are due today. Also counts for the streak. */
export function ReviewSession() {
  const {learner, track, today} = useLearner();
  const {get, completeSession} = useProgress();
  const progress = get(learner.id);
  const [queue, setQueue] = useState<Task[] | null>(null);
  const [result, setResult] = useState<{summary: SessionSummary; before: LearnerProgress; after: LearnerProgress} | null>(null);
  const base = `/learn/${learner.id}`;

  if (result) {
    return <FinishScreen track={track} learner={learner} today={today} kind="review" summary={result.summary} before={result.before} after={result.after} />;
  }
  if (queue) {
    return (
      <SessionPlayer
        track={track}
        learnerId={learner.id}
        hintLang={progress.settings.hint}
        initialQueue={queue}
        pool={distractorPool(track, progress)}
        streak={streakNow(progress, today)}
        exitTo={base}
        onFinish={(summary, seconds) => {
          const before = get(learner.id);
          const after = completeSession(learner.id, {kind: 'review', summary, seconds}, today);
          setResult({summary, before, after});
        }}
      />
    );
  }

  const due = dueCount(progress, today);
  const exercises = reviewExercisesFor(track, progress.items, today, track.reviewSessionCap);
  return (
    <main className="screen tab-screen" id="main">
      <header className="screen-head">
        <h1 className="screen-title">Review</h1>
        <StreakChip count={streakNow(progress, today)} />
      </header>
      {exercises.length === 0 ? (
        <section className="empty-state">
          <h2 className="section-title">Nothing to review — come back tomorrow</h2>
          <p className="muted">Words come back on their own: after 1 day, 2 days, 4 days, a week, two weeks and a month.</p>
          <Button label="Practise words" variant="primary" size="lg" width="100%" href={`${base}/words`} />
        </section>
      ) : (
        <section className="review-start">
          <p className="review-count">
            <strong>{due}</strong> {due === 1 ? 'word is' : 'words are'} ready to practise again.
          </p>
          <p className="muted">
            This session has {exercises.length} {exercises.length === 1 ? 'task' : 'tasks'}. Words you get right come back later; words you miss come back sooner.
          </p>
          <Button
            label="Start review"
            variant="primary"
            size="lg"
            width="100%"
            onClick={() => {
              primeAudio();
              setQueue(buildQueue(null, exercises));
            }}
          />
        </section>
      )}
    </main>
  );
}
