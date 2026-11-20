import {startTransition, useState} from 'react';
import {Button} from '@curialy/ui/Button';
import {SegmentedControl, SegmentedControlItem} from '@curialy/ui/SegmentedControl';
import {CheckCircleIcon, LightBulbIcon, SpeakerWaveIcon} from '@heroicons/react/24/solid';
import {allLessons} from '../content/index';
import {FORM_NAMES, SLOT_LABELS, TENSES, formsFor, getTense, type FormId, type SlotId, type TenseId} from '../content/tenses';
import {LAB_TIME_TILES, LAB_VERB_TILES, labVerb, objectsFor, subjectTiles, type LabTile} from '../content/labData';
import {askOrder, auxChoices, checkAux, checkTime, checkVerb, expectedAux, expectedVerb, render, verbChoices, type Check} from '../lib/grammar';
import {isDue} from '../lib/srs';
import {primeAudio, speakSequence} from '../lib/speech';
import {useProgress} from '../state/ProgressContext';
import {newId, type LabSentence, type LearnerProgress} from '../state/model';
import {Picture} from '../components/Picture';
import {useLearner} from './learnerContext';

/** One filled slot: the tile chosen and the exact words it puts in the sentence. */
interface Filled {
  id: string;
  text: string;
}
type Values = Partial<Record<SlotId, Filled>>;
interface Guide {
  kind: 'ok' | 'hint';
  message: string;
  action?: Check['action'];
}

const ROLE_OF: Record<SlotId, 'subject' | 'verb' | 'object' | 'time'> = {
  aux: 'verb',
  subject: 'subject',
  mid: 'time',
  verb: 'verb',
  object: 'object',
  time: 'time',
};

/** Slots you may leave empty: "how often", the time, and the object of verbs like sleep. */
function isOptional(slot: SlotId, verbId: string | undefined): boolean {
  if (slot === 'mid' || slot === 'time') return true;
  if (slot === 'object') return Boolean(labVerb(verbId)?.noObject);
  return false;
}

/** A tense opens once any lesson of the unit that teaches it is done. */
function unlockInfo(progress: LearnerProgress, unitId: string, lessons: ReturnType<typeof allLessons>, unitLessonIds: string[]) {
  const open = unitLessonIds.some(id => progress.completed[id]);
  const first = lessons.find(l => l.id === unitLessonIds[0]);
  return {open, first: first?.title ?? unitId};
}

/** Is everything still right after an earlier slot changed? Returns the slots to check again. */
function staleSlots(values: Values, ctx: {tense: TenseId; form: FormId}): SlotId[] {
  const out: SlotId[] = [];
  const subject = values.subject?.text;
  if (!subject) return out;
  if (values.aux && values.aux.text !== expectedAux({...ctx, subject})) out.push('aux');
  const verb = labVerb(values.verb?.id);
  if (verb && values.verb && values.verb.text !== expectedVerb(verb, {...ctx, subject})) out.push('verb');
  const time = LAB_TIME_TILES.find(t => t.id === values.time?.id);
  if (time && !checkTime(ctx.tense, time).ok) out.push('time');
  return out;
}

