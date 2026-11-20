import {useState} from 'react';
import {Button} from '@curialy/ui/Button';
import type {Exercise, FormulaCard} from '../content/types';
import {getItem, hintText} from '../content/index';
import {Picture} from '../components/Picture';
import {PlayButton} from '../components/PlayButton';
import {FormulaRows, RoleLegend} from '../components/Formula';
import type {ExerciseProps} from './types';

type Of<T extends Exercise['type']> = Extract<Exercise, {type: T}>;

/** Front: picture, word, sound. Back: hint and example. The learner grades it. */
export function Flashcard({exercise, track, hintLang, onCommit}: ExerciseProps<Of<'flashcard'>>) {
  const item = getItem(exercise.itemId);
  const [flipped, setFlipped] = useState(false);
  if (!item) return null;
  return <FlashcardView itemId={item.id} rate={track.speechRate} hintLang={hintLang} flipped={flipped} onFlip={() => setFlipped(f => !f)} onGrade={ok => onCommit(ok, ok ? 'knew it' : 'not yet')} />;
}

interface ViewProps {
  itemId: string;
  rate: number;
  hintLang: Parameters<typeof hintText>[1];
  flipped: boolean;
  onFlip: () => void;
  onGrade: (knew: boolean) => void;
}

/** Shared by lessons and the Words deck. */
export function FlashcardView({itemId, rate, hintLang, flipped, onFlip, onGrade}: ViewProps) {
  const item = getItem(itemId);
  if (!item) return null;
  const hint = hintText(item, hintLang) ?? hintText(item, 'uz');
  return (
    <div className="flashcard-wrap">
      <div className={`flashcard${flipped ? ' is-flipped' : ''}`}>
        <div className="flashcard-face flashcard-front" aria-hidden={flipped}>
          <Picture value={item.picture} label="" size="lg" />
          <p className={`flashcard-word role-text-${item.role ?? 'object'}`}>{item.text}</p>
          {item.verb ? (
            <p className="flashcard-forms">
              {item.verb.v1} · {item.verb.v2} · {item.verb.v3}
            </p>
          ) : null}
        </div>
        <div className="flashcard-face flashcard-back" aria-hidden={!flipped}>
          <p className="flashcard-word-small">{item.text}</p>
          {hint ? <p className="flashcard-hint">{hint}</p> : null}
          {item.example ? <p className="flashcard-example">{item.example}</p> : null}
        </div>
      </div>
      <div className="flashcard-tools">
        <PlayButton text={item.text} audio={item.audio} rate={rate} slow size="sm" />
        <Button label={flipped ? 'Show the front' : 'Flip card'} variant="secondary" onClick={onFlip} />
      </div>
      <div className="flashcard-grade">
        <Button label="Not yet" variant="secondary" size="lg" width="100%" onClick={() => onGrade(false)} />
        <Button label="I knew it" variant="primary" size="lg" width="100%" onClick={() => onGrade(true)} />
      </div>
    </div>
  );
}

/** The grammar formula with coloured parts, examples to hear, and "Got it". */
export function FormulaStep({card, rate}: {card: FormulaCard; rate: number}) {
  return (
    <div className="task-body formula-step">
      <FormulaRows card={card} />
      <RoleLegend />
      <ul className="formula-examples" aria-label="Examples">
        {card.examples.map(ex => (
          <li key={ex}>
            <PlayButton text={ex} rate={rate} label={`Play: ${ex}`} size="sm" />
            <span>{ex}</span>
          </li>
        ))}
      </ul>
      {card.note ? <p className="formula-note">{card.note}</p> : null}
    </div>
  );
}
