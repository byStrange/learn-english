import type {Track} from './types';
import {g1Units} from './g1/units';
import {g2Units} from './g2/units';

export const g1: Track = {
  id: 'g1',
  name: 'Group 1',
  shortName: 'Group 1',
  description: 'Core English, step by step: present simple, past simple, V1 · V2 · V3.',
  learners: [
    {id: 'abdulloh', name: 'Abdulloh', age: 10},
    // Age not known yet — ask the teacher.
    {id: 'said-umar', name: 'Said Umar'},
  ],
  mode: 'standard',
  goal: {
    title: 'Use present simple and past simple with confidence',
    description: 'Make S + V + O sentences in present and past, and know 24 irregular verbs in all three forms.',
    targets: {words: 120, sentences: 14},
  },
  units: g1Units,
  dailyGoal: {lessons: 1},
  sessionReviewCap: 6,
  reviewSessionCap: 10,
  speechRate: 0.9,
};

export const g2: Track = {
  id: 'g2',
  name: 'Group 2 · Kids',
  shortName: 'Group 2',
  description: 'Short, colourful lessons with big buttons: about 3 minutes each.',
  learners: [
    {id: 'said-ali', name: 'Said Ali', nickname: 'Alixon', age: 8},
    {id: 'said-amir', name: 'Said Amir', nickname: 'Amirxon', age: 12},
  ],
  mode: 'kids',
  goal: {
    title: 'Tell about my day — and about yesterday',
    description:
      'By week 12: say 5 sentences in present simple about my day and 5 in past simple about yesterday, and know 200 everyday words by ear.',
    targets: {words: 200, sentences: 10},
  },
  units: g2Units,
  dailyGoal: {lessons: 1},
  sessionReviewCap: 3,
  reviewSessionCap: 5,
  speechRate: 0.8,
};

export const tracks: Track[] = [g1, g2];