export function Tenses() {
  const {learner, track, today} = useLearner();
  const {get, addSentence, gradeFlashcard} = useProgress();
  const progress = get(learner.id);
  const kids = track.mode === 'kids';
  const lessons = allLessons(track);

  const tenseInfo = TENSES.map(t => {
    const unit = track.units.find(u => u.id === t.unitIds[track.id]);
    return {tense: t, ...unlockInfo(progress, t.unitIds[track.id], lessons, unit?.lessons.map(l => l.id) ?? [])};
  });
  const firstOpen = tenseInfo.find(t => t.open)?.tense.id ?? 'present-simple';

  const [tenseId, setTenseId] = useState<TenseId>(firstOpen);
  const [form, setForm] = useState<FormId>('positive');
  const [values, setValues] = useState<Values>({});
  const [active, setActive] = useState<SlotId | null>(null);
  /** A verb tapped in the tray, waiting for its right form. */
  const [verbId, setVerbId] = useState<string | null>(null);
  const [misses, setMisses] = useState<Partial<Record<SlotId, number>>>({});
  const [guide, setGuide] = useState<Guide | null>(null);
  const [firstTryVerb, setFirstTryVerb] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  const tense = getTense(tenseId);
  const info = tenseInfo.find(t => t.tense.id === tenseId)!;
  const forms = formsFor(track.id);
  const slots = tense.forms[form].slots;
  const order = askOrder(slots);
  const ctx = {tense: tenseId, form};
  const stale = staleSlots(values, ctx);
  const chosenVerbId = verbId ?? values.verb?.id;
  const required = order.filter(s => !isOptional(s, chosenVerbId));
  const firstEmpty = order.find(s => !values[s] && !isOptional(s, chosenVerbId)) ?? order.find(s => !values[s]) ?? null;
  const current: SlotId | null = active ?? firstEmpty;
  const complete = required.every(s => values[s]) && stale.length === 0;
  const sentence = render(
    slots,
    Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v?.text])) as Partial<Record<SlotId, string>>,
    form,
  );

  // The words this learner can use: met in lessons; a few starters when a group is still empty.
  const learned = new Set(Object.keys(progress.items));
  const verbsLearned = LAB_VERB_TILES.filter(v => learned.has(v.id));
  const verbTiles = verbsLearned.length >= 3 ? verbsLearned : LAB_VERB_TILES.slice(0, 6);
  const objectTiles = (() => {
    const all = objectsFor(chosenVerbId ?? undefined);
    const mine = all.filter(o => learned.has(o.id));
    return (mine.length >= 2 ? mine : all).slice(0, kids ? 6 : 10);
  })();
  const timeTiles = LAB_TIME_TILES.filter(t => (current === 'mid' ? t.mid : !t.mid));

  const reset = () => {
    setValues({});
    setActive(null);
    setVerbId(null);
    setMisses({});
    setGuide(null);
    setFirstTryVerb(true);
  };
  const changeTense = (t: string) =>
    startTransition(() => {
      setTenseId(t as TenseId);
      // Keep who and what; the forms get checked again.
      setGuide(null);
      setActive(null);
    });
  const changeForm = (f: string) =>
    startTransition(() => {
      setForm(f as FormId);
      reset();
    });

  const miss = (slot: SlotId, check: Check) => {
    setMisses(m => ({...m, [slot]: (m[slot] ?? 0) + 1}));
    setGuide({kind: 'hint', message: check.message, action: check.action});
    if (slot === 'verb') setFirstTryVerb(false);
  };
  const fill = (slot: SlotId, tile: Filled, message: string) => {
    setValues(v => ({...v, [slot]: tile}));
    setGuide({kind: 'ok', message});
    setActive(null);
    setSaved(null);
  };

  const pickSubject = (t: LabTile) => fill('subject', {id: t.id, text: t.text}, `${t.text[0].toUpperCase()}${t.text.slice(1)} — now, ${slots.includes('aux') ? 'the helper word' : 'what does ' + (t.text === 'I' ? 'I' : t.text) + ' do?'}`);
  const pickAux = (aux: string) => {
    const c = checkAux({...ctx, subject: values.subject?.text}, aux);
    if (c.ok) fill('aux', {id: `aux-${aux}`, text: aux}, c.message);
    else miss('aux', c);
  };
  const pickVerbForm = (form_: string) => {
    const v = labVerb(chosenVerbId ?? undefined);
    if (!v) return;
    const c = checkVerb(v, {...ctx, subject: values.subject?.text, aux: values.aux?.text}, form_);
    if (c.ok) {
      fill('verb', {id: v.id, text: form_}, c.message);
      setVerbId(null);
    } else miss('verb', c);
  };
  const pickObject = (t: LabTile) => fill('object', {id: t.id, text: t.text}, `${t.text} — ${slots.includes('time') ? 'when? (or leave it)' : 'done!'}`);
  const pickTime = (slot: 'mid' | 'time', t: (typeof LAB_TIME_TILES)[number]) => {
    const c = checkTime(tenseId, t);
    if (c.ok) fill(slot, {id: t.id, text: t.text}, c.message);
    else miss(slot, c);
  };

  const listen = () => {
    primeAudio();
    void speakSequence(
      sentence.tokens.map(t => t.text),
      sentence.text,
      {rate: track.speechRate},
    );
  };

  const save = () => {
    const s: LabSentence = {
      id: newId(),
      text: sentence.text,
      tense: tenseId,
      form,
      tokens: sentence.tokens,
      date: today,
      createdAt: new Date().toISOString(),
    };
    addSentence(learner.id, s);
    // A verb form right first time is practice for that verb too.
    const v = values.verb?.id;
    if (v && progress.items[v]) gradeFlashcard(learner.id, v, firstTryVerb, today);
    setSaved(sentence.text);
    reset();
  };

  const challenge = () => {
    const due = verbTiles.filter(v => progress.items[v.id] && isDue(progress.items[v.id], today));
    const pool = due.length ? due : verbTiles;
    const v = pool[Math.floor(Math.random() * pool.length)];
    const times = LAB_TIME_TILES.filter(t => !t.mid && (t.timeOf === 'any' || t.timeOf === (tenseId === 'past-simple' ? 'past' : 'present')));
    const t = times[Math.floor(Math.random() * times.length)];
    reset();
    setVerbId(v.id);
    if (slots.includes('time')) setValues({time: {id: t.id, text: t.text}});
    setGuide({kind: 'ok', message: `Challenge: say it with "${v.v1}" and "${t.text}". Who?`});
  };

  const mine = [...progress.sentences].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const subjectReady = Boolean(values.subject);
  const auxReady = !slots.includes('aux') || Boolean(values.aux);
  const blockedHint = !subjectReady && current !== 'subject' ? 'Pick who first' : null;

  return (
    <div className="screen tab-screen tenses">
      <header className="screen-head">
        <h1 className="screen-title">Make sentences</h1>
        <p className="muted">Use the formula and your words. The app tells you why.</p>
      </header>
      <main className="tenses-main">
        <div className="tense-controls">
          <SegmentedControl label="Tense" value={tenseId} onChange={changeTense} layout="fill" size="lg">
            {tenseInfo.map(t => (
              <SegmentedControlItem key={t.tense.id} value={t.tense.id} label={t.tense.name} isDisabled={!t.open} />
            ))}
          </SegmentedControl>
          {forms.length > 1 ? (
            <SegmentedControl label="Sentence type" value={form} onChange={changeForm} layout="fill">
              {forms.map(f => (
                <SegmentedControlItem key={f} value={f} label={FORM_NAMES[f]} />
              ))}
            </SegmentedControl>
          ) : null}
          {tenseInfo.some(t => !t.open) ? (
            <p className="muted lock-note">
              {tenseInfo
                .filter(t => !t.open)
                .map(t => `${t.tense.name}: finish "${t.first}" first.`)
                .join(' ')}
            </p>
          ) : null}
        </div>

        {info.open ? (
          <>
            <section className="formula-bar" aria-label={`Formula: ${tense.forms[form].formula}`}>
              <div className="formula-bar-top">
                <p className="formula-text">{tense.forms[form].formula}</p>
                <button type="button" className="rules-btn" aria-expanded={rulesOpen} aria-controls="tense-rules" onClick={() => setRulesOpen(o => !o)}>
                  {rulesOpen ? 'Hide rules' : 'Rules'}
                </button>
              </div>
              <div className="slot-row" role="group" aria-label="Your sentence, slot by slot">
                {slots.map(slot => {
                  const v = values[slot];
                  const isActive = current === slot;
                  const check = stale.includes(slot);
                  const cls = ['slot', `slot-${ROLE_OF[slot]}`, v ? 'is-ok' : 'is-empty', isActive ? 'is-active' : '', check ? 'is-check' : '', isOptional(slot, chosenVerbId) ? 'is-optional' : '']
                    .filter(Boolean)
                    .join(' ');
                  return (
                    <button
                      key={slot}
                      type="button"
                      className={cls}
                      aria-label={`${SLOT_LABELS[slot]}: ${v?.text ?? 'empty'}${check ? ', check this again' : ''}`}
                      aria-pressed={isActive}
                      onClick={() => setActive(slot)}>
                      <span className="slot-label">{SLOT_LABELS[slot]}</span>
                      <span className="slot-value">{v?.text ?? (isOptional(slot, chosenVerbId) ? '(if you like)' : '…')}</span>
                    </button>
                  );
                })}
                {form === 'question' ? <span className="slot-end" aria-hidden="true">?</span> : null}
              </div>
              <div id="tense-rules" className={`rules${rulesOpen ? ' is-open' : ''}`} hidden={!rulesOpen}>
                <ul>
                  {tense.rules.map(r => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <p className="rules-examples">
                  {tense.forms[form].examples.map(e => (
                    <span key={e}>{e} </span>
                  ))}
                </p>
              </div>
            </section>

            <section className="lab-sentence" aria-label="Sentence so far">
              <p className="lab-text">
                {sentence.tokens.length ? (
                  sentence.tokens.map((t, i) => (
                    <span key={i} className={`lab-token role-text-${t.role}`}>
                      {t.text}
                      {i === sentence.tokens.length - 1 ? (form === 'question' ? '?' : '.') : ' '}
                    </span>
                  ))
                ) : (
                  <span className="muted">Tap the tiles below to build a sentence.</span>
                )}
              </p>
              <div className={`guide${guide ? ` is-${guide.kind}` : ''}`} role="status" aria-live="polite">
                {guide ? (
                  <>
                    {guide.kind === 'ok' ? <CheckCircleIcon className="guide-icon" aria-hidden="true" /> : <LightBulbIcon className="guide-icon" aria-hidden="true" />}
                    <span>{guide.message}</span>
                    {guide.action ? (
                      <Button
                        label={guide.action.label}
                        variant="secondary"
                        size="md"
                        onClick={() => {
                          changeTense(guide.action!.switchTo);
                          setGuide({kind: 'ok', message: `Now in ${getTense(guide.action!.switchTo).name}. Pick the time again.`});
                        }}
                      />
                    ) : null}
                  </>
                ) : stale.length ? (
                  <>
                    <LightBulbIcon className="guide-icon" aria-hidden="true" />
                    <span>Check this again: {stale.map(s => SLOT_LABELS[s]).join(', ')}</span>
                  </>
                ) : saved ? (
                  <>
                    <CheckCircleIcon className="guide-icon" aria-hidden="true" />
                    <span>Saved: {saved}</span>
                  </>
                ) : null}
              </div>
              {sentence.tokens.length ? (
                <div className="lab-actions">
                  <Button label="Listen" variant="secondary" size="lg" icon={<SpeakerWaveIcon aria-hidden="true" />} onClick={listen} />
                  <Button label="Start again" variant="ghost" size="lg" onClick={reset} />
                </div>
              ) : null}
            </section>

            <section className="tray" aria-label={current ? `Choose: ${SLOT_LABELS[current]}` : 'Done'}>
              <h2 className="tray-title">{current ? SLOT_LABELS[current] : 'Ready!'}</h2>
              {blockedHint ? <p className="muted">{blockedHint}</p> : null}
              {current === 'subject' ? (
                <TileGrid tiles={subjectTiles(track.id, learned)} role="subject" onPick={pickSubject} highlight={null} />
              ) : null}
              {current === 'aux' ? (
                <TextTiles
                  options={auxChoices(tenseId, form)}
                  role="verb"
                  disabled={!subjectReady}
                  highlight={(misses.aux ?? 0) >= 2 ? expectedAux({...ctx, subject: values.subject?.text}) : null}
                  onPick={pickAux}
                />
              ) : null}
              {current === 'verb' ? (
                chosenVerbId && labVerb(chosenVerbId) && !values.verb ? (
                  <>
                    <p className="muted">
                      Which form of <strong>{labVerb(chosenVerbId)!.v1}</strong>?{' '}
                      <button type="button" className="plain-link" onClick={() => setVerbId(null)}>
                        Change verb
                      </button>
                    </p>
                    <TextTiles
                      options={verbChoices(labVerb(chosenVerbId)!, tenseId, form, kids)}
                      role="verb"
                      disabled={!subjectReady || !auxReady}
                      highlight={(misses.verb ?? 0) >= 2 ? expectedVerb(labVerb(chosenVerbId)!, {...ctx, subject: values.subject?.text}) : null}
                      onPick={pickVerbForm}
                    />
                  </>
                ) : (
                  <TileGrid
                    tiles={verbTiles}
                    role="verb"
                    disabled={!subjectReady || !auxReady}
                    highlight={null}
                    onPick={t => {
                      setVerbId(t.id);
                      setValues(v => ({...v, verb: undefined, object: undefined}));
                      setGuide({kind: 'ok', message: `${t.text} — now pick the right form`});
                    }}
                  />
                )
              ) : null}
              {current === 'object' ? (
                <TileGrid tiles={objectTiles} role="object" disabled={!values.verb} highlight={null} onPick={pickObject} />
              ) : null}
              {current === 'mid' || current === 'time' ? (
                <>
                  <TileGrid
                    tiles={timeTiles}
                    role="time"
                    highlight={(misses[current] ?? 0) >= 2 ? (timeTiles.find(t => checkTime(tenseId, t).ok)?.id ?? null) : null}
                    onPick={t => pickTime(current, t as (typeof LAB_TIME_TILES)[number])}
                  />
                  <Button label="Skip this" variant="ghost" size="lg" onClick={() => setActive(order[order.indexOf(current) + 1] ?? null)} />
                </>
              ) : null}
            </section>

            <div className="lab-save">
              <Button label="Save sentence" variant="primary" size="lg" width="100%" isDisabled={!complete} onClick={save} />
              {!complete ? <p className="muted action-help">Fill {required.filter(s => !values[s]).map(s => SLOT_LABELS[s]).join(', ') || 'the slots'} to save.</p> : null}
              <Button label="Challenge me" variant="secondary" size="lg" width="100%" onClick={challenge} />
            </div>
          </>
        ) : (
          <p className="empty-state">Finish "{info.first}" to open {tense.name}.</p>
        )}

        <section className="my-sentences" aria-labelledby="my-sentences-h">
          <h2 id="my-sentences-h">My sentences ({mine.length})</h2>
          {mine.length ? (
            <ul className="sentence-list">
              {mine.slice(0, 30).map(s => (
                <li key={s.id} className="sentence-row">
                  <span className="sentence-text">
                    {s.tokens.map((t, i) => (
                      <span key={i} className={`role-text-${t.role}`}>
                        {i ? ' ' : ''}
                        {t.text}
                      </span>
                    ))}
                    {s.form === 'question' ? '?' : '.'}
                  </span>
                  <button
                    type="button"
                    className="play-btn play-sm-btn"
                    aria-label={`Listen: ${s.text}`}
                    onClick={() => {
                      primeAudio();
                      void speakSequence(s.tokens.map(t => t.text), s.text, {rate: track.speechRate});
                    }}>
                    <SpeakerWaveIcon className="play-icon" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Your sentences show up here. Make three a day to keep your streak!</p>
          )}
        </section>
      </main>
    </div>
  );
}

function TileGrid({
  tiles,
  role,
  onPick,
  disabled = false,
  highlight,
}: {
  tiles: LabTile[];
  role: 'subject' | 'verb' | 'object' | 'time';
  onPick: (t: LabTile) => void;
  disabled?: boolean;
  highlight: string | null;
}) {
  return (
    <div className="lab-tiles">
      {tiles.map(t => (
        <button key={t.id} type="button" className={`lab-tile role-${role}${highlight === t.id ? ' is-hint' : ''}`} disabled={disabled} onClick={() => onPick(t)}>
          {t.picture ? <Picture value={t.picture} label="" size="sm" /> : null}
          <span className="lab-tile-text">{t.text}</span>
        </button>
      ))}
    </div>
  );
}

function TextTiles({
  options,
  role,
  onPick,
  disabled = false,
  highlight,
}: {
  options: string[];
  role: 'verb';
  onPick: (s: string) => void;
  disabled?: boolean;
  highlight: string | null;
}) {
  return (
    <div className="lab-tiles">
      {options.map(o => (
        <button key={o} type="button" className={`lab-tile role-${role}${highlight === o ? ' is-hint' : ''}`} disabled={disabled} onClick={() => onPick(o)}>
          <span className="lab-tile-text">{o}</span>
        </button>
      ))}
    </div>
  );
}
