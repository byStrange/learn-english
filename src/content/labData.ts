import {words} from './words';
import {verbs} from './verbs';
import {FAMILY_SUBJECTS, LAB_OBJECTS, LAB_TIMES, LAB_VERBS, NAME_SUBJECTS, PRONOUNS, type TimeOf, type WordTag} from './lab';
import type {TrackId} from './types';
import {thirdPerson} from '../lib/grammar';

/** Tiles of the Tenses lab, joined from lab.ts and the word / verb banks. */
export interface LabTile {
  id: string;
  /** What goes into the sentence ("an apple", "to school", "my mother"). */
  text: string;
  picture?: string;
}
export interface LabVerbTile extends LabTile {
  v1: string;
  v2: string;
  v3: string;
  s?: string;
  takes: WordTag[];
  noObject: boolean;
}
export interface LabTimeTile extends LabTile {
  timeOf: TimeOf;
  mid: boolean;
}

const wordById = new Map(words.map(w => [w.id, w]));
const verbById = new Map(verbs.map(v => [v.id, v]));

export const LAB_VERB_TILES: LabVerbTile[] = LAB_VERBS.flatMap(lv => {
  const v = verbById.get(lv.id);
  if (!v) return [];
  return [{id: v.id, text: v.v1, picture: v.picture, v1: v.v1, v2: v.v2, v3: v.v3, s: lv.s, takes: lv.takes ?? [], noObject: Boolean(lv.noObject)}];
});

const OBJECT_TILES = LAB_OBJECTS.flatMap(o => {
  const w = wordById.get(o.id);
  return w ? [{id: o.id, text: o.asObject ?? w.en, picture: w.picture, tags: o.tags}] : [];
});

export const LAB_TIME_TILES: LabTimeTile[] = LAB_TIMES.flatMap(t => {
  const w = wordById.get(t.id);
  return w ? [{id: t.id, text: w.en, picture: w.picture, timeOf: t.timeOf, mid: Boolean(t.mid)}] : [];
});

export function labVerb(id: string | undefined): LabVerbTile | undefined {
  return LAB_VERB_TILES.find(v => v.id === id);
}

/** Objects that make sense after this verb (eat → food, go → places). */
export function objectsFor(verbId: string | undefined): LabTile[] {
  const v = labVerb(verbId);
  if (!v) return [];
  return OBJECT_TILES.filter(o => o.tags.some(t => v.takes.includes(t)));
}

/** Who can be the subject: the pronouns and the boys' names always; family words once learned. */
export function subjectTiles(trackId: TrackId, learned: ReadonlySet<string>): LabTile[] {
  const tiles: LabTile[] = PRONOUNS.map(p => ({id: `pro-${p}`, text: p, picture: wordById.get(`w-${p.toLowerCase()}`)?.picture}));
  for (const name of NAME_SUBJECTS[trackId]) tiles.push({id: `name-${name}`, text: name});
  for (const f of FAMILY_SUBJECTS) if (learned.has(f.id)) tiles.push({id: `fam-${f.id}`, text: f.text, picture: wordById.get(f.id)?.picture});
  return tiles;
}

/** Every piece the lab can say, for the clip generator: sentences play as these chunks. */
export function labChunks(): string[] {
  const out: string[] = [...PRONOUNS, ...FAMILY_SUBJECTS.map(f => f.text), ...NAME_SUBJECTS.g1, ...NAME_SUBJECTS.g2];
  out.push("don't", "doesn't", "didn't", 'do', 'does', 'did');
  for (const v of LAB_VERB_TILES) out.push(v.v1, thirdPerson(v.v1, v.s), v.v2, v.v3);
  for (const o of OBJECT_TILES) out.push(o.text);
  for (const t of LAB_TIME_TILES) out.push(t.text);
  return out;
}
