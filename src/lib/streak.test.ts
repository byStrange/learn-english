import {describe, expect, it} from 'vitest';
import {displayStreak, emptyStreak, isActiveToday, isAtRisk, recordActivity} from './streak';

describe('streak', () => {
  it('starts at 1 on the first active day', () => {
    const s = recordActivity(emptyStreak(), '2026-03-02');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(1);
    expect(s.lastActive).toBe('2026-03-02');
    expect(s.activeDays).toEqual(['2026-03-02']);
  });

  it('counts the same day once', () => {
    let s = recordActivity(emptyStreak(), '2026-03-02');
    s = recordActivity(s, '2026-03-02');
    expect(s.current).toBe(1);
    expect(s.activeDays).toEqual(['2026-03-02']);
  });

  it('grows on consecutive days', () => {
    let s = recordActivity(emptyStreak(), '2026-03-02');
    s = recordActivity(s, '2026-03-03');
    s = recordActivity(s, '2026-03-04');
    expect(s.current).toBe(3);
    expect(s.longest).toBe(3);
  });

  it('resets to 1 after a missed day and keeps the longest', () => {
    let s = recordActivity(emptyStreak(), '2026-03-02');
    s = recordActivity(s, '2026-03-03');
    s = recordActivity(s, '2026-03-05');
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it('shows 0 once a whole day is missed, but keeps it while yesterday counts', () => {
    let s = recordActivity(emptyStreak(), '2026-03-02');
    s = recordActivity(s, '2026-03-03');
    expect(displayStreak(s, '2026-03-03')).toBe(2);
    expect(displayStreak(s, '2026-03-04')).toBe(2);
    expect(displayStreak(s, '2026-03-05')).toBe(0);
    expect(displayStreak(emptyStreak(), '2026-03-05')).toBe(0);
  });

  it('is at risk when the last active day was yesterday', () => {
    const s = recordActivity(emptyStreak(), '2026-03-02');
    expect(isAtRisk(s, '2026-03-02')).toBe(false);
    expect(isAtRisk(s, '2026-03-03')).toBe(true);
    expect(isAtRisk(s, '2026-03-04')).toBe(false);
    expect(isActiveToday(s, '2026-03-02')).toBe(true);
  });

  it('carries across month and year ends', () => {
    let s = recordActivity(emptyStreak(), '2026-02-28');
    s = recordActivity(s, '2026-03-01');
    expect(s.current).toBe(2);
    let y = recordActivity(emptyStreak(), '2026-12-31');
    y = recordActivity(y, '2027-01-01');
    expect(y.current).toBe(2);
  });

  it('carries across a leap day', () => {
    let s = recordActivity(emptyStreak(), '2028-02-28');
    s = recordActivity(s, '2028-02-29');
    s = recordActivity(s, '2028-03-01');
    expect(s.current).toBe(3);
  });

  it('is not broken by daylight-saving changes', () => {
    // Europe/Africa clocks change on the last Sunday of March (29 March 2026).
    let s = recordActivity(emptyStreak(), '2026-03-28');
    s = recordActivity(s, '2026-03-29');
    s = recordActivity(s, '2026-03-30');
    expect(s.current).toBe(3);
    expect(displayStreak(s, '2026-03-31')).toBe(3);
  });

  it('keeps only the last 90 active days', () => {
    let s = emptyStreak();
    for (let i = 0; i < 100; i++) {
      const d = new Date(Date.UTC(2026, 0, 1 + i));
      s = recordActivity(s, d.toISOString().slice(0, 10));
    }
    expect(s.activeDays.length).toBe(90);
    expect(s.current).toBe(100);
    expect(s.activeDays.at(-1)).toBe('2026-04-10');
  });
});
