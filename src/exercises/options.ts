import type {Exercise, GrammarRole, Track} from '../content/types';
import {getItem} from '../content/index';
import {distractors, shuffle} from '../lib/reviewTasks';
import type {TaskContent} from '../lib/session';

export interface Choice {
  key: string;
  text: string;
  role?: GrammarRole;
  picture?: string;
}

export const choiceCount = (track: Track) => (track.mode === 'kids' ? 4 : 4);

/** The right answer as words, for the feedback panel. */
export function correctText(e: TaskContent): string {
  switch (e.type) {
    case 'pick-word':
    case 'listen-pick':
    case 'listen-type':
    case 'flashcard':
      return getItem(e.itemId)?.text ?? '';
    case 'verb-form': {
      const v = getItem(e.verbId)?.verb;
      return v ? v[e.ask] : '';
    }
    case 'build-sentence':
      return e.answer.join(' ');
    case 'fill-gap':
    case 'listen-sentence':
      return e.answer;
    case 'formula':
      return '';
  }
}

/** Options for a word task: the word plus wrong ones from words the learner has met. */
export function wordChoices(itemId: string, pool: string[], track: Track, seed: number, withPictures: boolean): Choice[] {
  const item = getItem(itemId);
  if (!item) return [];
  const wrong = distractors(item, pool, choiceCount(track) - 1, seed);
  return shuffle([item, ...wrong], seed + 7).map(x => ({
    key: x.id,
    text: x.text,
    role: x.role,
    picture: withPictures ? x.picture : undefined,
  }));
}

/** "go → ?" Wrong options are the other forms and the classic mistake "goed". */
export function verbChoices(verbId: string, ask: 'v2' | 'v3', pool: string[], track: Track, seed: number): Choice[] {
  const v = getItem(verbId)?.verb;
  if (!v) return [];
  const right = v[ask];
  const base = v.v1.endsWith('e') ? `${v.v1}d` : `${v.v1}ed`;
  const candidates = [v.v1, ask === 'v2' ? v.v3 : v.v2, base];
  for (const id of shuffle(pool, seed)) {
    const other = getItem(id)?.verb;
    if (other && other.id !== v.id) candidates.push(other[ask]);
  }
  const seen = new Set([right.toLowerCase()]);
  const wrong: string[] = [];
  for (const c of candidates) {
    if (wrong.length >= choiceCount(track) - 1) break;
    if (!seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase());
      wrong.push(c);
    }
  }
  return shuffle([right, ...wrong], seed + 3).map(text => ({key: text, text, role: 'verb' as const}));
}

export function textChoices(options: string[], seed: number, role?: GrammarRole): Choice[] {
  return shuffle(options, seed).map(text => ({key: text, text, role}));
}

/** Short instructions, in kid words for Group 2. */
export function instructionFor(e: TaskContent, kids: boolean): string {
  switch (e.type) {
    case 'pick-word':
      return kids ? 'Tap the right word' : 'Which word is it?';
    case 'listen-pick':
      return kids ? 'Tap the word you hear' : 'Listen and pick the word';
    case 'listen-type':
      return 'Type what you hear';
    case 'verb-form':
      return e.ask === 'v2' ? 'Pick V2 — the past simple form' : 'Pick V3 — the third form';
    case 'build-sentence':
      return e.prompt ?? (kids ? 'Make the sentence' : 'Build the sentence');
    case 'fill-gap':
      return kids ? 'Tap the missing word' : 'Fill the gap';
    case 'listen-sentence':
      return e.question ?? 'Listen. When is it?';
    case 'flashcard':
      return 'Do you know this word?';
    case 'formula':
      return e.card.title;
  }
}

export function isListening(e: TaskContent): boolean {
  return e.type === 'listen-pick' || e.type === 'listen-type' || e.type === 'listen-sentence';
}

/** Compare typed answers: case, spaces and final punctuation don't matter. */
export function normalizeTyped(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.!?,;:]+$/, '').replace(/[’']/g, "'");
}

export type {Exercise};
