import type {TrackId} from './types';

/**
 * Extra facts the Tenses lab needs about the shared words and verbs: which
 * objects a verb can take, how a word sounds as an object ("an apple",
 * "to school"), and whether a time word is past or present. Kept here as a
 * patch map, so words.ts and verbs.ts stay as they are.
 */
export type WordTag =
  | 'food'
  | 'meal'
  | 'drink'
  | 'sport'
  | 'toy'
  | 'media'
  | 'reading'
  | 'work'
  | 'place'
  | 'chore'
  | 'body'
  | 'person'
  | 'animal'
  | 'thing'
  | 'vehicle';

export type TimeOf = 'present' | 'past' | 'any';

export interface LabObject {
  /** Word id in words.ts. */
  id: string;
  tags: WordTag[];
  /** How it is said after a verb. Default: the word itself. */
  asObject?: string;
}

export interface LabVerb {
  /** Verb id in verbs.ts. */
  id: string;
  takes?: WordTag[];
  /** Makes sense without an object ("I sleep", "We run"). */
  noObject?: true;
  /** Overrides the he/she/it form when the spelling rule doesn't fit. */
  s?: string;
}

export interface LabTime {
  id: string;
  timeOf: TimeOf;
  /** Frequency adverbs go between the subject and the verb: "I usually eat". */
  mid?: true;
}

export const LAB_OBJECTS: LabObject[] = [
  {id: 'w-breakfast', tags: ['food', 'meal']},
  {id: 'w-lunch', tags: ['food', 'meal']},
  {id: 'w-dinner', tags: ['food', 'meal']},
  {id: 'w-bread', tags: ['food']},
  {id: 'w-egg', tags: ['food', 'meal'], asObject: 'an egg'},
  {id: 'w-rice', tags: ['food', 'meal']},
  {id: 'w-apple', tags: ['food'], asObject: 'an apple'},
  {id: 'w-banana', tags: ['food'], asObject: 'a banana'},
  {id: 'w-milk', tags: ['drink']},
  {id: 'w-tea', tags: ['drink']},
  {id: 'w-juice', tags: ['drink']},
  {id: 'w-water', tags: ['drink']},
  {id: 'w-football', tags: ['sport', 'media']},
  {id: 'w-ball', tags: ['toy', 'thing'], asObject: 'a ball'},
  {id: 'w-basketball', tags: ['sport']},
  {id: 'w-tv', tags: ['media']},
  {id: 'w-cartoons', tags: ['media']},
  {id: 'w-story', tags: ['reading'], asObject: 'a story'},
  {id: 'w-letter', tags: ['reading'], asObject: 'a letter'},
  {id: 'w-dishes', tags: ['work', 'chore'], asObject: 'the dishes'},
  {id: 'w-exercises', tags: ['work'], asObject: 'my exercises'},
  {id: 'w-hair', tags: ['body'], asObject: 'my hair'},
  {id: 'w-horse', tags: ['vehicle'], asObject: 'a horse'},
  {id: 'w-book', tags: ['reading', 'thing'], asObject: 'a book'},
  {id: 'w-homework', tags: ['work', 'reading'], asObject: 'my homework'},
  {id: 'w-school', tags: ['place'], asObject: 'to school'},
  {id: 'w-home', tags: ['place'], asObject: 'home'},
  {id: 'w-park', tags: ['place'], asObject: 'to the park'},
  {id: 'w-shop', tags: ['place'], asObject: 'to the shop'},
  {id: 'w-bed', tags: ['place'], asObject: 'to bed'},
  {id: 'w-room', tags: ['chore'], asObject: 'my room'},
  {id: 'w-car', tags: ['chore', 'vehicle'], asObject: 'the car'},
  {id: 'w-house', tags: ['chore'], asObject: 'the house'},
  {id: 'w-face', tags: ['body'], asObject: 'my face'},
  {id: 'w-teeth', tags: ['body'], asObject: 'my teeth'},
  {id: 'w-bike', tags: ['vehicle', 'thing'], asObject: 'my bike'},
  {id: 'w-pen', tags: ['thing'], asObject: 'a pen'},
  {id: 'w-bag', tags: ['thing'], asObject: 'a bag'},
  {id: 'w-phone', tags: ['thing'], asObject: 'a phone'},
  {id: 'w-cat', tags: ['animal'], asObject: 'cats'},
  {id: 'w-dog', tags: ['animal'], asObject: 'dogs'},
  {id: 'w-mother', tags: ['person'], asObject: 'my mother'},
  {id: 'w-father', tags: ['person'], asObject: 'my father'},
  {id: 'w-grandma', tags: ['person'], asObject: 'my grandma'},
  {id: 'w-grandpa', tags: ['person'], asObject: 'my grandpa'},
  {id: 'w-uncle', tags: ['person'], asObject: 'my uncle'},
  {id: 'w-cousin', tags: ['person'], asObject: 'my cousin'},
  {id: 'w-friend', tags: ['person'], asObject: 'my friend'},
  {id: 'w-teacher', tags: ['person'], asObject: 'my teacher'},
];

