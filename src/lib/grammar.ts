/**
 * The Tenses lab's grammar engine: pure functions, no React, no dates.
 * It knows just enough English for S + (aux) + V + O + time sentences in
 * present simple and past simple, and explains every mistake in one line.
 */
import type {FormId, SlotId, TenseId} from '../content/tenses';
import type {TimeOf} from '../content/lab';

export type Person = 'I' | 'third' | 'other';

const OTHER = new Set(['you', 'we', 'they']);
const THIRD = new Set(['he', 'she', 'it']);

/** Who the subject is, for the verb: I, he/she/it (also names, "my brother"), or you/we/they. */
export function person(subject: string): Person {
  const s = subject.trim().toLowerCase();
  if (s === 'i') return 'I';
  if (OTHER.has(s)) return 'other';
  if (THIRD.has(s)) return 'third';
  // A name or "my mother": one person, like he / she.
  return 'third';
}

/** The he/she/it form of a verb: play → plays, watch → watches, study → studies, have → has. */
export function thirdPerson(v1: string, override?: string): string {
  if (override) return override;
  const [head, ...rest] = v1.split(' ');
  const tail = rest.length ? ' ' + rest.join(' ') : '';
  const special: Record<string, string> = {have: 'has', do: 'does', go: 'goes', be: 'is'};
  if (special[head]) return special[head] + tail;
  if (/(s|sh|ch|x|z|o)$/.test(head)) return head + 'es' + tail;
  if (/[^aeiou]y$/.test(head)) return head.slice(0, -1) + 'ies' + tail;
  return head + 's' + tail;
}

export interface VerbForms {
  v1: string;
  v2: string;
  v3: string;
  /** Override of the he/she/it form. */
  s?: string;
}

export interface Ctx {
  tense: TenseId;
  form: FormId;
  /** The subject as said ("he", "Ali", "my mother"). */
  subject?: string;
}

/** do / does / did for this sentence (null in a positive sentence). */
export function expectedAux({tense, form, subject}: Ctx): string | null {
  if (form === 'positive') return null;
  const third = subject !== undefined && person(subject) === 'third';
  if (form === 'negative') return tense === 'past-simple' ? "didn't" : third ? "doesn't" : "don't";
  return tense === 'past-simple' ? 'Did' : third ? 'Does' : 'Do';
}

export function auxChoices(_tense: TenseId, form: FormId): string[] {
  if (form === 'negative') return ["don't", "doesn't", "didn't"];
  if (form === 'question') return ['Do', 'Does', 'Did'];
  return [];
}

/** The right verb form for this sentence. */
export function expectedVerb(verb: VerbForms, {tense, form, subject}: Ctx): string {
  if (form !== 'positive') return verb.v1;
  if (tense === 'past-simple') return verb.v2;
  return subject !== undefined && person(subject) === 'third' ? thirdPerson(verb.v1, verb.s) : verb.v1;
}

/** The forms offered as tiles for the verb slot (a few wrong ones included on purpose). */
export function verbChoices(verb: VerbForms, tense: TenseId, form: FormId, kids = false): string[] {
  const s = thirdPerson(verb.v1, verb.s);
  let list: string[];
  if (form !== 'positive') list = [verb.v1, s, verb.v2];
  else if (tense === 'present-simple') list = [verb.v1, s];
  else list = kids ? [verb.v1, verb.v2] : [verb.v1, verb.v2, verb.v3];
  return [...new Set(list)];
}

