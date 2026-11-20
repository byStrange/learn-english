import type {ComponentType} from 'react';
import type {Exercise} from '../content/types';
import type {ExerciseProps} from './types';
import {ListenPick, ListenType, PickWord, VerbForm} from './WordTasks';
import {BuildSentence, FillGap, ListenSentence} from './SentenceTasks';
import {Flashcard} from './CardTasks';

/** One component per exercise type. Add a new type here and in content/types.ts. */
export const exerciseRegistry: {[K in Exercise['type']]: ComponentType<ExerciseProps<Extract<Exercise, {type: K}>>>} = {
  'pick-word': PickWord,
  'listen-pick': ListenPick,
  'listen-type': ListenType,
  'verb-form': VerbForm,
  'build-sentence': BuildSentence,
  'fill-gap': FillGap,
  'listen-sentence': ListenSentence,
  flashcard: Flashcard,
};

/** Self-graded types have their own buttons and no Check step. */
export const SELF_GRADED: ReadonlySet<Exercise['type']> = new Set(['flashcard']);
