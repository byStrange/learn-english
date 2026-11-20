import type {TrackId} from '../content/types';

/**
 * What the app needs from the server. Two implementations: Supabase (the live
 * server) and an in-browser fake for development and tests. Both follow the
 * same rules: PIN login with a lockout, a session token, and versioned saves
 * that refuse to overwrite a newer copy.
 */

export type Role = 'learner' | 'teacher';

export type LoginResult =
  | {ok: true; token: string; userId: string; role: Role; trackId: TrackId | null; expiresAt: string}
  | {ok: false; reason: 'unknown' | 'no_pin' | 'network'}
  | {ok: false; reason: 'wrong_pin'; triesLeft: number}
  | {ok: false; reason: 'locked'; retryAfterS: number};

export interface VersionedDoc {
  doc: unknown;
  version: number;
}

export type SaveResult = {ok: true; version: number} | {ok: false; version: number; doc: unknown};

export interface OverviewRow {
  userId: string;
  trackId: TrackId | null;
  displayName: string;
  hasPin: boolean;
  doc: unknown | null;
  version: number;
  updatedAt: string | null;
  lastLogin: string | null;
}

export interface Backend {
  readonly kind: 'supabase' | 'fake';
  login(userId: string, pin: string): Promise<LoginResult>;
  logout(token: string): Promise<void>;
  /** null when this learner has never saved. */
  getProgress(token: string): Promise<VersionedDoc | null>;
  saveProgress(token: string, doc: unknown, expectedVersion: number): Promise<SaveResult>;
  teacherOverview(token: string): Promise<OverviewRow[]>;
  getTeacherState(token: string): Promise<VersionedDoc>;
  saveTeacherState(token: string, doc: unknown, expectedVersion: number): Promise<SaveResult>;
  setPin(token: string, userId: string, pin: string): Promise<void>;
}

/** The token expired, was logged out, or the PIN was changed: log in again. */
export class InvalidSession extends Error {
  constructor() {
    super('invalid_session');
    this.name = 'InvalidSession';
  }
}

/** The server couldn't be reached (offline, timeout). Retry later. */
export class NetworkError extends Error {
  constructor(message = 'network') {
    super(message);
    this.name = 'NetworkError';
  }
}

/** The server said no for another reason (bad PIN format, forbidden…). */
export class ServerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServerError';
  }
}

export const LEARNER_PIN_LENGTH = 4;
export const TEACHER_PIN_LENGTH = 6;

export function isPinFormat(pin: string, role: Role): boolean {
  return (role === 'teacher' ? /^\d{6}$/ : /^\d{4}$/).test(pin);
}
