import {useSyncExternalStore} from 'react';
import type {TrackId} from '../content/types';
import type {Role} from '../server/backend';
import {KEYS, readJSON, removeKey, writeJSON} from './storage';

/**
 * Who is logged in on this browser. A learner session (one at a time: logging
 * in as another learner replaces it) and, separately, the teacher's session.
 * The token is what the server checks; the rest is for the screens.
 */
export interface AuthSession {
  token: string;
  userId: string;
  role: Role;
  trackId: TrackId | null;
  expiresAt: string;
}

const isSession = (v: unknown): v is AuthSession => {
  const o = v as AuthSession | null;
  return Boolean(o && typeof o.token === 'string' && typeof o.userId === 'string' && typeof o.expiresAt === 'string' && (o.role === 'learner' || o.role === 'teacher'));
};

const listeners = new Set<() => void>();
const cache: Record<string, AuthSession | null | undefined> = {};

function read(key: string): AuthSession | null {
  if (cache[key] === undefined) cache[key] = readJSON<AuthSession | null>(key, null, (v): v is AuthSession | null => v === null || isSession(v));
  return cache[key] ?? null;
}
function write(key: string, s: AuthSession | null) {
  cache[key] = s;
  if (s) writeJSON(key, s);
  else removeKey(key);
  for (const l of listeners) l();
}

export function isSessionValid(s: AuthSession | null, now = Date.now()): s is AuthSession {
  return Boolean(s && Date.parse(s.expiresAt) > now);
}

export const getLearnerSession = () => read(KEYS.session);
export const setLearnerSession = (s: AuthSession | null) => write(KEYS.session, s);
export const getTeacherSession = () => read(KEYS.teacherSession);
export const setTeacherSession = (s: AuthSession | null) => write(KEYS.teacherSession, s);

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEYS.session || e.key === KEYS.teacherSession) {
      delete cache[e.key];
      l();
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(l);
    if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage);
  };
}

/** The learner session, or null when nobody (valid) is logged in. */
export function useLearnerSession(): AuthSession | null {
  const s = useSyncExternalStore(subscribe, getLearnerSession, getLearnerSession);
  return isSessionValid(s) ? s : null;
}

export function useTeacherSession(): AuthSession | null {
  const s = useSyncExternalStore(subscribe, getTeacherSession, getTeacherSession);
  return isSessionValid(s) ? s : null;
}

/** Tests only. */
export function _resetSessionsForTests(): void {
  for (const k of Object.keys(cache)) delete cache[k];
}
