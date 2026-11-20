import {createContext, use, useCallback, useEffect, useMemo, useRef, useState, type ReactNode} from 'react';
import type {Learner, Track, TrackId} from '../content/types';
import {allLearners} from '../content/index';
import {formatDay, isValidDayKey, type DayKey} from '../lib/dates';
import {getBackend} from '../server/index';
import {InvalidSession, type Backend, type OverviewRow} from '../server/backend';
import {emptyProgress, isLearnerProgress, normalizeProgress, type LearnerProgress} from '../state/model';
import {setTeacherSession, type AuthSession} from '../state/session';
import {KEYS, readJSON, removeKey} from '../state/storage';

/**
 * What the teacher panel shows, read from the server: every learner's
 * progress document (saved there by their phones) and the teacher's own
 * week ticks and notes. Refreshes every minute while the tab is open, when
 * the window gets focus, and on "Refresh".
 */
export interface TeacherLearner {
  learner: Learner;
  track: Track;
  progress: LearnerProgress;
  /** "Last sync 3 Jun" or "Not started yet". */
  source: string;
  started: boolean;
  hasPin: boolean;
  updatedAt: string | null;
}

export interface WeekState {
  taught: boolean;
  canDo: Record<string, boolean>;
  notes: string;
}

export interface TeacherState {
  courseStart: DayKey;
  weeks: Record<string, WeekState>;
}

export const weekKey = (trackId: TrackId, week: number) => `${trackId}-${week}`;
export const emptyWeek = (): WeekState => ({taught: false, canDo: {}, notes: ''});

export function isTeacherState(v: unknown): v is TeacherState {
  return typeof v === 'object' && v !== null && isValidDayKey((v as TeacherState).courseStart) && typeof (v as TeacherState).weeks === 'object';
}

/** Course weeks are counted from courseStart: week 1 is its first 7 days. */
export function currentWeek(courseStart: DayKey, today: DayKey): number {
  const [ay, am, ad] = courseStart.split('-').map(Number);
  const [by, bm, bd] = today.split('-').map(Number);
  const days = Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000);
  return Math.floor(days / 7) + 1;
}

/** Pure, for tests: the server rows → one entry per learner in the course (in course order). */
export function toTeacherLearners(rows: OverviewRow[]): TeacherLearner[] {
  const byId = new Map(rows.map(r => [r.userId, r]));
  return allLearners().map(({learner, track}) => {
    const row = byId.get(learner.id);
    const doc = row?.doc;
    const ok = isLearnerProgress(doc) && doc.learnerId === learner.id;
    const progress = ok ? normalizeProgress(doc) : emptyProgress(learner.id, track.id);
    const started = ok && row?.updatedAt != null;
    return {
      learner,
      track,
      progress,
      started,
      hasPin: row?.hasPin ?? false,
      updatedAt: row?.updatedAt ?? null,
      source: started && row?.updatedAt ? `Last sync ${formatDay(row.updatedAt.slice(0, 10))}` : 'Not started yet',
    };
  });
}

export type SaveState = 'saved' | 'saving' | 'error';

interface TeacherData {
  learners: TeacherLearner[];
  loading: boolean;
  error: string | null;
  refreshedAt: number | null;
  refresh: () => void;
  state: TeacherState;
  saveState: SaveState;
  setCourseStart: (day: DayKey) => void;
  updateWeek: (key: string, patch: Partial<WeekState>) => void;
  setPin: (userId: string, pin: string) => Promise<void>;
}

const TeacherDataContext = createContext<TeacherData | null>(null);

const REFRESH_MS = 60_000;
const SAVE_DEBOUNCE_MS = 1000;

