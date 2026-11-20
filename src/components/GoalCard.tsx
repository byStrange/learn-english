import {ProgressBar} from '@curialy/ui/ProgressBar';
import type {Track} from '../content/types';
import type {LearnerProgress} from '../state/model';
import {goalProgress} from '../state/selectors';

/** Group 2's goal with two meters. Shown on the learner home, lesson intro and finish screen. */
export function GoalCard({track, progress, compact = false}: {track: Track; progress: LearnerProgress; compact?: boolean}) {
  const g = goalProgress(track, progress);
  return (
    <section className={`goal-card${compact ? ' is-compact' : ''}`} aria-labelledby={`goal-${progress.learnerId}`}>
      <h2 className="goal-title" id={`goal-${progress.learnerId}`}>
        <span className="goal-kicker">Our goal:</span> {track.goal.title}
      </h2>
      {compact ? null : <p className="goal-desc">{track.goal.description}</p>}
      <div className="goal-meters">
        <ProgressBar label="Words I know" value={g.words} max={g.wordsTarget} hasValueLabel formatValueLabel={(v: number, max: number) => `${v} of ${max}`} />
        <ProgressBar
          label="Sentences I can say"
          value={g.sentences}
          max={g.sentencesTarget}
          hasValueLabel
          formatValueLabel={(v: number, max: number) => `${v} of ${max}`}
        />
      </div>
    </section>
  );
}
