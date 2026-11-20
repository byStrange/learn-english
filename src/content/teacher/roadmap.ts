import type {TrackId} from '../types';

/** The teacher's 12-week plan per track (PROPOSAL.md section 5). Shown in the teacher panel. */
export interface RoadmapWeek {
  week: number;
  title: string;
  grammar: string;
  vocabTheme: string;
  inClass: string[];
  homeworkLessonIds: string[];
  canDo: string[];
  resources: {title: string; url: string}[];
  /** Already taught in class before the app: run it as a review week. */
  taughtBefore?: boolean;
}
export interface Roadmap {
  trackId: TrackId;
  weeks: RoadmapWeek[];
}

const PEG_PRESENT = {title: 'Perfect English Grammar: present simple', url: 'https://www.perfect-english-grammar.com/present-simple.html'};
const PEG_PAST = {title: 'Perfect English Grammar: past simple', url: 'https://www.perfect-english-grammar.com/past-simple.html'};
const BBC = {title: 'BBC Learning English', url: 'https://www.bbc.co.uk/learningenglish/'};
const CAMBRIDGE = {title: 'Cambridge Dictionary (hear any word)', url: 'https://dictionary.cambridge.org/'};

const w = (
  week: number,
  title: string,
  grammar: string,
  vocabTheme: string,
  homeworkLessonIds: string[],
  canDo: string[],
  resources: RoadmapWeek['resources'] = [],
  taughtBefore = false,
): RoadmapWeek => ({week, title, grammar, vocabTheme, inClass: [`Warm-up: words from the app's "Needs attention" list`, `Teach: ${grammar}`, 'Speak: 3 sentences each about their own life'], homeworkLessonIds, canDo, resources, taughtBefore});

export const roadmaps: Roadmap[] = [
  {
    trackId: 'g1',
    weeks: [
      w(1, 'Quick check + S + V + O', 'S + V + O', 'family, school', ['g1-qc-1', 'g1-f-3'], ['Builds an S + V + O sentence'], [CAMBRIDGE], true),
      w(2, 'Pronouns, am / is / are', 'pronouns, to be', 'feelings, people', ['g1-f-1', 'g1-f-2'], ['Uses am / is / are correctly'], [PEG_PRESENT], true),
      w(3, 'Present simple I / you / we / they', 'present simple', 'breakfast, home', ['g1-ps-1'], ['Says 3 things he does every day'], [PEG_PRESENT], true),
      w(4, 'He / she / it + s, do / does', 'present simple +s, questions', 'home jobs', ['g1-ps-2', 'g1-ps-3'], ['Adds -s for he / she', 'Asks a Do / Does question'], [PEG_PRESENT]),
      w(5, 'Past simple -ed + time words', 'past simple regular', 'yesterday, ago', ['g1-ps-4', 'g1-pr-1', 'g1-pr-2', 'g1-pr-3'], ['Tells 3 things he did yesterday'], [PEG_PAST], true),
      w(6, 'Irregular verbs batch 1–2', 'V1 · V2 · V3', 'everyday actions', ['g1-irr-1', 'g1-irr-2'], ['Knows 16 irregular verbs in 3 forms'], [PEG_PAST], true),
      w(7, 'Irregular batch 3, present vs past', 'V1 · V2 · V3', 'sport, park', ['g1-irr-3'], ['Chooses present or past from the time word'], [BBC]),
      w(8, "Past simple: didn't, Did you…?", 'past negatives and questions', 'weekend', [], ['Asks Did you…? and answers'], [PEG_PAST]),
      w(9, 'Present continuous', 'am / is / are + -ing', 'right now', [], ['Says what people are doing now'], [BBC]),
      w(10, 'Present continuous vs simple', 'now vs every day', 'routines', [], ['Picks the right tense'], [BBC]),
      w(11, 'Future: going to / will', 'future', 'plans', [], ['Says 3 plans for tomorrow'], [BBC]),
      w(12, 'Review + tell a story', 'all tenses', 'my week', [], ['Tells a 6-sentence story about last weekend'], [CAMBRIDGE]),
    ],
  },
  {
    trackId: 'g2',
    weeks: [
      w(1, 'Hello & me', 'I am…', 'colours', ['g2-hm-1'], ['Says "I am…" about himself'], [CAMBRIDGE]),
      w(2, 'Numbers and my family', 'This is my…', 'numbers, family', ['g2-hm-2', 'g2-hm-3'], ['Counts to 10', 'Names 5 family members']),
      w(3, 'My day: morning', 'I + V1', 'morning, breakfast', ['g2-day-1', 'g2-day-2'], ['Says 2 sentences about his morning']),
      w(4, 'My day: you / we', 'I / you / we + V1', 'school, play', ['g2-day-3'], ['Says 3 sentences about his day']),
      w(5, 'He and she + s', 'he / she + V1 + s', 'pets, football', ['g2-hs-1'], ['Adds -s for he / she']),
      w(6, 'He and she: food and school', 'he / she + s', 'food, school', ['g2-hs-2', 'g2-hs-3'], ['Tells about his brother']),
      w(7, 'Yesterday: -ed', 'past simple -ed', 'yesterday', ['g2-y-1', 'g2-y-2'], ['Says 2 things he did yesterday']),
      w(8, 'Yesterday: was / were', 'was / were', 'feelings', [], ['Says how he was yesterday']),
      w(9, 'Yesterday: went, ate, saw', 'irregular past', 'places', [], ['Uses went, ate, saw']),
      w(10, 'My week', 'days of the week', 'days', [], ['Names the days of the week']),
      w(11, 'Questions', 'Do you…? Did you…?', 'friends', [], ['Asks a friend 2 questions']),
      w(12, 'Goal week', 'present + past', 'my day', [], ['5 sentences about my day', '5 sentences about yesterday']),
    ],
  },
];
