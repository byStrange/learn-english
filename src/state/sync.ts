import {InvalidSession, NetworkError, type Backend} from '../server/backend';
import {isLearnerProgress, normalizeProgress, type LearnerProgress} from './model';
import {mergeProgress, sameProgress} from './merge';
import {getLearnerSession, isSessionValid, setLearnerSession, type AuthSession} from './session';
import {KEYS, readRaw, removeKey, writeRaw} from './storage';

/**
 * Keeps the logged-in learner's progress on the server.
 *
 * The phone always saves locally first (so a lesson works with no internet),
 * marks an "outbox" flag, and pushes about a second later. The server only
 * accepts a save made on top of its latest version; when another phone saved
 * in between, the two copies are merged (mergeProgress) and pushed again.
 */
export type SyncStatus = 'idle' | 'saving' | 'synced' | 'offline' | 'error';

export interface SyncDeps {
  backend: () => Promise<Backend>;
  /** The local copy of a learner's progress. */
  read: (learnerId: string) => LearnerProgress;
  /** Replace the local copy (after a merge). Must NOT mark the outbox again. */
  write: (p: LearnerProgress) => void;
  session?: () => AuthSession | null;
  /** The server no longer accepts the token (expired, logged out, PIN changed). */
  onInvalidSession?: () => void;
  debounceMs?: number;
}

const MAX_CONFLICT_RETRIES = 3;

export class SyncEngine {
  private status: SyncStatus = 'idle';
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running: Promise<void> | null = null;
  private again = false;
  private readonly deps: Required<Omit<SyncDeps, 'onInvalidSession'>> & Pick<SyncDeps, 'onInvalidSession'>;

  constructor(deps: SyncDeps) {
    this.deps = {session: getLearnerSession, debounceMs: 1000, ...deps};
  }

  getStatus = (): SyncStatus => this.status;

  subscribe = (l: () => void): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  private set(s: SyncStatus) {
    if (this.status === s) return;
    this.status = s;
    for (const l of this.listeners) l();
  }

  hasOutbox(learnerId: string): boolean {
    return readRaw(KEYS.outbox(learnerId)) === '1';
  }
  private setOutbox(learnerId: string, on: boolean) {
    if (on) writeRaw(KEYS.outbox(learnerId), '1');
    else removeKey(KEYS.outbox(learnerId));
  }
  version(learnerId: string): number {
    return Number(readRaw(KEYS.syncVersion(learnerId))) || 0;
  }
  private setVersion(learnerId: string, v: number) {
    writeRaw(KEYS.syncVersion(learnerId), String(v));
  }

  private activeSession(learnerId?: string): AuthSession | null {
    const s = this.deps.session();
    if (!isSessionValid(s) || s.role !== 'learner') return null;
    if (learnerId && s.userId !== learnerId) return null;
    return s;
  }

  /** A local change: remember it and push soon. */
  markDirty(learnerId: string): void {
    this.setOutbox(learnerId, true);
    if (!this.activeSession(learnerId)) return;
    this.set('saving');
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, this.deps.debounceMs);
  }

  /** Push now (also used on 'online' and when the page is hidden). */
  flush(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    const s = this.activeSession();
    if (!s) return Promise.resolve();
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = this.push(s).finally(() => {
      this.running = null;
      if (this.again) {
        this.again = false;
        void this.flush();
      }
    });
    return this.running;
  }

  /** After login (and on opening the app): get the server copy and merge it with this phone's. */
  async pull(learnerId: string): Promise<void> {
    const s = this.activeSession(learnerId);
    if (!s) return;
    this.set('saving');
    try {
      const backend = await this.deps.backend();
      const r = await backend.getProgress(s.token);
      const local = this.deps.read(learnerId);
      if (r && isLearnerProgress(r.doc) && r.doc.learnerId === learnerId) {
        const server = normalizeProgress(r.doc);
        const merged = mergeProgress(local, server);
        this.setVersion(learnerId, r.version);
        if (!sameProgress(merged, local)) this.deps.write(merged);
        if (sameProgress(merged, server)) {
          this.setOutbox(learnerId, false);
          this.set('synced');
          return;
        }
      } else {
        this.setVersion(learnerId, r ? r.version : 0);
      }
      this.setOutbox(learnerId, true);
      await this.flush();
    } catch (e) {
      this.fail(e);
    }
  }

  private async push(s: AuthSession): Promise<void> {
    const id = s.userId;
    if (!this.hasOutbox(id)) {
      this.set('synced');
      return;
    }
    this.set('saving');
    try {
      const backend = await this.deps.backend();
      for (let attempt = 0; attempt <= MAX_CONFLICT_RETRIES; attempt++) {
        const sent = this.deps.read(id);
        const res = await backend.saveProgress(s.token, sent, this.version(id));
        if (res.ok) {
          this.setVersion(id, res.version);
          // Something changed while the save was on its way: keep the flag, go again.
          if (sameProgress(this.deps.read(id), sent)) this.setOutbox(id, false);
          else this.again = true;
          this.set('synced');
          return;
        }
        // Another phone saved first: merge its copy into ours and try again on top of it.
        this.setVersion(id, res.version);
        if (isLearnerProgress(res.doc) && res.doc.learnerId === id) {
          this.deps.write(mergeProgress(this.deps.read(id), normalizeProgress(res.doc)));
        }
      }
      this.set('error');
    } catch (e) {
      this.fail(e);
    }
  }

  private fail(e: unknown) {
    if (e instanceof InvalidSession) {
      setLearnerSession(null);
      this.set('error');
      this.deps.onInvalidSession?.();
      return;
    }
    if (e instanceof NetworkError || e instanceof TypeError) {
      this.set('offline');
      return;
    }
    this.set('error');
  }

  /** Push when the connection comes back and when the learner leaves the page. */
  attach(): () => void {
    if (typeof window === 'undefined') return () => {};
    const onOnline = () => void this.flush();
    const onHide = () => {
      if (document.visibilityState === 'hidden') void this.flush();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onHide);
    };
  }
}
