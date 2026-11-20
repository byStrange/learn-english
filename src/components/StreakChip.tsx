import {FireIcon} from '@heroicons/react/24/solid';

/** Flame + number + "day streak". The number is always visible text. */
export function StreakChip({count, compact = false, active = false}: {count: number; compact?: boolean; active?: boolean}) {
  const label = `${count} day streak`;
  return (
    <span className={`streak-chip${count > 0 ? ' is-on' : ''}${active ? ' is-today' : ''}`} aria-label={compact ? label : undefined}>
      <FireIcon className="streak-flame" aria-hidden="true" />
      <span className="streak-num" aria-hidden={compact ? true : undefined}>
        {count}
      </span>
      {compact ? null : <span className="streak-text">day streak</span>}
    </span>
  );
}
