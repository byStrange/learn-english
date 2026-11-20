/**
 * localStorage, wrapped so a full or blocked storage (Safari private mode)
 * never crashes the app: it falls back to memory and `storageOk()` turns false,
 * so the UI can say once that progress can't be saved on this browser.
 */
const memory = new Map<string, string>();
let ok = true;

export const KEYS = {
  /** The local copy (offline cache) of one learner's progress. */
  learner: (id: string) => `le:v1:learner:${id}`,
  /** Set while that learner has changes the server hasn't got yet. */
  outbox: (id: string) => `le:v1:outbox:${id}`,
  /** The server version the local copy was last synced with. */
  syncVersion: (id: string) => `le:v1:sync-version:${id}`,
  /** The logged-in learner on this phone (one at a time). */
  session: 'le:v1:session',
  teacherSession: 'le:v1:teacher-session',
  /** Before the server: the teacher's ticks and notes lived here. Uploaded once, then removed. */
  teacher: 'le:v1:teacher',
} as const;

function store(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function storageOk(): boolean {
  return ok;
}

export function readRaw(key: string): string | null {
  const s = store();
  if (s) {
    try {
      const v = s.getItem(key);
      if (v !== null) return v;
    } catch {
      ok = false;
    }
  }
  return memory.get(key) ?? null;
}

export function writeRaw(key: string, value: string): void {
  memory.set(key, value);
  const s = store();
  if (!s) {
    ok = false;
    return;
  }
  try {
    s.setItem(key, value);
  } catch {
    ok = false;
  }
}

export function removeKey(key: string): void {
  memory.delete(key);
  try {
    store()?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * Reads JSON; anything that doesn't parse or doesn't pass `isValid` is kept
 * under "<key>:backup" and `fallback` is returned, so the app starts fresh
 * instead of crashing.
 */
export function readJSON<T>(key: string, fallback: T, isValid: (v: unknown) => v is T): T {
  const raw = readRaw(key);
  if (raw === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isValid(parsed)) return parsed;
  } catch {
    /* fall through */
  }
  writeRaw(`${key}:backup`, raw);
  return fallback;
}

export function writeJSON(key: string, value: unknown): void {
  writeRaw(key, JSON.stringify(value));
}

/** Tests only. */
export function _resetStorageForTests(): void {
  memory.clear();
  ok = true;
}
