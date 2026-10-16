-- AVALAND backend (Supabase / PostgreSQL)
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1. Progress: one row per account, the whole game state as JSON
create table if not exists public.progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.progress enable row level security;
drop policy if exists "progress: read own"   on public.progress;
drop policy if exists "progress: insert own" on public.progress;
drop policy if exists "progress: update own" on public.progress;
drop policy if exists "progress: delete own" on public.progress;
create policy "progress: read own"   on public.progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "progress: insert own" on public.progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "progress: update own" on public.progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "progress: delete own" on public.progress for delete to authenticated using ((select auth.uid()) = user_id);

-- 2. Web Push subscriptions (work without an account too; the endpoint URL is the secret key)
create table if not exists public.push_subs (
  endpoint    text primary key,
  sub         jsonb not null,
  user_id     uuid references auth.users(id) on delete set null,
  tz          text not null default 'Asia/Almaty',
  hour        int  not null default 19 check (hour between 0 and 23),
  next_siege  timestamptz,          -- when the next province falls into siege
  last_study  date,                 -- last local day with a lesson or review
  streak      int  not null default 0,
  last_sent   timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.push_subs enable row level security;   -- no policies: only the functions below touch it

create schema if not exists private;
create table if not exists private.config (key text primary key, value text not null);
revoke all on schema private from anon, authenticated;

-- App: save or update this device's subscription and reminder data
create or replace function public.push_save(p_sub jsonb, p_tz text, p_hour int, p_next_siege timestamptz, p_last_study date, p_streak int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_sub->>'endpoint' is null or p_sub->>'endpoint' !~ '^https://' then raise exception 'bad subscription'; end if;
  insert into public.push_subs as s (endpoint, sub, user_id, tz, hour, next_siege, last_study, streak, updated_at)
  values (p_sub->>'endpoint', p_sub, auth.uid(), coalesce(p_tz, 'Asia/Almaty'), coalesce(p_hour, 19), p_next_siege, p_last_study, coalesce(p_streak, 0), now())
  on conflict (endpoint) do update set sub = excluded.sub, user_id = coalesce(auth.uid(), s.user_id), tz = excluded.tz, hour = excluded.hour,
    next_siege = excluded.next_siege, last_study = excluded.last_study, streak = excluded.streak, updated_at = now();
end $$;

-- App: turn reminders off on this device
create or replace function public.push_delete(p_endpoint text)
returns void language sql security definer set search_path = public as $$
  delete from public.push_subs where endpoint = p_endpoint;
$$;

-- Sender (GitHub Actions, hourly): subscriptions whose local reminder hour is now and that were not reminded today.
-- Protected by a shared secret kept in private.config and in the repository secrets.
create or replace function public.push_due(p_secret text)
returns setof public.push_subs language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from private.config where key = 'push_secret') then raise exception 'forbidden'; end if;
  return query
    update public.push_subs s set last_sent = now()
    where extract(hour from now() at time zone s.tz) = s.hour
      and (s.last_sent is null or (s.last_sent at time zone s.tz)::date < (now() at time zone s.tz)::date)
      and (
        (s.next_siege is not null and s.next_siege < now() + interval '36 hours')
        or s.last_study is null
        or s.last_study < (now() at time zone s.tz)::date
      )
    returning s.*;
end $$;

-- Sender: forget subscriptions the push service reports as gone (HTTP 404/410)
create or replace function public.push_gone(p_secret text, p_endpoint text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_secret is null or p_secret <> (select value from private.config where key = 'push_secret') then raise exception 'forbidden'; end if;
  delete from public.push_subs where endpoint = p_endpoint;
end $$;

revoke all on function public.push_due(text) from public;
revoke all on function public.push_gone(text, text) from public;
grant execute on function public.push_due(text) to anon, authenticated;
grant execute on function public.push_gone(text, text) to anon, authenticated;
grant execute on function public.push_save(jsonb, text, int, timestamptz, date, int) to anon, authenticated;
grant execute on function public.push_delete(text) to anon, authenticated;

-- 3. Account deletion from inside the app (required by the App Store)
create or replace function public.delete_me()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  delete from public.progress where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke all on function public.delete_me() from public, anon;
grant execute on function public.delete_me() to authenticated;
