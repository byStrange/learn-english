import {addDays, type DayKey} from './dates';

export interface StreakState {
  current: number;
  longest: number;
  lastActive: DayKey | null;
  /** Unique active days, oldest first, last 90 kept. */
  activeDays: DayKey[];
}

export const emptyStreak = (): StreakState => ({current: 0, longest: 0, lastActive: null, activeDays: []});

export function recordActivity(s: StreakState, today: DayKey): StreakState {
  if (s.lastActive === today) return s;
  const current = s.lastActive === addDays(today, -1) ? s.current + 1 : 1;
  const days = s.activeDays.includes(today) ? s.activeDays : [...s.activeDays, today].sort();
  return {
    current,
    longest: Math.max(s.longest, current),
    lastActive: today,
    activeDays: days.slice(-90),
  };
}

/** What to show: the streak only lives while the last active day is today or yesterday. */
export function displayStreak(s: StreakState, today: DayKey): number {
  if (s.lastActive === today || s.lastActive === addDays(today, -1)) return s.current;
  return 0;
}

/** True when the learner was active yesterday but not yet today. */
export function isAtRisk(s: StreakState, today: DayKey): boolean {
  return s.lastActive === addDays(today, -1);
}

export function isActiveToday(s: StreakState, today: DayKey): boolean {
  return s.lastActive === today;
}

/**
 * Rebuilds a streak from its active days (used when two phones' copies are
 * merged): `current` is the run of consecutive days that ends on the last
 * active day; `longest` never drops below `longestFloor`.
 */
export function streakFromDays(activeDays: DayKey[], longestFloor = 0): StreakState {
  const days = [...new Set(activeDays)].sort().slice(-90);
  if (days.length === 0) return {current: 0, longest: Math.max(0, longestFloor), lastActive: null, activeDays: []};
  let run = 1;
  let longest = 1;
  for (let i = 1; i < days.length; i++) {
    run = addDays(days[i - 1], 1) === days[i] ? run + 1 : 1;
    longest = Math.max(longest, run);
  }
  return {current: run, longest: Math.max(longest, longestFloor, run), lastActive: days[days.length - 1], activeDays: days};
}
