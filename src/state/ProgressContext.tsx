import {createContext, use, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode} from 'react';
import type {HintLang} from '../content/types';
import {allLearners} from '../content/index';
import type {DayKey} from '../lib/dates';
import {getBackend} from '../server/index';
import type {Backend} from '../server/backend';
import {KEYS, readJSON, storageOk, writeJSON} from './storage';
import {
  applyFlashcard,
  applySentence,
  applySession,
  emptyProgress,
  isLearnerProgress,
  normalizeProgress,
  type LabSentence,
  type LearnerProgress,
  type SessionInput,
} from './model';
import {SyncEngine, type SyncStatus} from './sync';

export interface ProgressApi {
  /** Progress per learner id (the local copies; the logged-in learner's is kept in sync with the server). */
  all: Record<string, LearnerProgress>;
  get: (learnerId: string) => LearnerProgress;
  completeSession: (learnerId: string, input: SessionInput, today: DayKey) => LearnerProgress;
  gradeFlashcard: (learnerId: string, itemId: string, correct: boolean, today: DayKey) => void;
  setHint: (learnerId: string, hint: HintLang) => void;
  /** A sentence made in the Tenses lab. */
  addSentence: (learnerId: string, sentence: LabSentence) => void;
  /** After a PIN login: fetch the server copy and merge it into this phone's. */
  pullFromServer: (learnerId: string) => Promise<void>;
  /** Push any unsent changes now (before logging out). */
  flush: () => Promise<void>;
  sync: SyncEngine;
  /** False once the browser refused to save locally (private mode, full storage). */
  canSave: boolean;
}

export const ProgressContext = createContext<ProgressApi | null>(null);

export function loadLearner(learnerId: string, trackId: 'g1' | 'g2'): LearnerProgress {
  const fallback = emptyProgress(learnerId, trackId);
  const p = readJSON(KEYS.learner(learnerId), fallback, isLearnerProgress);
  // A stored blob for another learner/track is not trusted.
  return p.learnerId === learnerId && p.trackId === trackId ? normalizeProgress(p) : fallback;
}

export function loadAll(): Record<string, LearnerProgress> {
  const out: Record<string, LearnerProgress> = {};
  for (const {track, learner} of allLearners()) out[learner.id] = loadLearner(learner.id, track.id);
  return out;
}

export function ProgressProvider({children, backend}: {children: ReactNode; backend?: () => Promise<Backend>}) {
  const [all, setAll] = useState(loadAll);
  const [canSave, setCanSave] = useState(true);
  // The latest value, so two actions in one event both build on each other.
  const latest = useRef(all);

  /** Save the local copy (the offline cache). */
  const store = useCallback((next: LearnerProgress) => {
    latest.current = {...latest.current, [next.learnerId]: next};
    writeJSON(KEYS.learner(next.learnerId), next);
    setCanSave(storageOk());
    setAll(latest.current);
  }, []);

  const [engine] = useState(
    () =>
      new SyncEngine({
        backend: backend ?? getBackend,
        read: id => latest.current[id],
        // Writes coming from a merge: store them, but they don't need pushing again by themselves.
        write: next => store(next),
      }),
  );

  useEffect(() => engine.attach(), [engine]);

  /** A change made on this phone: save it, then push it to the server soon. */
  const commit = useCallback(
    (next: LearnerProgress) => {
      store(next);
      engine.markDirty(next.learnerId);
    },
    [store, engine],
  );

  const get = useCallback((id: string) => latest.current[id] ?? all[id], [all]);
  const now = () => new Date().toISOString();

  const completeSession = useCallback(
    (learnerId: string, input: SessionInput, today: DayKey) => {
      const next = applySession(latest.current[learnerId], input, today, now());
      commit(next);
      return next;
    },
    [commit],
  );

  const gradeFlashcard = useCallback(
    (learnerId: string, itemId: string, correct: boolean, today: DayKey) => {
      commit(applyFlashcard(latest.current[learnerId], itemId, correct, today, now()));
    },
    [commit],
  );

  const setHint = useCallback(
    (learnerId: string, hint: HintLang) => {
      const p = latest.current[learnerId];
      commit({...p, settings: {...p.settings, hint}, updatedAt: now()});
    },
    [commit],
  );

  const addSentence = useCallback(
    (learnerId: string, sentence: LabSentence) => commit(applySentence(latest.current[learnerId], sentence, now())),
    [commit],
  );

  const pullFromServer = useCallback((learnerId: string) => engine.pull(learnerId), [engine]);
  const flush = useCallback(() => engine.flush(), [engine]);

  const api = useMemo<ProgressApi>(
    () => ({all, get, completeSession, gradeFlashcard, setHint, addSentence, pullFromServer, flush, sync: engine, canSave}),
    [all, get, completeSession, gradeFlashcard, setHint, addSentence, pullFromServer, flush, engine, canSave],
  );
  return <ProgressContext value={api}>{children}</ProgressContext>;
}

export function useProgress(): ProgressApi {
  const api = use(ProgressContext);
  if (!api) throw new Error('useProgress needs <ProgressProvider>');
  return api;
}

/** 'synced' | 'saving' | 'offline' | 'error' | 'idle' for the logged-in learner. */
export function useSyncStatus(): SyncStatus {
  const {sync} = useProgress();
  return useSyncExternalStore(sync.subscribe, sync.getStatus, sync.getStatus);
}
