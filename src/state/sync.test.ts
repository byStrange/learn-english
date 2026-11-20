import {createFakeBackend, FAKE_LEARNER_PIN, type FakeBackend} from '../server/fakeBackend';
import {SyncEngine} from './sync';
import {emptyProgress, type LearnerProgress} from './model';
import {getLearnerSession, setLearnerSession, _resetSessionsForTests} from './session';
import {KEYS, _resetStorageForTests} from './storage';
import {streakFromDays} from '../lib/streak';

let local: Record<string, LearnerProgress>;
let offline = false;
let backend: FakeBackend;

function engine() {
  return new SyncEngine({
    backend: async () => backend,
    read: id => local[id] ?? emptyProgress(id, 'g1'),
    write: p => {
      local[p.learnerId] = p;
    },
    debounceMs: 0,
  });
}

async function signIn(id = 'abdulloh') {
  const r = await backend.login(id, FAKE_LEARNER_PIN);
  if (!r.ok) throw new Error('login');
  setLearnerSession({token: r.token, userId: r.userId, role: r.role, trackId: r.trackId, expiresAt: r.expiresAt});
  return r.token;
}

beforeEach(() => {
  localStorage.clear();
  _resetStorageForTests();
  _resetSessionsForTests();
  offline = false;
  backend = createFakeBackend({offline: () => offline});
  local = {};
});

describe('sync engine', () => {
  it('keeps the outbox while offline and sends it when back online', async () => {
    await signIn();
    const e = engine();
    local.abdulloh = {...emptyProgress('abdulloh', 'g1'), xp: 18, streak: streakFromDays(['2026-05-01'])};
    offline = true;
    e.markDirty('abdulloh');
    await e.flush();
    expect(e.getStatus()).toBe('offline');
    expect(localStorage.getItem(KEYS.outbox('abdulloh'))).toBe('1');
    expect(backend._db().progress.abdulloh).toBeUndefined();

    offline = false;
    await e.flush();
    expect(e.getStatus()).toBe('synced');
    expect(localStorage.getItem(KEYS.outbox('abdulloh'))).toBeNull();
    expect((backend._db().progress.abdulloh.doc as LearnerProgress).xp).toBe(18);
  });

  it('merges when another phone saved first, then saves the merged copy', async () => {
    const tk = await signIn();
    // The other phone: a lesson on 1 May.
    const other = {
      ...emptyProgress('abdulloh', 'g1'),
      completed: {'g1-u1-l1': {firstCompleted: '2026-05-01', lastCompleted: '2026-05-01', times: 1, bestAccuracy: 1}},
      streak: streakFromDays(['2026-05-01']),
    };
    await backend.saveProgress(tk, other, 0);
    // This phone, never synced: a lesson on 2 May.
    local.abdulloh = {
      ...emptyProgress('abdulloh', 'g1'),
      completed: {'g1-u2-l1': {firstCompleted: '2026-05-02', lastCompleted: '2026-05-02', times: 1, bestAccuracy: 1}},
      streak: streakFromDays(['2026-05-02']),
    };
    const e = engine();
    e.markDirty('abdulloh');
    await e.flush();
    const saved = backend._db().progress.abdulloh;
    expect(saved.version).toBe(2);
    expect(Object.keys((saved.doc as LearnerProgress).completed).sort()).toEqual(['g1-u1-l1', 'g1-u2-l1']);
    expect((saved.doc as LearnerProgress).streak.current).toBe(2);
    expect(Object.keys(local.abdulloh.completed).sort()).toEqual(['g1-u1-l1', 'g1-u2-l1']);
  });

  it('pull after login brings the server copy into this phone', async () => {
    const tk = await signIn('said-ali');
    await backend.saveProgress(tk, {...emptyProgress('said-ali', 'g2'), xp: 40}, 0);
    const e = engine();
    await e.pull('said-ali');
    expect(local['said-ali'].xp).toBe(40);
    expect(e.getStatus()).toBe('synced');
  });

  it('clears the session when the server no longer accepts it', async () => {
    const tk = await signIn();
    await backend.logout(tk);
    let told = false;
    const e = new SyncEngine({
      backend: async () => backend,
      read: id => local[id] ?? emptyProgress(id, 'g1'),
      write: () => {},
      debounceMs: 0,
      onInvalidSession: () => {
        told = true;
      },
    });
    e.markDirty('abdulloh');
    await e.flush();
    expect(getLearnerSession()).toBeNull();
    expect(told).toBe(true);
  });

  it('does nothing for a learner who is not logged in on this phone', async () => {
    await signIn('said-ali');
    const e = engine();
    e.markDirty('abdulloh');
    await e.flush();
    expect(backend._db().progress.abdulloh).toBeUndefined();
    expect(localStorage.getItem(KEYS.outbox('abdulloh'))).toBe('1');
  });
});
