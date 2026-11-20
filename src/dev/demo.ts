/**
 * Demo build only (`npm run build:demo`): the in-browser pretend server, filled
 * with a little sample progress, and `?as=<learner|teacher>` logs straight in.
 * Used to look at every screen without real PINs. The real build never
 * includes this file (it is loaded only when MODE is 'demo').
 */
import {getBackend} from '../server/index';
import {allLearners} from '../content/index';
import {emptyProgress, type LearnerProgress} from '../state/model';
import {setLearnerSession, setTeacherSession} from '../state/session';
import {addDays, todayKey} from '../lib/dates';
import {readRaw, writeRaw} from '../state/storage';

const PIN = {learner: '1234', teacher: '123456'};

function sample(learnerId: string, trackId: 'g1' | 'g2', done: string[], today: string): LearnerProgress {
  const p = emptyProgress(learnerId, trackId);
  const days = [addDays(today, -2), addDays(today, -1)];
  for (const id of done) p.completed[id] = {firstCompleted: days[0], lastCompleted: days[1], times: 1, bestAccuracy: 0.8};
  p.streak = {current: 2, longest: 3, lastActive: days[1], activeDays: days};
  p.xp = 40;
  p.history = days.map((d, i) => ({id: `demo-${learnerId}-${i}`, date: d, kind: 'lesson' as const, lessonId: done[i] ?? done[0], correct: 8, wrong: 2, seconds: 400, mistakes: ['w-went'], xp: 18}));
  p.updatedAt = new Date().toISOString();
  return p;
}

export async function startDemo(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const as = params.get('as');
  const backend = await getBackend();
  const today = todayKey();
  if (!readRaw('le:demo:seeded')) {
    for (const {learner, track} of allLearners()) {
      const first = track.units.filter(u => u.status !== 'coming-soon');
      // Two units started, so both tenses are open on the Tenses screen.
      const done = first.slice(0, 4).map(u => u.lessons[0].id);
      const r = await backend.login(learner.id, PIN.learner);
      if (r.ok) await backend.saveProgress(r.token, sample(learner.id, track.id, done, today), 0);
    }
    writeRaw('le:demo:seeded', '1');
  }
  if (as === 'teacher') {
    const r = await backend.login('teacher', PIN.teacher);
    if (r.ok) setTeacherSession({token: r.token, userId: r.userId, role: r.role, trackId: r.trackId, expiresAt: r.expiresAt});
  } else if (as) {
    const r = await backend.login(as, PIN.learner);
    if (r.ok) setLearnerSession({token: r.token, userId: r.userId, role: r.role, trackId: r.trackId, expiresAt: r.expiresAt});
  }
}
