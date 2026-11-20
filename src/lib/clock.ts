import {isValidDayKey, todayKey, type DayKey} from './dates';

/**
 * Today's date key on this device. In development only, `?today=YYYY-MM-DD`
 * in the page URL (before the #) pretends it is another day, to try the
 * spaced review and streak without waiting.
 */
export function currentDay(): DayKey {
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    const fake = new URLSearchParams(window.location.search).get('today');
    if (isValidDayKey(fake)) return fake;
  }
  return todayKey();
}
