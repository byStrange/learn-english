import {allLearners} from '../content/index';
import type {TrackId} from '../content/types';
import {InvalidSession, ServerError, isPinFormat, type Backend, type LoginResult, type Role, type SaveResult} from './backend';

/**
 * A stand-in server that runs inside the browser, for `npm run dev` without a
 * Supabase project and for the tests. Same rules as the real one (lockout
 * after 5 wrong PINs in 15 minutes, versioned saves). Every learner's PIN is
 * 1234 and the teacher's is 123456. Never used by a production build.
 */
export const FAKE_LEARNER_PIN = '1234';
export const FAKE_TEACHER_PIN = '123456';

interface User {
  id: string;
  role: Role;
  trackId: TrackId | null;
  name: string;
  pin: string | null;
}
interface Db {
  users: Record<string, User>;
  progress: Record<string, {doc: unknown; version: number; updatedAt: string}>;
  teacher: {doc: unknown; version: number};
  sessions: Record<string, {userId: string; role: Role; expiresAt: number}>;
  fails: Record<string, number[]>;
}

const MAX_TRIES = 5;
const WINDOW_MS = 15 * 60 * 1000;

function seed(): Db {
  const users: Record<string, User> = {};
  for (const {track, learner} of allLearners()) {
    users[learner.id] = {id: learner.id, role: 'learner', trackId: track.id, name: learner.name, pin: FAKE_LEARNER_PIN};
  }
  users.teacher = {id: 'teacher', role: 'teacher', trackId: null, name: 'Teacher', pin: FAKE_TEACHER_PIN};
  return {users, progress: {}, teacher: {doc: {}, version: 0}, sessions: {}, fails: {}};
}

export interface FakeOptions {
  /** Keep the fake database in localStorage (dev), so a reload keeps it. */
  persistKey?: string;
  now?: () => number;
  /** Simulate being offline: every call rejects like a failed fetch. */
  offline?: () => boolean;
}

export interface FakeBackend extends Backend {
  /** Tests: look inside. */
  _db(): Db;
  _reset(): void;
}

