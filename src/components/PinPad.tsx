import {useEffect, useRef, useState, type KeyboardEvent} from 'react';
import {BackspaceIcon} from '@heroicons/react/24/outline';
import {Spinner} from '@curialy/ui/Spinner';
import type {LoginResult} from '../server/backend';

/** What the pad shows after a try. `ok` means the parent takes over (navigates away). */
export type PinResult = LoginResult | {ok: false; reason: 'mismatch'} | {ok: false; reason: 'error'; message: string};

interface Props {
  length: 4 | 6;
  /** Names the pad for screen readers, e.g. "PIN for Said Ali". */
  label: string;
  onSubmit: (pin: string) => Promise<PinResult>;
  disabled?: boolean;
  /** Focus the pad when it appears, so desktop number keys work straight away. */
  autoFocus?: boolean;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'] as const;
const ERROR_MS = 600;

export function messageFor(r: PinResult): string {
  if (r.ok) return '';
  switch (r.reason) {
    case 'wrong_pin':
      return `That PIN isn't right. ${r.triesLeft} ${r.triesLeft === 1 ? 'try' : 'tries'} left.`;
    case 'locked': {
      const minutes = Math.max(1, Math.ceil(r.retryAfterS / 60));
      return `Too many tries. Wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} or ask your teacher.`;
    }
    case 'no_pin':
      return "Your teacher hasn't set your PIN yet.";
    case 'network':
      return 'No internet. Try again.';
    case 'unknown':
      return "This name isn't on the server yet. Ask your teacher.";
    case 'mismatch':
      return "The two PINs aren't the same. Try again.";
    case 'error':
      return r.message;
  }
}

/**
 * A number pad drawn on the page: no text field, so the phone keyboard never
 * opens. Fills a row of dots and checks the PIN by itself when it is full.
 */
export function PinPad({length, label, onSubmit, disabled = false, autoFocus = true}: Props) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [message, setMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const padRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (autoFocus) padRef.current?.focus({preventScroll: true});
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [autoFocus]);

  const inactive = disabled || busy || locked;

  const submit = async (full: string) => {
    setBusy(true);
    let r: PinResult;
    try {
      r = await onSubmit(full);
    } catch {
      r = {ok: false, reason: 'network'};
    }
    setBusy(false);
    if (r.ok) return;
    setMessage(messageFor(r));
    if (r.reason === 'locked') setLocked(true);
    setError(true);
    timer.current = setTimeout(() => {
      setError(false);
      setPin('');
    }, ERROR_MS);
  };

  const press = (key: string) => {
    if (inactive || error) return;
    if (key === 'del') {
      setPin(p => p.slice(0, -1));
      return;
    }
    if (pin.length >= length) return;
    const next = pin + key;
    setPin(next);
    setMessage('');
    if (next.length === length) void submit(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (/^[0-9]$/.test(e.key)) {
      e.preventDefault();
      press(e.key);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      press('del');
    }
  };

  return (
    <div
      className={`pin${length === 6 ? ' pin-6' : ''}`}
      ref={padRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      role="group"
      aria-label={label}
    >
      <div className={`pin-dots${error ? ' is-error' : ''}`} role="img" aria-label={`${pin.length} of ${length} digits entered`}>
        {Array.from({length}, (_, i) => (
          <span key={i} className={`pin-dot${i < pin.length ? ' is-filled' : ''}`} />
        ))}
      </div>
      <div className={`pin-message${message ? ' has-message' : ''}`} aria-live="polite" role="status">
        {busy ? <Spinner size="sm" label="Checking" /> : message}
      </div>
      <div className="pin-pad">
        {KEYS.map((k, i) =>
          k === '' ? (
            <span key={i} className="pin-gap" aria-hidden="true" />
          ) : k === 'del' ? (
            <button key={i} type="button" className="pin-key pin-del" aria-label="Delete last digit" disabled={inactive || pin.length === 0} onClick={() => press('del')}>
              <BackspaceIcon aria-hidden="true" />
            </button>
          ) : (
            <button key={i} type="button" className="pin-key" disabled={inactive} onClick={() => press(k)}>
              {k}
            </button>
          ),
        )}
      </div>
    </div>
  );
}
