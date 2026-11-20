import {useState} from 'react';
import {TextInput} from '@curialy/ui/TextInput';
import type {Exercise} from '../content/types';
import {getItem, hintText} from '../content/index';
import {isAudioAvailable} from '../lib/speech';
import {Picture} from '../components/Picture';
import {PlayButton, SoundFallback} from '../components/PlayButton';
import {ChoiceGrid} from './ChoiceGrid';
import {normalizeTyped, verbChoices, wordChoices} from './options';
import type {ExerciseProps} from './types';

type Of<T extends Exercise['type']> = Extract<Exercise, {type: T}>;

/** See a picture (or the hint) → pick the English word. */
export function PickWord({exercise, track, hintLang, pool, seed, locked, onPending}: ExerciseProps<Of<'pick-word'>>) {
  const item = getItem(exercise.itemId);
  const [selected, setSelected] = useState<string | null>(null);
  if (!item) return null;
  const choices = wordChoices(item.id, pool, track, seed, false);
  const hint = hintText(item, hintLang) ?? (item.picture ? undefined : hintText(item, 'uz'));
  return (
    <div className="task-body">
      <div className="prompt-box">
        <Picture value={item.picture} label={hint ? `Picture: ${hint}` : 'Picture of the word'} size="lg" />
        {hint ? <p className="prompt-hint">{hint}</p> : null}
        {!item.picture && !hint ? <PlayButton text={item.text} audio={item.audio} rate={track.speechRate} /> : null}
      </div>
      <ChoiceGrid
        label="Answers"
        choices={choices}
        selected={selected}
        locked={locked}
        correctKey={item.id}
        onSelect={key => {
          setSelected(key);
          onPending({correct: key === item.id, given: choices.find(c => c.key === key)?.text ?? key});
        }}
      />
    </div>
  );
}

/** Hear a word → pick it. Group 2 sees a picture on every option. */
export function ListenPick({exercise, track, pool, seed, locked, autoPlay, onPending}: ExerciseProps<Of<'listen-pick'>>) {
  const item = getItem(exercise.itemId);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  if (!item) return null;
  const kids = track.mode === 'kids';
  const choices = wordChoices(item.id, pool, track, seed, kids);
  return (
    <div className="task-body">
      <div className="prompt-box">
        {isAudioAvailable(item.audio, item.text) ? (
          <PlayButton text={item.text} audio={item.audio} rate={track.speechRate} slow autoPlay={autoPlay} />
        ) : (
          <SoundFallback text={item.text} revealed={revealed} onReveal={() => setRevealed(true)} />
        )}
      </div>
      <ChoiceGrid
        label="Answers"
        choices={choices}
        selected={selected}
        locked={locked}
        correctKey={item.id}
        onSelect={key => {
          setSelected(key);
          onPending({correct: key === item.id, given: choices.find(c => c.key === key)?.text ?? key});
        }}
      />
    </div>
  );
}

/** Hear a word → type it (Group 1). */
export function ListenType({exercise, track, locked, autoPlay, onPending}: ExerciseProps<Of<'listen-type'>>) {
  const item = getItem(exercise.itemId);
  const [value, setValue] = useState('');
  const [revealed, setRevealed] = useState(false);
  if (!item) return null;
  return (
    <div className="task-body">
      <div className="prompt-box">
        {isAudioAvailable(item.audio, item.text) ? (
          <PlayButton text={item.text} audio={item.audio} rate={track.speechRate} slow autoPlay={autoPlay} />
        ) : (
          <SoundFallback text={item.text} revealed={revealed} onReveal={() => setRevealed(true)} />
        )}
      </div>
      <div className="type-field">
        <TextInput
          label="Type what you hear"
          value={value}
          isReadOnly={locked}
          autoComplete="off"
          hasSpellCheck={false}
          onChange={v => {
            setValue(v);
            onPending(v.trim() ? {correct: normalizeTyped(v) === normalizeTyped(item.text), given: v.trim()} : null);
          }}
        />
      </div>
    </div>
  );
}

/** "go → V2?" */
export function VerbForm({exercise, track, pool, seed, locked, onPending}: ExerciseProps<Of<'verb-form'>>) {
  const item = getItem(exercise.verbId);
  const [selected, setSelected] = useState<string | null>(null);
  const v = item?.verb;
  if (!v) return null;
  const choices = verbChoices(v.id, exercise.ask, pool, track, seed);
  const right = v[exercise.ask];
  return (
    <div className="task-body">
      <div className="prompt-box">
        <p className="verb-prompt">
          <span className="vform">
            <span className="vform-label">V1</span>
            <span className="vform-word">{v.v1}</span>
          </span>
          <span className="vform-arrow" aria-hidden="true">
            →
          </span>
          <span className="vform is-ask">
            <span className="vform-label">{exercise.ask.toUpperCase()}</span>
            <span className="vform-word">?</span>
          </span>
        </p>
        <PlayButton text={v.v1} audio={v.audio} rate={track.speechRate} label={`Play “${v.v1}”`} size="sm" />
      </div>
      <ChoiceGrid
        label="Answers"
        choices={choices}
        selected={selected}
        locked={locked}
        correctKey={right}
        onSelect={key => {
          setSelected(key);
          onPending({correct: key === right, given: key});
        }}
      />
    </div>
  );
}
