-- Run this entire file in Supabase SQL Editor. No service_role key is needed.
-- This migration is additive: existing browser data is uploaded only on request.
begin;

create table if not exists public.shared_trips (
  id uuid primary key,
  access_token_hash text not null check (access_token_hash ~ '^[a-f0-9]{64}$'),
  snapshot jsonb not null check (
    jsonb_typeof(snapshot) = 'object'
    and snapshot ?& array['days', 'completedTasks']
    and jsonb_typeof(snapshot -> 'days') = 'array'
    and jsonb_array_length(snapshot -> 'days') > 0
    and jsonb_typeof(snapshot -> 'completedTasks') = 'array'
    and octet_length(snapshot::text) <= 1048576
  ),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shared_trips enable row level security;

-- No table access from publishable/anon keys. Only the token-checked RPCs below.
revoke all on public.shared_trips from public, anon, authenticated;
grant select, insert, update on public.shared_trips to service_role;

comment on table public.shared_trips is
  'Shared itinerary snapshots. Token-checked RPCs; bearer links grant collaborative edit access.';

-- Also validate direct RPC callers: the Next.js API is not a security boundary.
create or replace function public.tata_valid_snapshot(p_snapshot jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare
  d jsonb;
  t jsonb;
  c jsonb;
  field text;
  day_ids text[] := '{}';
  task_ids text[] := '{}';
  done_ids text[] := '{}';
begin
  if jsonb_typeof(p_snapshot) is distinct from 'object'
    or octet_length(p_snapshot::text) > 1048576
    or jsonb_typeof(p_snapshot -> 'days') is distinct from 'array'
    or jsonb_typeof(p_snapshot -> 'completedTasks') is distinct from 'array' then return false; end if;
  if jsonb_array_length(p_snapshot -> 'days') not between 1 and 100
    or jsonb_array_length(p_snapshot -> 'completedTasks') > 2000 then return false; end if;

  for d in select value from jsonb_array_elements(p_snapshot -> 'days') loop
    if jsonb_typeof(d) is distinct from 'object'
      or jsonb_typeof(d -> 'dayId') is distinct from 'string'
      or length(d ->> 'dayId') not between 1 and 150
      or (d ->> 'dayId') = any(day_ids)
      or jsonb_typeof(d -> 'dayTitle') is distinct from 'string'
      or length(d ->> 'dayTitle') > 300
      or jsonb_typeof(d -> 'tasks') is distinct from 'array' then return false; end if;
    day_ids := array_append(day_ids, d ->> 'dayId');
    if jsonb_array_length(d -> 'tasks') > 500 then return false; end if;
    foreach field in array array['pickupTime', 'pickupLocation', 'pickupNotes'] loop
      if d ? field and (jsonb_typeof(d -> field) is distinct from 'string' or length(d ->> field) > 10000) then return false; end if;
    end loop;
    if d ? 'pickupStatus' and not coalesce(d ->> 'pickupStatus' = any(array['preparing', 'otw', 'arrived']), false) then return false; end if;

    for t in select value from jsonb_array_elements(d -> 'tasks') loop
      if jsonb_typeof(t) is distinct from 'object'
        or jsonb_typeof(t -> 'taskId') is distinct from 'string'
        or length(t ->> 'taskId') not between 1 and 150
        or (t ->> 'taskId') = any(task_ids) then return false; end if;
      task_ids := array_append(task_ids, t ->> 'taskId');
      if cardinality(task_ids) > 2000 then return false; end if;
      foreach field in array array['time', 'title', 'category', 'description'] loop
        if jsonb_typeof(t -> field) is distinct from 'string' or length(t ->> field) > 10000 then return false; end if;
      end loop;
      foreach field in array array['address', 'planBTitle', 'planBAddress', 'tips', 'mapsUrl', 'memoryNote'] loop
        if t ? field and (jsonb_typeof(t -> field) is distinct from 'string' or length(t ->> field) > 10000) then return false; end if;
      end loop;
      if t ? 'isPlanBActive' and jsonb_typeof(t -> 'isPlanBActive') is distinct from 'boolean' then return false; end if;
      if t ? 'venueType' and not coalesce(t ->> 'venueType' = any(array['Indoor (AC)', 'Outdoor']), false) then return false; end if;
      if t ? 'addedBy' and not coalesce(t ->> 'addedBy' = any(array['Princess', 'Copilot']), false) then return false; end if;
      if t ? 'rating' then
        if jsonb_typeof(t -> 'rating') is distinct from 'number' then return false; end if;
        if (t ->> 'rating')::numeric not between 1 and 5 or trunc((t ->> 'rating')::numeric) <> (t ->> 'rating')::numeric then return false; end if;
      end if;
      foreach field in array array['lat', 'lng', 'distanceKm'] loop
        if t ? field and jsonb_typeof(t -> field) is distinct from 'number' then return false; end if;
      end loop;
    end loop;
  end loop;
  for c in select value from jsonb_array_elements(p_snapshot -> 'completedTasks') loop
    if jsonb_typeof(c) is distinct from 'string' or length(c #>> '{}') > 150 or (c #>> '{}') = any(done_ids) then return false; end if;
    done_ids := array_append(done_ids, c #>> '{}');
  end loop;
  return true;
end;
$$;

create or replace function public.tata_read_trip(p_id uuid, p_token text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise sqlstate 'PT404' using message = 'Trip unavailable';
  end if;
  select jsonb_build_object('id', t.id, 'snapshot', t.snapshot, 'revision', t.revision, 'updated_at', t.updated_at)
    into result from public.shared_trips t
    where t.id = p_id and t.access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex');
  if result is null then raise sqlstate 'PT404' using message = 'Trip unavailable'; end if;
  return result;
end;
$$;

create or replace function public.tata_create_trip(p_id uuid, p_token text, p_snapshot jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if p_id is null or p_token is null or p_token !~ '^[a-f0-9]{64}$'
    or not public.tata_valid_snapshot(p_snapshot) then
    raise sqlstate 'PT400' using message = 'Invalid trip';
  end if;
  insert into public.shared_trips(id, access_token_hash, snapshot)
    values (p_id, encode(sha256(convert_to(p_token, 'UTF8')), 'hex'), p_snapshot)
    on conflict (id) do nothing;
  -- Retrying the same id/token returns the trip; a collision never reveals it.
  return public.tata_read_trip(p_id, p_token);
end;
$$;

create or replace function public.tata_update_trip(p_id uuid, p_token text, p_snapshot jsonb, p_revision integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' then
    raise sqlstate 'PT404' using message = 'Trip unavailable';
  end if;
  if p_revision is null or p_revision < 1 or p_revision >= 2147483647
    or not public.tata_valid_snapshot(p_snapshot) then
    raise sqlstate 'PT400' using message = 'Invalid trip';
  end if;
  update public.shared_trips t
    set snapshot = p_snapshot, revision = t.revision + 1, updated_at = clock_timestamp()
    where t.id = p_id and t.access_token_hash = encode(sha256(convert_to(p_token, 'UTF8')), 'hex')
      and t.revision = p_revision
    returning jsonb_build_object('id', t.id, 'snapshot', t.snapshot, 'revision', t.revision, 'updated_at', t.updated_at) into result;
  if result is null then
    -- Wrong tokens get 404, not a signal about the trip's current revision.
    perform public.tata_read_trip(p_id, p_token);
    raise sqlstate 'PT409' using message = 'Revision conflict';
  end if;
  return result;
end;
$$;

create or replace function public.tata_sync_status()
returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object('schemaVersion', 1);
$$;

revoke all on function public.tata_valid_snapshot(jsonb) from public, anon, authenticated;
revoke all on function public.tata_create_trip(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.tata_read_trip(uuid, text) from public, anon, authenticated;
revoke all on function public.tata_update_trip(uuid, text, jsonb, integer) from public, anon, authenticated;
revoke all on function public.tata_sync_status() from public, anon, authenticated;
grant execute on function public.tata_create_trip(uuid, text, jsonb) to anon, authenticated, service_role;
grant execute on function public.tata_read_trip(uuid, text) to anon, authenticated, service_role;
grant execute on function public.tata_update_trip(uuid, text, jsonb, integer) to anon, authenticated, service_role;
grant execute on function public.tata_sync_status() to anon, authenticated, service_role;

notify pgrst, 'reload schema';

commit;
