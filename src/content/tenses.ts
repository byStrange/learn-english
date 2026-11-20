import type {TrackId} from './types';

export type TenseId = 'present-simple' | 'past-simple';
export type FormId = 'positive' | 'negative' | 'question';
/** A place in the sentence. `mid` is a frequency adverb (usually…), `aux` is do/does/did. */
export type SlotId = 'aux' | 'subject' | 'mid' | 'verb' | 'object' | 'time';

export interface TenseForm {
  /** Slots in the order they are said. */
  slots: SlotId[];
  /** The formula shown on the bar, e.g. "S + V1(s) + O + time". */
  formula: string;
  examples: string[];
}

export interface Tense {
  id: TenseId;
  name: string;
  /** The unit that teaches it, per track: the lab tense unlocks once a lesson of it is done. */
  unitIds: Record<TrackId, string>;
  forms: Record<FormId, TenseForm>;
  rules: string[];
}

export const TENSES: Tense[] = [
  {
    id: 'present-simple',
    name: 'Present simple',
    unitIds: {g1: 'g1-u3', g2: 'g2-u2'},
    forms: {
      positive: {
        slots: ['subject', 'mid', 'verb', 'object', 'time'],
        formula: 'S + V1(s) + O + time',
        examples: ['I eat breakfast every day.', 'She plays football after school.'],
      },
      negative: {
        slots: ['subject', 'aux', 'verb', 'object', 'time'],
        formula: "S + don't / doesn't + V1 + O",
        examples: ["I don't drink tea.", "He doesn't watch TV at night."],
      },
      question: {
        slots: ['aux', 'subject', 'verb', 'object', 'time'],
        formula: 'Do / Does + S + V1 + O?',
        examples: ['Do you like rice?', 'Does she drink milk every day?'],
      },
    },
    rules: [
      'Use it for things you do again and again: every day, usually, after school.',
      'He, she, it (and one person, like my brother) → add -s: play → plays.',
      'Verbs ending in -s, -sh, -ch, -x, -o → add -es: watch → watches, go → goes.',
      'Consonant + y → -ies: study → studies. have → has.',
      "Not and questions use do / does, then V1 without -s: He doesn't play.",
    ],
  },
  {
    id: 'past-simple',
    name: 'Past simple',
    unitIds: {g1: 'g1-u4', g2: 'g2-u4'},
    forms: {
      positive: {
        slots: ['subject', 'verb', 'object', 'time'],
        formula: 'S + V2 + O + time',
        examples: ['I played football yesterday.', 'We visited my grandma last week.'],
      },
      negative: {
        slots: ['subject', 'aux', 'verb', 'object', 'time'],
        formula: "S + didn't + V1 + O",
        examples: ["I didn't eat breakfast.", "She didn't go to school yesterday."],
      },
      question: {
        slots: ['aux', 'subject', 'verb', 'object', 'time'],
        formula: 'Did + S + V1 + O?',
        examples: ['Did you watch TV last night?', 'Did he call my uncle?'],
      },
    },
    rules: [
      'Use it for finished time: yesterday, last week, two hours ago.',
      'V2 is the same for everyone: I played, she played.',
      'Regular verbs: + ed (play → played, study → studied, stop → stopped).',
      'Irregular verbs have their own V2: go → went, eat → ate. Learn them as V1 · V2 · V3.',
      "Not and questions use did, then V1: I didn't go. Did you go?",
    ],
  },
];

export function getTense(id: TenseId): Tense {
  return TENSES.find(t => t.id === id)!;
}

/** Group 2 builds positive sentences only. */
export function formsFor(trackId: TrackId): FormId[] {
  return trackId === 'g2' ? ['positive'] : ['positive', 'negative', 'question'];
}

export const FORM_NAMES: Record<FormId, string> = {positive: 'Yes (+)', negative: 'Not (−)', question: 'Question (?)'};

export const SLOT_LABELS: Record<SlotId, string> = {
  aux: 'do / does / did',
  subject: 'Who?',
  mid: 'How often?',
  verb: 'does what?',
  object: 'what?',
  time: 'when?',
};
