import {startTransition, useRef, useState} from 'react';
import {useNavigate} from 'react-router';
import {Button} from '@curialy/ui/Button';
import {Badge} from '@curialy/ui/Badge';
import {ProgressBar} from '@curialy/ui/ProgressBar';
import {BottomSheet} from '@curialy/ui/BottomSheet';
import {CheckCircleIcon, XCircleIcon, XMarkIcon} from '@heroicons/react/24/solid';
import type {Exercise, HintLang, Track} from '../content/types';
import {answer, currentIndex, isFinished, MAX_ATTEMPTS, progressOf, summarize, type SessionSummary, type Task} from '../lib/session';
import {hashString} from '../lib/reviewTasks';
import {StreakChip} from '../components/StreakChip';
import {exerciseRegistry, SELF_GRADED} from '../exercises/registry';
import {correctText, instructionFor, type Choice} from '../exercises/options';
import type {ExerciseProps, Pending} from '../exercises/types';
import {FormulaStep} from '../exercises/CardTasks';

interface Props {
  track: Track;
  learnerId: string;
  hintLang: HintLang;
  initialQueue: Task[];
  pool: string[];
  streak: number;
  /** Where "Leave" goes. */
  exitTo: string;
  onFinish: (summary: SessionSummary, seconds: number) => void;
}

interface Feedback {
  correct: boolean;
  given: string;
  /** The answer was shown after the last allowed try. */
  helped: boolean;
}

/** Renders the right component for an exercise (a lookup, not a nested component). */
function ExerciseView(props: ExerciseProps) {
  const Comp = exerciseRegistry[props.exercise.type] as (p: ExerciseProps<Exercise>) => React.ReactNode;
  return <Comp {...props} />;
}

export type {Choice};

/** The lesson / review loop: task → Check → feedback → Continue, until every task is done. */
export function SessionPlayer({track, learnerId, hintLang, initialQueue, pool, streak, exitTo, onFinish}: Props) {
  const navigate = useNavigate();
  const [queue, setQueue] = useState(initialQueue);
  const [pending, setPending] = useState<Pending | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const started = useRef(Date.now());
  const leaveRef = useRef<HTMLButtonElement>(null);

  const index = currentIndex(queue);
  const task = index >= 0 ? queue[index] : null;
  const {done, total} = progressOf(queue);
  const kids = track.mode === 'kids';

  const advance = (correct: boolean) => {
    const next = answer(queue, index, correct);
    startTransition(() => {
      setQueue(next);
      setPending(null);
      setFeedback(null);
    });
    if (isFinished(next)) {
      onFinish(summarize(next), Math.round((Date.now() - started.current) / 1000));
    }
  };

  const check = () => {
    if (!task || !pending) return;
    const helped = !pending.correct && task.attempts + 1 >= MAX_ATTEMPTS;
    setFeedback({correct: pending.correct, given: pending.given, helped});
  };

  if (!task) return null;
  const ex = task.exercise;
  const selfGraded = ex.type !== 'formula' && SELF_GRADED.has(ex.type);
  const isRetry = task.attempts > 0;

  return (
    <div className="player">
      <header className="player-top">
        <button ref={leaveRef} type="button" className="icon-btn" aria-label="Leave lesson" onClick={() => setLeaveOpen(true)}>
          <XMarkIcon aria-hidden="true" />
        </button>
        <div className="player-progress">
          <ProgressBar label={`Task ${Math.min(done + 1, total)} of ${total}`} isLabelHidden value={done} max={total} variant="accent" />
        </div>
        <StreakChip count={streak} compact />
      </header>

      <main className="player-main" id="main">
        <div className="task-head">
          {task.isReview ? <Badge variant="orange" label="Review" /> : null}
          {isRetry ? <Badge variant="neutral" label="Try again" /> : null}
        </div>
        <h1 className={`task-title${kids ? ' is-kids' : ''}`}>{instructionFor(ex, kids)}</h1>
        {ex.type === 'formula' ? (
          <FormulaStep card={ex.card} rate={track.speechRate} />
        ) : (
          <ExerciseView
            key={`${task.key}:${task.attempts}`}
            exercise={ex}
            track={track}
            hintLang={hintLang}
            pool={pool}
            seed={hashString(`${learnerId}:${task.key}:${task.attempts}`)}
            locked={feedback !== null}
            autoPlay
            onPending={setPending}
            onCommit={correct => advance(correct)}
          />
        )}
      </main>

      {selfGraded ? null : (
        <footer className={`player-actions${feedback ? (feedback.correct ? ' is-right' : ' is-wrong') : ''}`}>
          <div className="feedback" role="status" aria-live="polite">
            {feedback ? (
              <div className="feedback-panel">
                {feedback.correct ? <CheckCircleIcon className="feedback-icon" aria-hidden="true" /> : <XCircleIcon className="feedback-icon" aria-hidden="true" />}
                <div>
                  <p className="feedback-title">{feedback.correct ? 'Correct!' : `Not quite — the answer is “${correctText(ex)}”`}</p>
                  {!feedback.correct ? (
                    <p className="feedback-sub">{feedback.helped ? "We'll practise this one again soon." : 'It will come back in a moment.'}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
          {ex.type === 'formula' ? (
            <Button label="Got it" variant="primary" size="lg" width="100%" onClick={() => advance(true)} />
          ) : feedback ? (
            <Button label="Continue" variant="primary" size="lg" width="100%" onClick={() => advance(feedback.correct)} />
          ) : (
            <>
              <Button label="Check" variant="primary" size="lg" width="100%" isDisabled={!pending} onClick={check} />
              {!pending ? <p className="action-help">{ex.type === 'build-sentence' ? 'Tap the words to build the sentence' : ex.type === 'listen-type' ? 'Type an answer' : 'Pick an answer'}</p> : null}
            </>
          )}
        </footer>
      )}

      <BottomSheet label="Leave the lesson?" isOpen={leaveOpen} onOpenChange={setLeaveOpen} purpose="required" finalFocusRef={leaveRef}>
        <div className="sheet-body">
          <h2 className="sheet-title">Leave the lesson?</h2>
          <p>Your progress in this lesson won't be saved.</p>
          <div className="sheet-actions">
            <Button label="Keep learning" variant="primary" size="lg" width="100%" onClick={() => setLeaveOpen(false)} />
            <Button label="Leave lesson" variant="secondary" size="lg" width="100%" onClick={() => navigate(exitTo)} />
          </div>
        </div>
      </BottomSheet>
    </div>
  );
}
