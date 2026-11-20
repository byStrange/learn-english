/**
 * Calendar-day helpers. Day keys are 'YYYY-MM-DD' in the device's local time.
 * Day arithmetic goes through Date.UTC on the y/m/d parts, so daylight-saving
 * changes never make a day 23 or 25 hours long.
 */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function todayKey(now: Date = new Date()): DayKey {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function parts(key: DayKey): [number, number, number] {
  const [y, m, d] = key.split('-').map(Number);
  return [y, m, d];
}

function fromUTC(ms: number): DayKey {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(key: DayKey, n: number): DayKey {
  const [y, m, d] = parts(key);
  return fromUTC(Date.UTC(y, m - 1, d + n));
}

/** Whole days from a to b (b - a). */
export function diffDays(a: DayKey, b: DayKey): number {
  const [ay, am, ad] = parts(a);
  const [by, bm, bd] = parts(b);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
}

export function isValidDayKey(key: unknown): key is DayKey {
  return typeof key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

/** Monday-based weekday 0..6 for a day key. */
export function weekday(key: DayKey): number {
  const [y, m, d] = parts(key);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function formatDay(key: DayKey): string {
  const [, m, d] = parts(key);
  return `${d} ${MONTHS[m - 1]}`;
}

export function formatDayLong(key: DayKey): string {
  return `${DAYS[weekday(key)]} ${formatDay(key)}`;
}

/** "today", "yesterday", "3 days ago". */
export function relativeDay(key: DayKey | null | undefined, today: DayKey): string {
  if (!key) return 'Never';
  const n = diffDays(key, today);
  if (n <= 0) return 'Today';
  if (n === 1) return 'Yesterday';
  return `${n} days ago`;
}
