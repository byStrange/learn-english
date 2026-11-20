import {createClient, type SupabaseClient} from '@supabase/supabase-js';
import type {TrackId} from '../content/types';
import {InvalidSession, NetworkError, ServerError, type Backend, type LoginResult, type OverviewRow, type Role, type SaveResult, type VersionedDoc} from './backend';

/**
 * The live server: the le_* functions in supabase/migrations. The publishable
 * key can only call those functions (the tables are closed), and every call
 * except le_login carries the session token.
 */
export function createSupabaseBackend(url: string, key: string): Backend {
  const client: SupabaseClient = createClient(url, key, {
    auth: {persistSession: false, autoRefreshToken: false, detectSessionInUrl: false},
  });

  async function call<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    let res;
    try {
      res = await client.rpc(fn, args);
    } catch (e) {
      throw new NetworkError(e instanceof Error ? e.message : 'network');
    }
    const {data, error} = res;
    if (error) {
      const msg = `${error.message ?? ''}`;
      if (msg.includes('invalid_session')) throw new InvalidSession();
      // No Postgres code means the request never reached the database.
      if (!error.code || /fetch|network|timed? ?out|load failed/i.test(msg)) throw new NetworkError(msg);
      throw new ServerError(msg);
    }
    return data as T;
  }

  return {
    kind: 'supabase',

    async login(userId, pin) {
      let r: Record<string, unknown>;
      try {
        r = await call<Record<string, unknown>>('le_login', {p_user: userId, p_pin: pin});
      } catch (e) {
        if (e instanceof NetworkError) return {ok: false, reason: 'network'};
        throw e;
      }
      return toLoginResult(r);
    },

    async logout(token) {
      await call('le_logout', {p_token: token});
    },

    async getProgress(token) {
      const r = await call<VersionedDoc | null>('le_get_progress', {p_token: token});
      return r && typeof r === 'object' ? {doc: r.doc, version: Number(r.version) || 0} : null;
    },

    async saveProgress(token, doc, expectedVersion) {
      return toSave(await call('le_save_progress', {p_token: token, p_doc: doc, p_expected_version: expectedVersion}));
    },

    async teacherOverview(token) {
      const rows = await call<Record<string, unknown>[] | null>('le_teacher_overview', {p_token: token});
      return (rows ?? []).map(
        (r): OverviewRow => ({
          userId: String(r.user_id),
          trackId: (r.track_id as TrackId | null) ?? null,
          displayName: String(r.display_name ?? r.user_id),
          hasPin: Boolean(r.has_pin),
          doc: r.doc ?? null,
          version: Number(r.version) || 0,
          updatedAt: (r.updated_at as string | null) ?? null,
          lastLogin: (r.last_login as string | null) ?? null,
        }),
      );
    },

    async getTeacherState(token) {
      const r = await call<VersionedDoc>('le_teacher_get_state', {p_token: token});
      return {doc: r?.doc ?? {}, version: Number(r?.version) || 0};
    },

    async saveTeacherState(token, doc, expectedVersion) {
      return toSave(await call('le_teacher_save_state', {p_token: token, p_doc: doc, p_expected_version: expectedVersion}));
    },

    async setPin(token, userId, pin) {
      await call('le_teacher_set_pin', {p_token: token, p_user: userId, p_pin: pin});
    },
  };
}

function toLoginResult(r: Record<string, unknown>): LoginResult {
  if (r.ok === true) {
    return {
      ok: true,
      token: String(r.token),
      userId: String(r.user_id),
      role: r.role as Role,
      trackId: (r.track_id as TrackId | null) ?? null,
      expiresAt: String(r.expires_at),
    };
  }
  if (r.reason === 'wrong_pin') return {ok: false, reason: 'wrong_pin', triesLeft: Number(r.tries_left) || 0};
  if (r.reason === 'locked') return {ok: false, reason: 'locked', retryAfterS: Number(r.retry_after_s) || 900};
  return {ok: false, reason: r.reason === 'no_pin' ? 'no_pin' : 'unknown'};
}

function toSave(r: unknown): SaveResult {
  const o = (r ?? {}) as Record<string, unknown>;
  if (o.ok === true) return {ok: true, version: Number(o.version) || 0};
  return {ok: false, version: Number(o.version) || 0, doc: o.doc ?? null};
}
