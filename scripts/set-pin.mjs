#!/usr/bin/env node
/**
 * Sets a PIN on the live server.
 *
 *   npm run set-pin -- said-ali 4821      (learners: 4 digits)
 *   npm run set-pin -- teacher 135790     (teacher: 6 digits)
 *
 * Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, from the environment
 * or from .env.local (git-ignored). The service key never leaves your computer
 * and is never printed. Setting a PIN also logs that person out everywhere.
 */
import {existsSync, readFileSync} from 'node:fs';

const LEARNERS = ['abdulloh', 'said-umar', 'said-ali', 'said-amir'];

function readEnvFile(path) {
  const out = {};
  if (!existsSync(path)) return out;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const [user, pin] = process.argv.slice(2);
if (!user || !pin) fail('Usage: npm run set-pin -- <who> <pin>\n  who: ' + [...LEARNERS, 'teacher'].join(', '));
if (user !== 'teacher' && !LEARNERS.includes(user)) fail(`Unknown person "${user}". Use one of: ${[...LEARNERS, 'teacher'].join(', ')}`);
const pattern = user === 'teacher' ? /^[0-9]{6}$/ : /^[0-9]{4}$/;
if (!pattern.test(pin)) fail(user === 'teacher' ? 'The teacher PIN must be exactly 6 digits.' : 'A learner PIN must be exactly 4 digits.');

const file = readEnvFile('.env.local');
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || file.VITE_SUPABASE_URL || file.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;
if (!url) fail('VITE_SUPABASE_URL is missing. Put it in .env.local (see .env.example).');
if (!key) fail('SUPABASE_SERVICE_ROLE_KEY is missing. Put it in .env.local (never commit it).');

// One server function call (le_admin_set_pin). Plain fetch: works on Node 20+, no extra library.
let res;
try {
  res = await fetch(`${url.replace(/\/$/, '')}/rest/v1/rpc/le_admin_set_pin`, {
    method: 'POST',
    headers: {apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({p_user: user, p_pin: pin}),
  });
} catch (e) {
  fail(`Couldn't reach the server: ${e.message}`);
}
const data = await res.json().catch(() => null);
if (!res.ok) fail(`Couldn't set the PIN: ${data?.message ?? res.status}`);
if (!data || data.ok !== true) fail(`Couldn't set the PIN: ${JSON.stringify(data)}`);
console.log(`PIN set for ${user}`);
