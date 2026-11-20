import type {Verb} from './types';

/**
 * The shared verb bank: V1 (base) · V2 (past simple) · V3 (past participle).
 * Ids are "v-" + V1 with spaces as dashes.
 * TEACHER: the Uzbek hints need your check.
 */
function reg(v1: string, uz: string, v2: string = v1 + 'ed', picture?: string): Verb {
  return {id: 'v-' + v1.replace(/\s+/g, '-'), v1, v2, v3: v2, kind: 'regular', hint: {uz}, picture};
}
function irr(v1: string, v2: string, v3: string, uz: string, picture?: string): Verb {
  return {id: 'v-' + v1.replace(/\s+/g, '-'), v1, v2, v3, kind: 'irregular', hint: {uz}, picture};
}

export const verbs: Verb[] = [
  // Regular: V2 = V3 = V1 + ed (with spelling rules)
  reg('play', "o'ynamoq", 'played', '🤾'),
  reg('watch', 'tomosha qilmoq', 'watched', '👀'),
  reg('like', 'yoqtirmoq', 'liked', '👍'),
  reg('want', 'xohlamoq', 'wanted', '🙏'),
  reg('walk', 'piyoda yurmoq', 'walked', '🚶'),
  reg('clean', 'tozalamoq', 'cleaned', '🧹'),
  reg('cook', 'ovqat pishirmoq', 'cooked', '🥘'),
  reg('help', 'yordam bermoq', 'helped', '🫶'),
  reg('live', 'yashamoq', 'lived', '🏘️'),
  reg('study', "o'qimoq, o'rganmoq", 'studied', '📚'),
  reg('stop', "to'xtamoq", 'stopped', '🛑'),
  reg('wash', 'yuvmoq', 'washed', '🧼'),
  reg('brush', 'tish yuvmoq (cho‘tkalamoq)', 'brushed', '🪥'),
  reg('start', 'boshlamoq', 'started', '🏁'),
  reg('finish', 'tugatmoq', 'finished', '✅'),
  reg('visit', 'mehmonga bormoq', 'visited', '🚪'),
  reg('call', "qo'ng'iroq qilmoq", 'called', '📞'),
  reg('listen', 'tinglamoq', 'listened', '👂'),

  // Irregular, batch 1
  irr('go', 'went', 'gone', 'bormoq', '🚌'),
  irr('eat', 'ate', 'eaten', 'yemoq', '🍽️'),
  irr('drink', 'drank', 'drunk', 'ichmoq', '🥤'),
  irr('see', 'saw', 'seen', "ko'rmoq", '👁️'),
  irr('come', 'came', 'come', 'kelmoq', '🏃‍♂️'),
  irr('do', 'did', 'done', 'qilmoq', '🛠️'),
  irr('have', 'had', 'had', "ega bo'lmoq, bor", '🤲'),
  irr('get', 'got', 'got', 'olmoq', '📥'),
  // Irregular, batch 2
  irr('make', 'made', 'made', 'yasamoq', '🧱'),
  irr('take', 'took', 'taken', 'olmoq (olib ketmoq)', '🫴'),
  irr('give', 'gave', 'given', 'bermoq', '🎁'),
  irr('write', 'wrote', 'written', 'yozmoq', '✍️'),
  irr('read', 'read', 'read', "o'qimoq (kitob)", '📕'),
  irr('say', 'said', 'said', 'aytmoq', '💬'),
  irr('buy', 'bought', 'bought', 'sotib olmoq', '🛒'),
  irr('sleep', 'slept', 'slept', 'uxlamoq', '😴'),
  // Irregular, batch 3
  irr('run', 'ran', 'run', 'yugurmoq', '🏃'),
  irr('swim', 'swam', 'swum', 'suzmoq', '🏊'),
  irr('sit', 'sat', 'sat', "o'tirmoq", '🪑'),
  irr('speak', 'spoke', 'spoken', 'gapirmoq', '🗣️'),
  irr('know', 'knew', 'known', 'bilmoq', '💡'),
  irr('think', 'thought', 'thought', "o'ylamoq", '🤔'),
  irr('find', 'found', 'found', 'topmoq', '🔍'),
  irr('ride', 'rode', 'ridden', 'minmoq (velosiped)', '🚴'),
  // For daily routines
  irr('get up', 'got up', 'got up', "o'rnidan turmoq", '⏰'),
];
