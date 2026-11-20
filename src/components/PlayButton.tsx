import {useEffect, useRef, useState} from 'react';
import {SpeakerWaveIcon} from '@heroicons/react/24/solid';
import {isAudioAvailable, speak, SLOW_RATE} from '../lib/speech';

interface Props {
  text: string;
  audio?: string;
  rate: number;
  /** "Play the word" / "Play the sentence". */
  label?: string;
  size?: 'sm' | 'lg';
  slow?: boolean;
  /** Play once when shown (only after the lesson's first tap). */
  autoPlay?: boolean;
}

/** Big round play button, with an optional slow button. Bars move only while sound plays. */
export function PlayButton({text, audio, rate, label = 'Play the word', size = 'lg', slow = false, autoPlay = false}: Props) {
  const [playing, setPlaying] = useState<'normal' | 'slow' | null>(null);
  const alive = useRef(true);
  const available = isAudioAvailable(audio, text);

  const play = (which: 'normal' | 'slow') => {
    setPlaying(which);
    void speak(text, {rate: which === 'slow' ? SLOW_RATE : rate, audio}).then(() => {
      if (alive.current) setPlaying(null);
    });
  };

  useEffect(() => {
    alive.current = true;
    if (autoPlay && available) {
      const t = setTimeout(() => play('normal'), 250);
      return () => {
        clearTimeout(t);
        alive.current = false;
      };
    }
    return () => {
      alive.current = false;
    };
    // Play once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!available) return null;
  return (
    <span className={`play-group play-${size}`}>
      <button type="button" className={`play-btn${playing === 'normal' ? ' is-playing' : ''}`} aria-label={label} onClick={() => play('normal')}>
        <SpeakerWaveIcon className="play-icon" aria-hidden="true" />
        <span className="sound-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </button>
      {slow ? (
        <button type="button" className={`play-btn play-slow${playing === 'slow' ? ' is-playing' : ''}`} aria-label="Play slowly" onClick={() => play('slow')}>
          <span className="play-slow-text" aria-hidden="true">
            Slow
          </span>
        </button>
      ) : null}
      <span className="visually-hidden" role="status">
        {playing ? 'Playing…' : ''}
      </span>
    </span>
  );
}

/** Shown instead of a play button when the device can't make sound. */
export function SoundFallback({text, onReveal, revealed}: {text: string; onReveal: () => void; revealed: boolean}) {
  return (
    <div className="sound-fallback">
      <p>Sound isn't working on this device.</p>
      {revealed ? (
        <p className="sound-fallback-word">{text}</p>
      ) : (
        <button type="button" className="tile-btn" onClick={onReveal}>
          Show the word
        </button>
      )}
    </div>
  );
}
