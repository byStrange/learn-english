-- Learn English: the live server for progress, PIN login and the teacher panel.
--
-- Every object is prefixed le_ so it can live next to anything else in the
-- project. Tables have row-level security ON and NO policies, so the public
-- (publishable) key can never read or write them directly: all access goes
-- through the SECURITY DEFINER functions below, which check a session token
-- that only le_login hands out.
--
-- Safe to run more than once.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables

create table if not exists public.le_users (
  id text primary key,
  role text not null check (role in ('learner', 'teacher')),
  track_id text,
  display_name text not null,
  pin_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.le_progress (
  learner_id text primary key references public.le_users (id) on delete cascade,
  doc jsonb not null,
  version int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.le_teacher_state (
  id int primary key default 1 check (id = 1),
  doc jsonb not null default '{}'::jsonb,
  version int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.le_sessions (
  token_hash text primary key,
  user_id text not null references public.le_users (id) on delete cascade,
  role text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists le_sessions_user_idx on public.le_sessions (user_id);

create table if not exists public.le_login_attempts (
  id bigserial primary key,
  user_id text not null,
  ok boolean not null,
  at timestamptz not null default now()
);
create index if not exists le_login_attempts_user_at_idx on public.le_login_attempts (user_id, at);

alter table public.le_users enable row level security;
alter table public.le_progress enable row level security;
alter table public.le_teacher_state enable row level security;
alter table public.le_sessions enable row level security;
alter table public.le_login_attempts enable row level security;

revoke all on public.le_users, public.le_progress, public.le_teacher_state,
  public.le_sessions, public.le_login_attempts from anon, authenticated;
revoke all on sequence public.le_login_attempts_id_seq from anon, authenticated;

-- ---------------------------------------------------------------- seed
-- The learner ids match src/content/tracks.ts. PINs are set afterwards with
-- `npm run set-pin` (or from the teacher panel); no PIN = can't log in.

insert into public.le_users (id, role, track_id, display_name) values
  ('abdulloh', 'learner', 'g1', 'Abdulloh'),
  ('said-umar', 'learner', 'g1', 'Said Umar'),
  ('said-ali', 'learner', 'g2', 'Said Ali'),
  ('said-amir', 'learner', 'g2', 'Said Amir'),
  ('teacher', 'teacher', null, 'Teacher')
on conflict (id) do nothing;

insert into public.le_teacher_state (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- helpers

create or replace function public.le_hash_token(p_token text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex');
$$;

-- The session behind a token, or an 'invalid_session' error.
create or replace function public.le_session(p_token text)
returns public.le_sessions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.le_sessions;
begin
  select * into s from public.le_sessions
   where token_hash = public.le_hash_token(p_token) and expires_at > now();
  if not found then
    raise exception 'invalid_session' using errcode = 'P0001';
  end if;
  return s;
end;
$$;

create or replace function public.le_check_pin_format(p_user text, p_pin text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_role text;
begin
  select role into v_role from public.le_users where id = p_user;
  if v_role is null then
    raise exception 'unknown_user' using errcode = 'P0001';
  end if;
  if v_role = 'learner' and coalesce(p_pin, '') !~ '^[0-9]{4}$' then
    raise exception 'pin_format: learners use 4 digits' using errcode = 'P0001';
  end if;
  if v_role = 'teacher' and coalesce(p_pin, '') !~ '^[0-9]{6}$' then
    raise exception 'pin_format: the teacher uses 6 digits' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public.le_store_pin(p_user text, p_pin text)
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.le_check_pin_format(p_user, p_pin);
  update public.le_users
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf', 8))
   where id = p_user;
  delete from public.le_sessions where user_id = p_user;
  delete from public.le_login_attempts where user_id = p_user;
end;
$$;

-- ---------------------------------------------------------------- login

-- Never raises for a wrong PIN: an exception would roll back the attempt row
-- and the lockout would never trigger.
create or replace function public.le_login(p_user text, p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  u public.le_users;
  v_fails int;
  v_first timestamptz;
  v_token text;
  v_expires timestamptz;
  max_tries constant int := 5;
  win constant interval := interval '15 minutes';
begin
  select * into u from public.le_users where id = p_user;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'unknown');
  end if;
  if u.pin_hash is null then
    return jsonb_build_object('ok', false, 'reason', 'no_pin');
  end if;

  select count(*), min(at) into v_fails, v_first
    from public.le_login_attempts
   where user_id = p_user and not ok and at > now() - win;
  if v_fails >= max_tries then
    return jsonb_build_object('ok', false, 'reason', 'locked',
      'retry_after_s', greatest(1, ceil(extract(epoch from (v_first + win - now())))::int));
  end if;

  if extensions.crypt(coalesce(p_pin, ''), u.pin_hash) <> u.pin_hash then
    insert into public.le_login_attempts (user_id, ok) values (p_user, false);
    if v_fails + 1 >= max_tries then
      return jsonb_build_object('ok', false, 'reason', 'locked', 'retry_after_s', extract(epoch from win)::int);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'wrong_pin', 'tries_left', max_tries - v_fails - 1);
  end if;

  -- Right PIN: clear failures, tidy old sessions, hand out a token.
  delete from public.le_login_attempts where user_id = p_user and not ok;
  insert into public.le_login_attempts (user_id, ok) values (p_user, true);
  delete from public.le_login_attempts where at < now() - interval '30 days';
  delete from public.le_sessions where expires_at < now();

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_expires := now() + case when u.role = 'teacher' then interval '14 days' else interval '60 days' end;
  insert into public.le_sessions (token_hash, user_id, role, expires_at)
       values (public.le_hash_token(v_token), u.id, u.role, v_expires);

  return jsonb_build_object('ok', true, 'token', v_token, 'user_id', u.id, 'role', u.role,
    'track_id', u.track_id, 'expires_at', v_expires);
end;
$$;

create or replace function public.le_logout(p_token text)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  delete from public.le_sessions where token_hash = public.le_hash_token(p_token);
$$;

-- ---------------------------------------------------------------- learner progress

create or replace function public.le_get_progress(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.le_sessions := public.le_session(p_token);
  r public.le_progress;
begin
  if s.role <> 'learner' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  select * into r from public.le_progress where learner_id = s.user_id;
  if not found then
    return null;
  end if;
  return jsonb_build_object('doc', r.doc, 'version', r.version);
end;
$$;

-- Saves only when the caller has seen the latest version; otherwise returns
-- the server's copy so the app can merge and try again.
create or replace function public.le_save_progress(p_token text, p_doc jsonb, p_expected_version int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  s public.le_sessions := public.le_session(p_token);
  r public.le_progress;
begin
  if s.role <> 'learner' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' or p_doc ->> 'learnerId' is distinct from s.user_id then
    raise exception 'bad_doc' using errcode = 'P0001';
  end if;
  if octet_length(p_doc::text) >= 500000 then
    raise exception 'doc_too_large' using errcode = 'P0001';
  end if;

  select * into r from public.le_progress where learner_id = s.user_id for update;
  if not found then
    if coalesce(p_expected_version, 0) <> 0 then
      return jsonb_build_object('ok', false, 'version', 0, 'doc', null);
    end if;
    insert into public.le_progress (learner_id, doc, version) values (s.user_id, p_doc, 1)
    on conflict (learner_id) do nothing;
    if not found then
      select * into r from public.le_progress where learner_id = s.user_id;
      return jsonb_build_object('ok', false, 'version', r.version, 'doc', r.doc);
    end if;
    return jsonb_build_object('ok', true, 'version', 1);
  end if;

  if r.version <> coalesce(p_expected_version, -1) then
    return jsonb_build_object('ok', false, 'version', r.version, 'doc', r.doc);
  end if;
  update public.le_progress
     set doc = p_doc, version = r.version + 1, updated_at = now()
   where learner_id = s.user_id;
  return jsonb_build_object('ok', true, 'version', r.version + 1);
end;
$$;

-- ---------------------------------------------------------------- teacher

create or replace function public.le_require_teacher(p_token text)
returns public.le_sessions
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.le_sessions := public.le_session(p_token);
begin
  if s.role <> 'teacher' then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  return s;
end;
$$;

create or replace function public.le_teacher_overview(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.le_require_teacher(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'user_id', u.id,
             'track_id', u.track_id,
             'display_name', u.display_name,
             'has_pin', u.pin_hash is not null,
             'doc', p.doc,
             'version', coalesce(p.version, 0),
             'updated_at', p.updated_at,
             'last_login', (select max(a.at) from public.le_login_attempts a where a.user_id = u.id and a.ok)
           ) order by u.track_id, u.id)
      from public.le_users u
      left join public.le_progress p on p.learner_id = u.id
     where u.role = 'learner'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.le_teacher_get_state(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r public.le_teacher_state;
begin
  perform public.le_require_teacher(p_token);
  select * into r from public.le_teacher_state where id = 1;
  return jsonb_build_object('doc', coalesce(r.doc, '{}'::jsonb), 'version', coalesce(r.version, 0));
end;
$$;

create or replace function public.le_teacher_save_state(p_token text, p_doc jsonb, p_expected_version int)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r public.le_teacher_state;
begin
  perform public.le_require_teacher(p_token);
  if p_doc is null or jsonb_typeof(p_doc) <> 'object' or octet_length(p_doc::text) >= 500000 then
    raise exception 'bad_doc' using errcode = 'P0001';
  end if;
  insert into public.le_teacher_state (id) values (1) on conflict (id) do nothing;
  select * into r from public.le_teacher_state where id = 1 for update;
  if r.version <> coalesce(p_expected_version, -1) then
    return jsonb_build_object('ok', false, 'version', r.version, 'doc', r.doc);
  end if;
  update public.le_teacher_state set doc = p_doc, version = r.version + 1, updated_at = now() where id = 1;
  return jsonb_build_object('ok', true, 'version', r.version + 1);
end;
$$;

create or replace function public.le_teacher_set_pin(p_token text, p_user text, p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.le_require_teacher(p_token);
  perform public.le_store_pin(p_user, p_pin);
  return jsonb_build_object('ok', true, 'user_id', p_user);
end;
$$;

-- Service role only (npm run set-pin): presets PINs before handing phones over.
create or replace function public.le_admin_set_pin(p_user text, p_pin text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform public.le_store_pin(p_user, p_pin);
  return jsonb_build_object('ok', true, 'user_id', p_user);
end;
$$;

-- ---------------------------------------------------------------- grants

revoke execute on function
  public.le_hash_token(text),
  public.le_session(text),
  public.le_check_pin_format(text, text),
  public.le_store_pin(text, text),
  public.le_require_teacher(text),
  public.le_login(text, text),
  public.le_logout(text),
  public.le_get_progress(text),
  public.le_save_progress(text, jsonb, int),
  public.le_teacher_overview(text),
  public.le_teacher_get_state(text),
  public.le_teacher_save_state(text, jsonb, int),
  public.le_teacher_set_pin(text, text, text),
  public.le_admin_set_pin(text, text)
from public, anon, authenticated;

grant execute on function
  public.le_login(text, text),
  public.le_logout(text),
  public.le_get_progress(text),
  public.le_save_progress(text, jsonb, int),
  public.le_teacher_overview(text),
  public.le_teacher_get_state(text),
  public.le_teacher_save_state(text, jsonb, int),
  public.le_teacher_set_pin(text, text, text)
to anon, authenticated;

grant execute on function public.le_admin_set_pin(text, text) to service_role;

-- Let the API see the new functions straight away.
notify pgrst, 'reload schema';
