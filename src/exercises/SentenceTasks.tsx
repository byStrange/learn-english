import {useState} from 'react';
import type {Exercise, Tile} from '../content/types';
import {shuffle} from '../lib/reviewTasks';
import {PlayButton, SoundFallback} from '../components/PlayButton';
import {isAudioAvailable} from '../lib/speech';
import {ChoiceGrid} from './ChoiceGrid';
import {textChoices} from './options';
import type {ExerciseProps} from './types';

type Of<T extends Exercise['type']> = Extract<Exercise, {type: T}>;

interface Placed {
  /** Index in the bank. */
  i: number;
  tile: Tile;
}

/** Tap colour tiles into order; tap a placed tile to send it back. */
export function BuildSentence({exercise, track, seed, locked, onPending}: ExerciseProps<Of<'build-sentence'>>) {
  const bank = shuffle(exercise.tiles, seed);
  const [placed, setPlaced] = useState<Placed[]>([]);
  const update = (next: Placed[]) => {
    setPlaced(next);
    const words = next.map(p => p.tile.text);
    onPending(next.length ? {correct: words.join(' ') === exercise.answer.join(' '), given: words.join(' ')} : null);
  };
  const sentence = exercise.answer.join(' ');
  return (
    <div className="task-body">
      <div className="build-answer" aria-label="Your sentence" role="group">
        {placed.length === 0 ? <p className="build-empty">Tap the words below</p> : null}
        {placed.map((p, n) => (
          <button
            key={`${p.i}`}
            type="button"
            className={`tile-word g-${p.tile.role}`}
            aria-label={`${p.tile.text}, word ${n + 1}. Tap to take it out`}
            aria-disabled={locked || undefined}
            onClick={() => {
              if (!locked) update(placed.filter(x => x.i !== p.i));
            }}>
            {p.tile.text}
          </button>
        ))}
      </div>
      <div className="build-bank" role="group" aria-label="Words to use">
        {bank.map((tile, i) => {
          const used = placed.some(p => p.i === i);
          return (
            <button
              key={i}
              type="button"
              className={`tile-word g-${tile.role}${used ? ' is-used' : ''}`}
              disabled={used || locked}
              onClick={() => update([...placed, {i, tile}])}>
              {tile.text}
            </button>
          );
        })}
      </div>
      {locked && exercise.audio !== false ? (
        <div className="build-listen">
          <PlayButton text={sentence} rate={track.speechRate} label="Play the sentence" size="sm" autoPlay />
          <span className="build-listen-text">{sentence}</span>
        </div>
      ) : null}
    </div>
  );
}

/** "Yesterday I ___ to school." */
export function FillGap({exercise, seed, locked, onPending}: ExerciseProps<Of<'fill-gap'>>) {
  const [selected, setSelected] = useState<string | null>(null);
  const choices = textChoices(exercise.options, seed);
  const [before, after] = exercise.sentence.split('___');
  return (
    <div className="task-body">
      <p className="gap-sentence">
        {before}
        <span className={`gap-slot${selected ? ' is-filled' : ''}`}>
          {selected ?? <span className="visually-hidden">blank</span>}
        </span>
        {after}
      </p>
      <ChoiceGrid
        label="Answers"
        choices={choices}
        selected={selected}
        locked={locked}
        correctKey={exercise.answer}
        onSelect={key => {
          setSelected(key);
          onPending({correct: key === exercise.answer, given: key});
        }}
      />
    </div>
  );
}

/** Hear a sentence → pick e.g. every day / now / yesterday. */
export function ListenSentence({exercise, track, seed, locked, autoPlay, onPending}: ExerciseProps<Of<'listen-sentence'>>) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const choices = textChoices(exercise.options, seed, 'time');
  return (
    <div className="task-body">
      <div className="prompt-box">
        {isAudioAvailable(undefined, exercise.sentence) ? (
          <PlayButton text={exercise.sentence} rate={track.speechRate} label="Play the sentence" slow autoPlay={autoPlay} />
        ) : (
          <SoundFallback text={exercise.sentence} revealed={revealed} onReveal={() => setRevealed(true)} />
        )}
        {locked ? <p className="prompt-hint">“{exercise.sentence}”</p> : null}
      </div>
      <ChoiceGrid
        label="Answers"
        choices={choices}
        selected={selected}
        locked={locked}
        correctKey={exercise.answer}
        onSelect={key => {
          setSelected(key);
          onPending({correct: key === exercise.answer, given: key});
        }}
      />
    </div>
  );
}