export const LAB_VERBS: LabVerb[] = [
  {id: 'v-eat', takes: ['food']},
  {id: 'v-drink', takes: ['drink']},
  {id: 'v-like', takes: ['food', 'drink', 'animal', 'sport']},
  {id: 'v-want', takes: ['food', 'drink', 'thing']},
  {id: 'v-play', takes: ['sport', 'toy']},
  {id: 'v-watch', takes: ['media']},
  {id: 'v-go', takes: ['place']},
  {id: 'v-walk', takes: ['place']},
  {id: 'v-come', takes: ['place']},
  {id: 'v-read', takes: ['reading']},
  {id: 'v-do', takes: ['work']},
  {id: 'v-clean', takes: ['chore']},
  {id: 'v-wash', takes: ['chore', 'body']},
  {id: 'v-brush', takes: ['body']},
  {id: 'v-cook', takes: ['meal']},
  {id: 'v-make', takes: ['meal']},
  {id: 'v-help', takes: ['person']},
  {id: 'v-visit', takes: ['person']},
  {id: 'v-call', takes: ['person']},
  {id: 'v-ride', takes: ['vehicle']},
  {id: 'v-buy', takes: ['food', 'drink', 'thing']},
  {id: 'v-have', takes: ['meal', 'thing', 'animal']},
  {id: 'v-see', takes: ['person', 'animal']},
  {id: 'v-get-up', noObject: true},
  {id: 'v-sleep', noObject: true},
  {id: 'v-run', noObject: true},
  {id: 'v-swim', noObject: true},
];

export const LAB_TIMES: LabTime[] = [
  {id: 'w-every-day', timeOf: 'present'},
  {id: 'w-in-the-morning', timeOf: 'present'},
  {id: 'w-at-night', timeOf: 'present'},
  {id: 'w-after-school', timeOf: 'present'},
  {id: 'w-today', timeOf: 'any'},
  {id: 'w-yesterday', timeOf: 'past'},
  {id: 'w-last-night', timeOf: 'past'},
  {id: 'w-last-week', timeOf: 'past'},
  {id: 'w-two-hours-ago', timeOf: 'past'},
  {id: 'w-usually', timeOf: 'present', mid: true},
  {id: 'w-always', timeOf: 'present', mid: true},
  {id: 'w-sometimes', timeOf: 'present', mid: true},
  {id: 'w-often', timeOf: 'present', mid: true},
  {id: 'w-never', timeOf: 'present', mid: true},
];

/** Subjects that are always there, learned or not. */
export const PRONOUNS = ['I', 'you', 'he', 'she', 'we', 'they'] as const;

/** Family words that become "my mother" etc. as a subject once learned. */
export const FAMILY_SUBJECTS: {id: string; text: string}[] = [
  {id: 'w-mother', text: 'my mother'},
  {id: 'w-father', text: 'my father'},
  {id: 'w-brother', text: 'my brother'},
  {id: 'w-sister', text: 'my sister'},
  {id: 'w-friend', text: 'my friend'},
  {id: 'w-teacher', text: 'my teacher'},
];

/** The boys' own names as subjects (third person, like he / she). */
export const NAME_SUBJECTS: Record<TrackId, string[]> = {
  g1: ['Abdulloh', 'Umar'],
  g2: ['Ali', 'Amir'],
};
