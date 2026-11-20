import {askOrder, auxChoices, checkAux, checkTime, checkVerb, expectedAux, expectedVerb, person, render, thirdPerson, verbChoices} from './grammar';
import {getTense} from '../content/tenses';

const play = {v1: 'play', v2: 'played', v3: 'played'};
const go = {v1: 'go', v2: 'went', v3: 'gone'};
const drink = {v1: 'drink', v2: 'drank', v3: 'drunk'};

describe('grammar engine', () => {
  it.each([
    ['play', 'plays'],
    ['watch', 'watches'],
    ['study', 'studies'],
    ['go', 'goes'],
    ['have', 'has'],
    ['do', 'does'],
    ['fix', 'fixes'],
    ['wash', 'washes'],
    ['get up', 'gets up'],
    ['buy', 'buys'],
  ])('thirdPerson(%s) = %s', (v, s) => expect(thirdPerson(v)).toBe(s));

  it('person(): pronouns, names and "my + family"', () => {
    expect(person('I')).toBe('I');
    expect(person('you')).toBe('other');
    expect(person('They')).toBe('other');
    expect(person('he')).toBe('third');
    expect(person('Ali')).toBe('third');
    expect(person('my mother')).toBe('third');
  });

  it('He + play fails with the -s hint; He + plays passes', () => {
    const ctx = {tense: 'present-simple' as const, form: 'positive' as const, subject: 'he'};
    const bad = checkVerb(play, ctx, 'play');
    expect(bad.ok).toBe(false);
    expect(bad.message).toBe('He, she, it → add -s: play → plays');
    expect(checkVerb(play, ctx, 'plays')).toMatchObject({ok: true, message: 'He → plays'});
  });

  it('names get the same -s rule', () => {
    const r = checkVerb(go, {tense: 'present-simple', form: 'positive', subject: 'Ali'}, 'go');
    expect(r.ok).toBe(false);
    expect(r.message).toContain('go → goes');
  });

  it('I + plays fails: no -s', () => {
    const r = checkVerb(play, {tense: 'present-simple', form: 'positive', subject: 'I'}, 'plays');
    expect(r).toMatchObject({ok: false, message: 'I → no -s: play'});
  });

  it('past simple wants V2, and explains V3', () => {
    const ctx = {tense: 'past-simple' as const, form: 'positive' as const, subject: 'he'};
    expect(checkVerb(go, ctx, 'went').ok).toBe(true);
    expect(checkVerb(go, ctx, 'go').message).toBe('Past simple → use V2: went');
    expect(checkVerb(go, ctx, 'gone').message).toBe('gone is V3. Past simple uses V2: went');
  });

  it("doesn't + plays fails; Did + went fails; both want V1", () => {
    const neg = {tense: 'present-simple' as const, form: 'negative' as const, subject: 'he', aux: "doesn't"};
    expect(checkVerb(play, neg, 'plays')).toMatchObject({ok: false, message: "After doesn't, use V1: play"});
    expect(checkVerb(play, neg, 'play').ok).toBe(true);
    const q = {tense: 'past-simple' as const, form: 'question' as const, subject: 'you', aux: 'Did'};
    expect(checkVerb(go, q, 'went')).toMatchObject({ok: false, message: 'After Did, use V1: go'});
  });

  it('aux: do / does / did by person and tense', () => {
    expect(expectedAux({tense: 'present-simple', form: 'negative', subject: 'she'})).toBe("doesn't");
    expect(expectedAux({tense: 'present-simple', form: 'negative', subject: 'we'})).toBe("don't");
    expect(expectedAux({tense: 'past-simple', form: 'negative', subject: 'she'})).toBe("didn't");
    expect(expectedAux({tense: 'present-simple', form: 'question', subject: 'she'})).toBe('Does');
    expect(expectedAux({tense: 'past-simple', form: 'question', subject: 'I'})).toBe('Did');
    expect(expectedAux({tense: 'present-simple', form: 'positive', subject: 'I'})).toBeNull();
    expect(checkAux({tense: 'present-simple', form: 'question', subject: 'she'}, 'Do')).toMatchObject({ok: false, message: 'He, she, it → Does'});
    expect(checkAux({tense: 'past-simple', form: 'negative', subject: 'she'}, "doesn't").message).toBe("Past simple → didn't for everyone");
    expect(auxChoices('present-simple', 'question')).toEqual(['Do', 'Does', 'Did']);
  });

  it('yesterday in present simple suggests switching to past', () => {
    const r = checkTime('present-simple', {text: 'yesterday', timeOf: 'past'});
    expect(r.ok).toBe(false);
    expect(r.message).toBe('Yesterday is past. Switch to Past simple?');
    expect(r.action?.switchTo).toBe('past-simple');
    expect(checkTime('past-simple', {text: 'every day', timeOf: 'present'}).action?.switchTo).toBe('present-simple');
    expect(checkTime('past-simple', {text: 'today', timeOf: 'any'}).ok).toBe(true);
  });

  it('verb choices: kids get no V3, aux sentences get mixed forms', () => {
    expect(verbChoices(go, 'present-simple', 'positive')).toEqual(['go', 'goes']);
    expect(verbChoices(go, 'past-simple', 'positive')).toEqual(['go', 'went', 'gone']);
    expect(verbChoices(go, 'past-simple', 'positive', true)).toEqual(['go', 'went']);
    expect(verbChoices(play, 'past-simple', 'positive')).toEqual(['play', 'played']);
    expect(verbChoices(drink, 'past-simple', 'question')).toEqual(['drink', 'drinks', 'drank']);
    expect(expectedVerb(drink, {tense: 'present-simple', form: 'question', subject: 'she'})).toBe('drink');
  });

  it('render() capitalises and ends with "." or "?"', () => {
    const q = getTense('present-simple').forms.question.slots;
    expect(render(q, {aux: 'Does', subject: 'she', verb: 'drink', object: 'milk', time: 'every day'}, 'question').text).toBe('Does she drink milk every day?');
    const p = getTense('past-simple').forms.positive.slots;
    const r = render(p, {subject: 'he', verb: 'played', object: 'football', time: 'yesterday'}, 'positive');
    expect(r.text).toBe('He played football yesterday.');
    expect(r.tokens.map(t => t.role)).toEqual(['subject', 'verb', 'object', 'time']);
  });

  it('usually lands in the mid slot, between subject and verb', () => {
    const p = getTense('present-simple').forms.positive.slots;
    expect(render(p, {subject: 'I', mid: 'usually', verb: 'eat', object: 'breakfast'}, 'positive').text).toBe('I usually eat breakfast.');
  });

  it('asks who first, even when the question starts with do / does', () => {
    expect(askOrder(getTense('present-simple').forms.question.slots)).toEqual(['subject', 'aux', 'verb', 'object', 'time']);
  });
});
