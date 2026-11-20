/**
 * Every text the app can say out loud, in one list. `npm run audio` turns each
 * into a natural Kokoro clip; the app plays the clip when it has one. Add a
 * new kind of spoken text here, or it falls back to the phone's voice.
 */
import {words} from './words';
import {verbs} from './verbs';
import {tracks} from './tracks';
import {TENSES} from './tenses';
import {labChunks} from './labData';
import {normalize} from '../lib/clipKey';

export function spokenTexts(): string[] {
  const out: string[] = [];
  for (const w of words) {
    out.push(w.en);
    if (w.example) out.push(w.example);
  }
  for (const v of verbs) out.push(v.v1, v.v2, v.v3);
  for (const track of tracks) {
    for (const unit of track.units) {
      for (const lesson of unit.lessons) {
        if (lesson.formula) out.push(...lesson.formula.examples);
        for (const ex of lesson.exercises) {
          if (ex.type === 'build-sentence') out.push(ex.answer.join(' '));
          if (ex.type === 'listen-sentence') out.push(ex.sentence);
        }
      }
    }
  }
  for (const tense of TENSES) for (const f of Object.values(tense.forms)) out.push(...f.examples);
  out.push(...labChunks());
  // One clip per distinct normalised text.
  const seen = new Map<string, string>();
  for (const t of out) {
    const k = normalize(t);
    if (k && !seen.has(k)) seen.set(k, t);
  }
  return [...seen.values()];
}

/** What a session will say, for warming its clips when it starts. */
export function spokenForExercises(exercises: {type: string; itemId?: string; verbId?: string; sentence?: string; answer?: unknown}[], lookup: (id: string) => {text: string} | undefined): string[] {
  const out: string[] = [];
  for (const ex of exercises) {
    const id = ex.itemId ?? ex.verbId;
    if (id) {
      const item = lookup(id);
      if (item) out.push(item.text);
    }
    if (ex.type === 'listen-sentence' && ex.sentence) out.push(ex.sentence);
    if (ex.type === 'build-sentence' && Array.isArray(ex.answer)) out.push(ex.answer.join(' '));
  }
  return out;
}