export interface Check {
  ok: boolean;
  message: string;
  /** "Switch to Past simple?": the screen shows a button for it. */
  action?: {switchTo: TenseId; label: string};
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

function who(subject?: string): string {
  if (!subject) return 'This';
  const p = person(subject);
  const lower = subject.toLowerCase();
  if (p === 'I') return 'I';
  if (p === 'other') return cap(subject);
  if (THIRD.has(lower)) return 'He, she, it';
  return `${cap(subject)} (like he / she)`;
}

export function checkAux(ctx: Ctx, choice: string): Check {
  const want = expectedAux(ctx);
  if (want === null) return {ok: true, message: ''};
  if (choice === want) return {ok: true, message: `${cap(ctx.subject ?? '')} → ${want}`.trim()};
  if (ctx.tense === 'past-simple') return {ok: false, message: `Past simple → ${want} for everyone`};
  return {ok: false, message: `${who(ctx.subject)} → ${want}`};
}

export function checkVerb(verb: VerbForms, ctx: Ctx & {aux?: string}, choice: string): Check {
  const want = expectedVerb(verb, ctx);
  if (choice === want) {
    if (ctx.form !== 'positive') return {ok: true, message: `After ${ctx.aux ?? expectedAux(ctx)} → V1: ${want}`};
    if (ctx.tense === 'past-simple') return {ok: true, message: `Past simple → V2: ${want}`};
    return {ok: true, message: `${cap(ctx.subject ?? '')} → ${want}`};
  }
  if (ctx.form !== 'positive') return {ok: false, message: `After ${ctx.aux ?? expectedAux(ctx)}, use V1: ${verb.v1}`};
  if (ctx.tense === 'past-simple') {
    if (choice === verb.v3 && verb.v3 !== verb.v2) return {ok: false, message: `${verb.v3} is V3. Past simple uses V2: ${verb.v2}`};
    return {ok: false, message: `Past simple → use V2: ${verb.v2}`};
  }
  if (choice === verb.v2 && verb.v2 !== verb.v1) return {ok: false, message: `${verb.v2} is past. Present simple → ${want}`};
  const p = ctx.subject ? person(ctx.subject) : 'other';
  if (p === 'third') return {ok: false, message: `${who(ctx.subject)} → add -s: ${verb.v1} → ${want}`};
  return {ok: false, message: `${who(ctx.subject)} → no -s: ${want}`};
}

/** Past time words need past simple, habit words need present simple; "today" fits both. */
export function checkTime(tense: TenseId, time: {text: string; timeOf: TimeOf}): Check {
  if (time.timeOf === 'any') return {ok: true, message: `${cap(time.text)} fits both`};
  if (time.timeOf === 'past') {
    if (tense === 'past-simple') return {ok: true, message: `${cap(time.text)} → past simple`};
    return {ok: false, message: `${cap(time.text)} is past. Switch to Past simple?`, action: {switchTo: 'past-simple', label: 'Switch to Past simple'}};
  }
  if (tense === 'present-simple') return {ok: true, message: `${cap(time.text)} → a habit, present simple`};
  return {
    ok: false,
    message: `${cap(time.text)} is for habits → Present simple. Switch?`,
    action: {switchTo: 'present-simple', label: 'Switch to Present simple'},
  };
}

/** The slots to fill, in the order the lab asks for them (who first, so the verb can be checked). */
export function askOrder(slots: SlotId[]): SlotId[] {
  const order: SlotId[] = ['subject', 'aux', 'mid', 'verb', 'object', 'time'];
  return order.filter(s => slots.includes(s));
}

export interface Token {
  text: string;
  role: 'subject' | 'verb' | 'object' | 'time';
}

const ROLE: Record<SlotId, Token['role']> = {aux: 'verb', subject: 'subject', mid: 'time', verb: 'verb', object: 'object', time: 'time'};

/** Puts the filled slots in speaking order: capital first letter, "." or "?" at the end. */
export function render(slots: SlotId[], values: Partial<Record<SlotId, string>>, form: FormId): {tokens: Token[]; text: string} {
  const tokens: Token[] = [];
  for (const slot of slots) {
    const v = values[slot];
    if (v) tokens.push({text: v, role: ROLE[slot]});
  }
  if (tokens.length) tokens[0] = {...tokens[0], text: cap(tokens[0].text)};
  const body = tokens.map(t => t.text).join(' ');
  return {tokens, text: body ? body + (form === 'question' ? '?' : '.') : ''};
}
