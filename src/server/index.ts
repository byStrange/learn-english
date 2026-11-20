import type {Backend} from './backend';
import {createFakeBackend} from './fakeBackend';

/**
 * Which server this copy of the app talks to:
 * - 'supabase': VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY were set at build time (.env.local, or the
 *   repository secrets in GitHub Actions);
 * - 'fake': development or tests without them (an in-browser stand-in; PINs 1234 / 123456);
 * - 'none': a production build without them, which shows "not connected" instead of pretending.
 * A demo build (`npm run build:demo`) always uses 'fake', with sample progress (src/dev/demo.ts).
 */
const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim();
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim();

export type ServerMode = 'supabase' | 'fake' | 'none';

export const serverMode: ServerMode =
  import.meta.env.MODE === 'demo'
    ? 'fake' // `npm run build:demo`: a look-around copy with sample data, never the real server
    : url && key
      ? 'supabase'
      : import.meta.env.DEV || import.meta.env.MODE === 'test'
        ? 'fake'
        : 'none';

let current: Promise<Backend> | null = null;

/** The backend, created once. supabase-js is loaded lazily so it isn't in the first download. */
export function getBackend(): Promise<Backend> {
  if (!current) {
    if (serverMode === 'supabase') {
      current = import('./supabaseBackend').then(m => m.createSupabaseBackend(url!, key!));
    } else if (serverMode === 'fake') {
      current = Promise.resolve(createFakeBackend({persistKey: import.meta.env.MODE === 'test' ? undefined : 'le:dev:fake-server'}));
    } else {
      current = Promise.reject(new Error('This copy of the app is not connected to the server.'));
      current.catch(() => {});
    }
  }
  return current;
}

/** Tests only: use this backend instead. */
export function _setBackendForTests(b: Backend | null): void {
  current = b ? Promise.resolve(b) : null;
}
