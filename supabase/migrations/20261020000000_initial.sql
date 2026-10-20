create extension if not exists pgcrypto;

create type public.friendship_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type public.blend_kind as enum ('pair', 'group');
create type public.blend_track_state as enum ('active', 'excluded', 'pinned');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null,
  username_normalized text generated always as (lower(username)) stored unique,
  display_name text not null,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);
alter table public.profiles add constraint profiles_username_format check (username ~ '^[A-Za-z0-9_]{3,24}$');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_low uuid not null references public.profiles(id) on delete cascade,
  user_high uuid not null references public.profiles(id) on delete cascade,
  requested_by uuid not null references public.profiles(id),
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_ordered_pair check (user_low < user_high),
  constraint friendships_unique_pair unique (user_low, user_high)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  artwork_url text,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create or replace function public.enforce_group_member_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare member_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.group_id::text, 0));
  select count(*) into member_count from public.group_members where group_id = new.group_id;
  if member_count >= 10 then raise exception 'group_member_limit_exceeded'; end if;
  return new;
end;
$$;
create trigger group_member_limit before insert on public.group_members for each row execute function public.enforce_group_member_limit();

create table public.blends (
  id uuid primary key default gen_random_uuid(),
  kind public.blend_kind not null,
  pair_low uuid references public.profiles(id),
  pair_high uuid references public.profiles(id),
  group_id uuid unique references public.groups(id) on delete cascade,
  name text not null,
  description text,
  overlap smallint not null default 0 check (overlap between 0 and 100),
  last_refreshed_at timestamptz,
  refresh_status text not null default 'sample',
  created_at timestamptz not null default now(),
  constraint blends_pair_order check (pair_low is null or pair_high is null or pair_low < pair_high),
  constraint blends_kind_shape check ((kind = 'pair' and pair_low is not null and pair_high is not null and group_id is null) or (kind = 'group' and group_id is not null and pair_low is null and pair_high is null)),
  constraint blends_unique_pair unique (pair_low, pair_high)
);

create table public.tracks (
  id uuid primary key default gen_random_uuid(), title text not null, artist text not null, album text, duration_ms integer, artwork_url text, isrc text, created_at timestamptz not null default now()
);
create table public.blend_tracks (
  blend_id uuid not null references public.blends(id) on delete cascade,
  track_id uuid not null references public.tracks(id),
  state public.blend_track_state not null default 'active',
  reason text not null,
  position integer not null default 0,
  primary key (blend_id, track_id)
);

create table public.provider_connections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, provider text not null, provider_user_id text, access_token text, refresh_token text, scopes text[], last_synced_at timestamptz, disconnected_at timestamptz, unique(user_id, provider)
);
create table public.listening_signals (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade, provider_connection_id uuid not null references public.provider_connections(id) on delete cascade, track_id uuid references public.tracks(id), artist text, play_count integer, listened_at timestamptz, source_payload jsonb, created_at timestamptz not null default now()
);
create table public.refresh_jobs (
  id uuid primary key default gen_random_uuid(), blend_id uuid not null references public.blends(id) on delete cascade, idempotency_key text not null unique, status text not null default 'pending', error_message text, created_at timestamptz not null default now(), completed_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.friendships enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.blends enable row level security;
alter table public.blend_tracks enable row level security;
alter table public.provider_connections enable row level security;
alter table public.listening_signals enable row level security;

create policy "profiles are visible by username" on public.profiles for select using (true);
create policy "users manage their profile" on public.profiles for update using (auth.uid() = id);
create policy "friends see their friendships" on public.friendships for select using (auth.uid() in (user_low, user_high));
create policy "members see groups" on public.groups for select using (exists (select 1 from public.group_members m where m.group_id = id and m.user_id = auth.uid()));
create policy "members see membership" on public.group_members for select using (user_id = auth.uid() or exists (select 1 from public.group_members m where m.group_id = group_id and m.user_id = auth.uid()));
create policy "blend participants see blends" on public.blends for select using (auth.uid() in (pair_low, pair_high) or exists (select 1 from public.group_members m where m.group_id = blends.group_id and m.user_id = auth.uid()));
create policy "blend participants see tracks" on public.blend_tracks for select using (exists (select 1 from public.blends b where b.id = blend_id and (auth.uid() in (b.pair_low, b.pair_high) or exists (select 1 from public.group_members m where m.group_id = b.group_id and m.user_id = auth.uid()))));

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$ begin insert into public.profiles(id, username, display_name) values (new.id, coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)), coalesce(new.raw_user_meta_data->>'display_name', 'New listener')); return new; end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
