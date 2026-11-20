import {describe, expect, it} from 'vitest';
import {addDays, diffDays, formatDay, isValidDayKey, relativeDay, todayKey, weekday} from './dates';

describe('day keys', () => {
  it('formats the local date', () => {
    expect(todayKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayKey(new Date(2026, 11, 31, 0, 1))).toBe('2026-12-31');
  });

  it('adds days across months, years and DST', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-10-24', 7)).toBe('2026-10-31');
  });

  it('counts whole days between keys', () => {
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2);
    expect(diffDays('2026-12-31', '2027-01-01')).toBe(1);
    expect(diffDays('2026-03-05', '2026-03-01')).toBe(-4);
  });

  it('describes days in plain words', () => {
    expect(relativeDay('2026-03-05', '2026-03-05')).toBe('Today');
    expect(relativeDay('2026-03-04', '2026-03-05')).toBe('Yesterday');
    expect(relativeDay('2026-03-01', '2026-03-05')).toBe('4 days ago');
    expect(relativeDay(null, '2026-03-05')).toBe('Never');
  });

  it('validates keys and finds weekdays (Monday = 0)', () => {
    expect(isValidDayKey('2026-03-02')).toBe(true);
    expect(isValidDayKey('2026-3-2')).toBe(false);
    expect(weekday('2026-03-02')).toBe(0);
    expect(weekday('2026-03-08')).toBe(6);
    expect(formatDay('2026-03-02')).toBe('2 Mar');
  });
});
