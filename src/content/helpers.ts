import type {Exercise, FormulaCard, GrammarRole, Tile} from './types';

/**
 * Small helpers that keep the lesson files short and readable.
 *
 * Tiles are written as "text:role" separated by spaces, with "_" for a space
 * inside one tile:  "She:s goes:v to_school:o every_day:t"
 * Roles: s = subject (green), v = verb (red), o = object (blue), t = time (yellow).
 */
const ROLE: Record<string, GrammarRole> = {s: 'subject', v: 'verb', o: 'object', t: 'time'};

export function tiles(spec: string): Tile[] {
  return spec
    .trim()
    .split(/\s+/)
    .map(part => {
      const i = part.lastIndexOf(':');
      const text = (i === -1 ? part : part.slice(0, i)).replace(/_/g, ' ');
      const role = ROLE[i === -1 ? 'o' : part.slice(i + 1)];
      if (!role) throw new Error(`Unknown role in tile "${part}"`);
      return {text, role};
    });
}

/** See a picture or hint → pick the English word. */
export const pick = (itemId: string): Exercise => ({type: 'pick-word', itemId});
/** Hear a word → pick it. */
export const listen = (itemId: string): Exercise => ({type: 'listen-pick', itemId});
/** Hear a word → type it (Group 1). */
export const typeIt = (itemId: string): Exercise => ({type: 'listen-type', itemId});
/** See V1 → choose V2 or V3. */
export const form = (verbId: string, ask: 'v2' | 'v3'): Exercise => ({type: 'verb-form', verbId, ask});
/** Look, listen, flip. */
export const card = (itemId: string): Exercise => ({type: 'flashcard', itemId});

/** Build a sentence from tiles. `extra` adds wrong tiles to the bank. */
export function build(spec: string, opts: {extra?: string; prompt?: string; audio?: boolean} = {}): Exercise {
  const answerTiles = tiles(spec);
  const extra = opts.extra ? tiles(opts.extra) : [];
  return {
    type: 'build-sentence',
    tiles: [...answerTiles, ...extra],
    answer: answerTiles.map(t => t.text),
    audio: opts.audio ?? true,
    prompt: opts.prompt,
  };
}

/** Fill the gap: write the gap as ___ in the sentence. */
export function gap(sentence: string, answer: string, options: string[], reviewId?: string): Exercise {
  return {type: 'fill-gap', sentence, answer, options, reviewId};
}

/** Hear a sentence → choose the answer to a question about it. */
export function hear(sentence: string, question: string, answer: string, options: string[]): Exercise {
  return {type: 'listen-sentence', sentence, question, answer, options};
}

export function formula(
  title: string,
  parts: string,
  examples: string[],
  opts: {rows?: string[]; joiner?: string; note?: string} = {},
): FormulaCard {
  return {
    title,
    parts: tiles(parts),
    rows: opts.rows?.map(tiles),
    joiner: opts.joiner,
    examples,
    note: opts.note,
  };
}
