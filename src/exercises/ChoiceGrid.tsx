import type {PointerEvent} from 'react';
import {CheckIcon, XMarkIcon} from '@heroicons/react/24/solid';
import {Picture} from '../components/Picture';
import type {Choice} from './options';

interface Props {
  label: string;
  choices: Choice[];
  selected: string | null;
  onSelect: (key: string) => void;
  /** After Check: the grid is read-only and shows right/wrong. */
  locked: boolean;
  correctKey: string;
  /** Hide the text and show only pictures (never: kids need the word too). */
  big?: boolean;
}

/** Ripple from the touch point (CSS draws it; this only sets where). */
function ripple(e: PointerEvent<HTMLButtonElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--rx', `${e.clientX - r.left}px`);
  el.style.setProperty('--ry', `${e.clientY - r.top}px`);
  el.classList.remove('rippling');
  // Restart the CSS animation.
  void el.offsetWidth;
  el.classList.add('rippling');
}

export function ChoiceGrid({label, choices, selected, onSelect, locked, correctKey, big = false}: Props) {
  return (
    <div className={`choice-grid${big ? ' is-big' : ''}`} role="group" aria-label={label}>
      {choices.map(c => {
        const isSel = selected === c.key;
        const state = locked ? (c.key === correctKey ? 'right' : isSel ? 'wrong' : 'muted') : isSel ? 'selected' : '';
        return (
          <button
            key={c.key}
            type="button"
            className={`choice ${c.role ? `role-${c.role}` : ''} ${state ? `is-${state}` : ''}`}
            aria-pressed={isSel}
            aria-disabled={locked || undefined}
            onPointerDown={locked ? undefined : ripple}
            onClick={() => {
              if (!locked) onSelect(c.key);
            }}>
            {c.picture ? <Picture value={c.picture} label="" size="sm" /> : null}
            <span className="choice-text">{c.text}</span>
            {state === 'right' ? (
              <>
                <CheckIcon className="choice-mark" aria-hidden="true" />
                <span className="visually-hidden"> (right answer)</span>
              </>
            ) : null}
            {state === 'wrong' ? (
              <>
                <XMarkIcon className="choice-mark" aria-hidden="true" />
                <span className="visually-hidden"> (your answer)</span>
              </>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
