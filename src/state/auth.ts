import {getBackend} from '../server/index';
import type {Role} from '../server/backend';
import type {PinResult} from '../components/PinPad';
import {getLearnerSession, getTeacherSession, setLearnerSession, setTeacherSession} from './session';

/**
 * Logs a learner or the teacher in with a PIN. On success the session is
 * stored; the caller then pulls the progress and moves on.
 */
export async function loginWithPin(userId: string, pin: string, role: Role): Promise<PinResult> {
  const backend = await getBackend();
  const r = await backend.login(userId, pin);
  if (!r.ok) return r;
  if (r.role !== role || r.userId !== userId) return {ok: false, reason: 'unknown'};
  const session = {token: r.token, userId: r.userId, role: r.role, trackId: r.trackId, expiresAt: r.expiresAt};
  if (role === 'teacher') setTeacherSession(session);
  else setLearnerSession(session);
  return r;
}

/** Ends the session on the server (best effort) and forgets it here. */
export async function logout(role: Role): Promise<void> {
  const s = role === 'teacher' ? getTeacherSession() : getLearnerSession();
  if (role === 'teacher') setTeacherSession(null);
  else setLearnerSession(null);
  if (!s) return;
  try {
    const backend = await getBackend();
    await backend.logout(s.token);
  } catch {
    /* offline: the token expires by itself */
  }
}
