import {useState} from 'react';
import {Navigate} from 'react-router';
import {Button} from '@curialy/ui/Button';
import {ClockIcon, ArrowLeftIcon} from '@heroicons/react/24/solid';
import {getItem, getLesson, unitOfLesson} from '../content/index';
import {buildQueue, type SessionSummary, type Task} from '../lib/session';
import {reviewExercisesFor} from '../lib/reviewTasks';
import {prefetch, primeAudio} from '../lib/speech';
import {spokenForExercises} from '../content/spoken';
import {useProgress} from '../state/ProgressContext';
import {distractorPool, lessonStatus, previousLesson, streakNow} from '../state/selectors';
import type {LearnerProgress} from '../state/model';
import {FormulaRows} from '../components/Formula';
import {GoalCard} from '../components/GoalCard';
import {StreakChip} from '../components/StreakChip';
import {SessionPlayer} from './SessionPlayer';
import {FinishScreen} from './FinishScreen';
import {useLearner} from './learnerContext';
import {useParams} from 'react-router';

interface Result {
  summary: SessionSummary;
  before: LearnerProgress;
  after: LearnerProgress;
}

export function LessonPlayer() {
  const {learner, track, today} = useLearner();
  const {lessonId} = useParams();
  const {get, completeSession} = useProgress();
  const progress = get(learner.id);
  const lesson = getLesson(track, lessonId);
  const [queue, setQueue] = useState<Task[] | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const base = `/learn/${learner.id}`;

  if (!lesson) return <Navigate to={base} replace />;
  const status = lessonStatus(track, progress, lesson.id);
  if (status === 'locked' || status === 'coming-soon') {
    const prev = previousLesson(track, lesson.id);
    return (
      <main className="screen center-screen" id="main">
        <h1 className="screen-title">{lesson.title} is locked</h1>
        <p>{prev ? `Finish “${prev.title}” first.` : 'This lesson is not ready yet.'}</p>
        <Button label="Back to my path" variant="primary" size="lg" href={base} />
      </main>
    );
  }

  if (result) {
    return <FinishScreen track={track} learner={learner} today={today} kind="lesson" lesson={lesson} summary={result.summary} before={result.before} after={result.after} />;
  }

  if (queue) {
    return (
      <SessionPlayer
        track={track}
        learnerId={learner.id}
        hintLang={progress.settings.hint}
        initialQueue={queue}
        pool={distractorPool(track, progress, lesson)}
        streak={streakNow(progress, today)}
        exitTo={base}
        onFinish={(summary, seconds) => {
          const before = get(learner.id);
          const after = completeSession(learner.id, {kind: 'lesson', lesson, summary, seconds}, today);
          setResult({summary, before, after});
        }}
      />
    );
  }

  const reviews = reviewExercisesFor(track, progress.items, today, track.sessionReviewCap);
  const unit = unitOfLesson(track, lesson.id);
  const start = () => {
    primeAudio();
    void prefetch(spokenForExercises([...reviews, ...lesson.exercises], getItem));
    setQueue(buildQueue(lesson, reviews));
  };
  const taskCount = reviews.length + lesson.exercises.length + (lesson.formula ? 1 : 0);

  return (
    <div className="screen lesson-intro">
      <header className="intro-top">
        <Button label="Back to my path" variant="ghost" icon={<ArrowLeftIcon aria-hidden="true" />} href={base} />
        <StreakChip count={streakNow(progress, today)} />
      </header>
      <main className="intro-main" id="main">
        {unit ? <p className={`unit-tag role-tag-${unit.role}`}>{unit.title}</p> : null}
        <h1 className="screen-title">{lesson.title}</h1>
        <p className="intro-meta">
          <ClockIcon aria-hidden="true" className="inline-icon" /> About {lesson.minutes} minutes · {taskCount} tasks
          {reviews.length > 0 ? ` · ${reviews.length} review` : ''}
        </p>
        {lesson.formula ? (
          <section className="intro-formula" aria-label="Today's formula">
            <FormulaRows card={lesson.formula} />
          </section>
        ) : null}
        {track.mode === 'kids' ? <GoalCard track={track} progress={progress} compact /> : null}
      </main>
      <footer className="intro-actions">
        <Button label={status === 'done' ? 'Practise again' : 'Start lesson'} variant="primary" size="lg" width="100%" onClick={start} />
      </footer>
    </div>
  );
}