export function createFakeBackend(opts: FakeOptions = {}): FakeBackend {
  const now = opts.now ?? (() => Date.now());
  let db: Db = load();

  function load(): Db {
    if (opts.persistKey && typeof localStorage !== 'undefined') {
      try {
        const raw = localStorage.getItem(opts.persistKey);
        if (raw) return JSON.parse(raw) as Db;
      } catch {
        /* start fresh */
      }
    }
    return seed();
  }
  function save() {
    if (opts.persistKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(opts.persistKey, JSON.stringify(db));
      } catch {
        /* memory only */
      }
    }
  }
  const clone = <T,>(v: T): T => (v === undefined || v === null ? v : (JSON.parse(JSON.stringify(v)) as T));

  async function gate() {
    // Behave like a network call: async, and failable.
    await Promise.resolve();
    if (opts.offline?.()) throw new TypeError('Failed to fetch');
  }
  function session(token: string) {
    const s = db.sessions[token];
    if (!s || s.expiresAt <= now()) throw new InvalidSession();
    return s;
  }
  function wrap<A extends unknown[], R>(fn: (...a: A) => R): (...a: A) => Promise<R> {
    return async (...a: A) => {
      await gate();
      const r = fn(...a);
      save();
      return clone(r);
    };
  }
  function storePin(userId: string, pin: string) {
    const u = db.users[userId];
    if (!u) throw new ServerError('unknown_user');
    if (!isPinFormat(pin, u.role)) throw new ServerError('pin_format');
    u.pin = pin;
    for (const [t, s] of Object.entries(db.sessions)) if (s.userId === userId) delete db.sessions[t];
    delete db.fails[userId];
  }

  return {
    kind: 'fake',

    async login(userId, pin): Promise<LoginResult> {
      try {
        await gate();
      } catch {
        return {ok: false, reason: 'network'};
      }
      const u = db.users[userId];
      if (!u) return {ok: false, reason: 'unknown'};
      if (!u.pin) return {ok: false, reason: 'no_pin'};
      const t = now();
      const recent = (db.fails[userId] ?? []).filter(at => at > t - WINDOW_MS);
      db.fails[userId] = recent;
      if (recent.length >= MAX_TRIES) {
        save();
        return {ok: false, reason: 'locked', retryAfterS: Math.max(1, Math.ceil((recent[0] + WINDOW_MS - t) / 1000))};
      }
      if (pin !== u.pin) {
        recent.push(t);
        save();
        if (recent.length >= MAX_TRIES) return {ok: false, reason: 'locked', retryAfterS: WINDOW_MS / 1000};
        return {ok: false, reason: 'wrong_pin', triesLeft: MAX_TRIES - recent.length};
      }
      delete db.fails[userId];
      const token = `fake-${userId}-${t.toString(36)}-${Math.random().toString(36).slice(2)}`;
      const days = u.role === 'teacher' ? 14 : 60;
      const expiresAt = t + days * 86_400_000;
      db.sessions[token] = {userId, role: u.role, expiresAt};
      save();
      return {ok: true, token, userId, role: u.role, trackId: u.trackId, expiresAt: new Date(expiresAt).toISOString()};
    },

    logout: wrap((token: string) => {
      delete db.sessions[token];
    }),

    getProgress: wrap((token: string) => {
      const s = session(token);
      if (s.role !== 'learner') throw new ServerError('forbidden');
      const r = db.progress[s.userId];
      return r ? {doc: r.doc, version: r.version} : null;
    }),

    saveProgress: wrap((token: string, doc: unknown, expected: number): SaveResult => {
      const s = session(token);
      if (s.role !== 'learner') throw new ServerError('forbidden');
      if (!doc || typeof doc !== 'object' || (doc as {learnerId?: unknown}).learnerId !== s.userId) throw new ServerError('bad_doc');
      const cur = db.progress[s.userId];
      const version = cur?.version ?? 0;
      if (version !== expected) return {ok: false, version, doc: cur?.doc ?? null};
      db.progress[s.userId] = {doc: clone(doc), version: version + 1, updatedAt: new Date(now()).toISOString()};
      return {ok: true, version: version + 1};
    }),

    teacherOverview: wrap((token: string) => {
      const s = session(token);
      if (s.role !== 'teacher') throw new ServerError('forbidden');
      return Object.values(db.users)
        .filter(u => u.role === 'learner')
        .map(u => ({
          userId: u.id,
          trackId: u.trackId,
          displayName: u.name,
          hasPin: Boolean(u.pin),
          doc: db.progress[u.id]?.doc ?? null,
          version: db.progress[u.id]?.version ?? 0,
          updatedAt: db.progress[u.id]?.updatedAt ?? null,
          lastLogin: null,
        }));
    }),

    getTeacherState: wrap((token: string) => {
      const s = session(token);
      if (s.role !== 'teacher') throw new ServerError('forbidden');
      return {doc: db.teacher.doc, version: db.teacher.version};
    }),

    saveTeacherState: wrap((token: string, doc: unknown, expected: number): SaveResult => {
      const s = session(token);
      if (s.role !== 'teacher') throw new ServerError('forbidden');
      if (db.teacher.version !== expected) return {ok: false, version: db.teacher.version, doc: db.teacher.doc};
      db.teacher = {doc: clone(doc), version: db.teacher.version + 1};
      return {ok: true, version: db.teacher.version};
    }),

    setPin: wrap((token: string, userId: string, pin: string) => {
      const s = session(token);
      if (s.role !== 'teacher') throw new ServerError('forbidden');
      storePin(userId, pin);
    }),

    _db: () => db,
    _reset: () => {
      db = seed();
      save();
    },
  };
}
