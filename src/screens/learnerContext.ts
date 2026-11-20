import {useOutletContext} from 'react-router';
import type {Learner, Track} from '../content/types';

export interface LearnerCtx {
  learner: Learner;
  track: Track;
  today: string;
}

/** The learner of the current #/learn/:learnerId route (set by LearnerLayout). */
export function useLearner(): LearnerCtx {
  return useOutletContext<LearnerCtx>();
}