export function TeacherDataProvider({session, today, children, backend = getBackend}: {session: AuthSession; today: DayKey; children: ReactNode; backend?: () => Promise<Backend>}) {
  const [learners, setLearners] = useState<TeacherLearner[]>(() => toTeacherLearners([]));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number | null>(null);
  const [state, setState] = useState<TeacherState>({courseStart: today, weeks: {}});
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const version = useRef(0);
  const latestState = useRef(state);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const token = session.token;

  const handle = useCallback((e: unknown) => {
    if (e instanceof InvalidSession) {
      setTeacherSession(null); // back to the PIN screen
      return;
    }
    setError(e instanceof Error && e.message ? 'Could not reach the server. Check the internet and try again.' : 'Something went wrong.');
  }, []);

  const refresh = useCallback(async () => {
    try {
      const b = await backend();
      const rows = await b.teacherOverview(token);
      setLearners(toTeacherLearners(rows));
      setRefreshedAt(Date.now());
      setError(null);
    } catch (e) {
      handle(e);
    } finally {
      setLoading(false);
    }
  }, [backend, token, handle]);

  // Teacher state: load once; move the old browser-only notes to the server the first time.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const b = await backend();
        const r = await b.getTeacherState(token);
        version.current = r.version;
        let doc = isTeacherState(r.doc) ? r.doc : null;
        const legacy = readJSON<TeacherState | null>(KEYS.teacher, null, (v): v is TeacherState | null => v === null || isTeacherState(v));
        if (!doc && legacy) {
          const saved = await b.saveTeacherState(token, legacy, r.version);
          if (saved.ok) {
            version.current = saved.version;
            doc = legacy;
            removeKey(KEYS.teacher);
          }
        }
        if (!cancelled && doc) {
          latestState.current = doc;
          setState(doc);
        }
      } catch (e) {
        if (!cancelled) handle(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [backend, token, handle]);

  // Learners: now, every minute while visible, and on focus.
  useEffect(() => {
    void refresh();
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(tick);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  const pushState = useCallback(async () => {
    saveTimer.current = null;
    setSaveState('saving');
    try {
      const b = await backend();
      // One teacher: on a version clash, take the newest version number and write ours (last write wins).
      for (let i = 0; i < 3; i++) {
        const r = await b.saveTeacherState(token, latestState.current, version.current);
        version.current = r.version;
        if (r.ok) {
          setSaveState('saved');
          return;
        }
      }
      setSaveState('error');
    } catch (e) {
      setSaveState('error');
      handle(e);
    }
  }, [backend, token, handle]);

  const change = useCallback(
    (fn: (s: TeacherState) => TeacherState) => {
      const next = fn(latestState.current);
      latestState.current = next;
      setState(next);
      setSaveState('saving');
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void pushState(), SAVE_DEBOUNCE_MS);
    },
    [pushState],
  );

  // Don't lose a pending note when the panel closes.
  useEffect(
    () => () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        void pushState();
      }
    },
    [pushState],
  );

  const setCourseStart = useCallback((day: DayKey) => change(s => ({...s, courseStart: day})), [change]);
  const updateWeek = useCallback(
    (key: string, patch: Partial<WeekState>) => change(s => ({...s, weeks: {...s.weeks, [key]: {...(s.weeks[key] ?? emptyWeek()), ...patch}}})),
    [change],
  );

  const setPin = useCallback(
    async (userId: string, pin: string) => {
      const b = await backend();
      try {
        await b.setPin(token, userId, pin);
      } catch (e) {
        if (e instanceof InvalidSession) setTeacherSession(null);
        throw e;
      }
      void refresh();
    },
    [backend, token, refresh],
  );

  const value = useMemo<TeacherData>(
    () => ({learners, loading, error, refreshedAt, refresh: () => void refresh(), state, saveState, setCourseStart, updateWeek, setPin}),
    [learners, loading, error, refreshedAt, refresh, state, saveState, setCourseStart, updateWeek, setPin],
  );
  return <TeacherDataContext value={value}>{children}</TeacherDataContext>;
}

function useTeacherData(): TeacherData {
  const v = use(TeacherDataContext);
  if (!v) throw new Error('needs <TeacherDataProvider>');
  return v;
}

/** All four learners from the server (empty progress until a learner first syncs). */
export function useTeacherLearners() {
  const {learners, loading, error, refreshedAt, refresh, setPin} = useTeacherData();
  return {learners, loading, error, refreshedAt, refresh, setPin};
}

/** The teacher's ticks, notes and course start, saved on the server. */
export function useTeacherState(_today?: DayKey) {
  const {state, saveState, setCourseStart, updateWeek} = useTeacherData();
  return {state, saveState, setCourseStart, updateWeek};
}
