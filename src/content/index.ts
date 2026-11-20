import type {Hint, HintLang, Learner, Lesson, Track, TrackId, Unit, Verb, Word} from './types';
import {words} from './words';
import {verbs} from './verbs';
import {tracks} from './tracks';

export {tracks, words, verbs};

/** One thing to learn: a word or a verb, with the fields the screens need. */
export interface Item {
  id: string;
  kind: 'word' | 'verb';
  /** What is said and written: the word, or V1 for a verb. */
  text: string;
  hint?: Hint;
  picture?: string;
  audio?: string;
  example?: string;
  role: Word['role'];
  verb?: Verb;
}

const itemMap = new Map<string, Item>();
for (const w of words) {
  itemMap.set(w.id, {id: w.id, kind: 'word', text: w.en, hint: w.hint, picture: w.picture, audio: w.audio, example: w.example, role: w.role});
}
for (const v of verbs) {
  itemMap.set(v.id, {
    id: v.id,
    kind: 'verb',
    text: v.v1,
    hint: v.hint,
    picture: v.picture,
    audio: v.audio,
    role: 'verb',
    verb: v,
    example: `${v.v1} · ${v.v2} · ${v.v3}`,
  });
}

export function getItem(id: string): Item | undefined {
  return itemMap.get(id);
}

export function hasItem(id: string): boolean {
  return itemMap.has(id);
}

export function hintText(item: Item | undefined, lang: HintLang): string | undefined {
  if (!item?.hint || lang === 'none') return undefined;
  return item.hint[lang];
}

export function getTrack(id: TrackId): Track {
  return tracks.find(t => t.id === id)!;
}

export function allLearners(): {track: Track; learner: Learner}[] {
  return tracks.flatMap(track => track.learners.map(learner => ({track, learner})));
}

export function getLearner(learnerId: string | undefined): {track: Track; learner: Learner} | undefined {
  return allLearners().find(x => x.learner.id === learnerId);
}

export function readyUnits(track: Track): Unit[] {
  return track.units.filter(u => u.status !== 'coming-soon' && u.lessons.length > 0);
}

export function allLessons(track: Track): Lesson[] {
  return readyUnits(track).flatMap(u => u.lessons);
}

export function getLesson(track: Track, lessonId: string | undefined): Lesson | undefined {
  return allLessons(track).find(l => l.id === lessonId);
}

export function unitOfLesson(track: Track, lessonId: string): Unit | undefined {
  return track.units.find(u => u.lessons.some(l => l.id === lessonId));
}

/** Every item any ready lesson of the track introduces, in course order. */
export function trackItemIds(track: Track): string[] {
  return [...new Set(allLessons(track).flatMap(l => l.newItems))];
}
