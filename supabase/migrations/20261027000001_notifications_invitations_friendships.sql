-- Migration: Add notifications, group invitations, enhanced friendships
-- Date: 2026-10-27
-- Description: Adds notification system, group invite links/codes, enhanced friendship tracking,
-- RLS policies, triggers, and notification management functions

-- Enable required extensions
create extension if not exists pgcrypto;

-- ============================================================================
-- TYPES
-- ============================================================================

-- Notification types enum
create type public.notification_type as enum (
  'friend_request',
  'friend_accepted',
  'friend_declined',
  'group_invite',
  'group_invite_accepted',
  'group_invite_declined',
  'blend_updated',
  'blend_refresh_completed',
  'blend_refresh_failed'
);

-- Group invitation status enum
create type public.group_invite_status as enum (
  'pending',
  'accepted',
  'declined',
  'expired',
  'revoked'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type public.notification_type not null,
  title text not null,
  message text,
  -- Polymorphic references to related entities
  friendship_id uuid references public.friendships(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  group_invite_id uuid references public.group_invites(id) on delete cascade,
  blend_id uuid references public.blends(id) on delete cascade,
  -- Additional metadata
  metadata jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_created_idx on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread_idx on public.notifications (recipient_id, read_at) where read_at is null;
create index notifications_friendship_idx on public.notifications (friendship_id);
create index notifications_group_idx on public.notifications (group_id);
create index notifications_blend_idx on public.notifications (blend_id);

-- Group invitations table (invite links/codes)
create table public.group_invites (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  code text not null unique, -- Short invite code (e.g., "abc123")
  invite_url text generated always as (concat('https://sinq.app/invite/', code)) stored,
  status public.group_invite_status not null default 'pending',
  max_uses integer not null default 1 check (max_uses > 0),
  uses_count integer not null default 0 check (uses_count <= max_uses),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index group_invites_group_idx on public.group_invites (group_id);
create index group_invites_code_idx on public.group_invites (code);
create index group_invites_status_idx on public.group_invites (status);

-- Group invite usages (track who used which invite)
create table public.group_invite_usages (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.group_invites(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  used_at timestamptz not null default now(),
  unique (invite_id, user_id)
);
create index group_invite_usages_invite_idx on public.group_invite_usages (invite_id);
create index group_invite_usages_user_idx on public.group_invite_usages (user_id);

-- Enhanced friendship tracking (adds timestamps for status changes)
-- We'll add columns to existing friendships table via ALTER TABLE below
alter table public.friendships
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_at timestamptz,
  add column if not exists blocked_at timestamptz,
  add column if not exists last_interaction_at timestamptz not null default now();

-- Add check constraint for status timestamps consistency
alter table public.friendships
  add constraint friendships_status_timestamps check (
    (status = 'accepted' and accepted_at is not null and declined_at is null and blocked_at is null) or
    (status = 'declined' and declined_at is not null and accepted_at is null and blocked_at is null) or
    (status = 'blocked' and blocked_at is not null and accepted_at is null and declined_at is null) or
    (status = 'pending' and accepted_at is null and declined_at is null and blocked_at is null)
  );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Helper: Get current user's profile ID
create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid();
$$;

-- Function: Create notification
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text default null,
  p_actor_id uuid default null,
  p_friendship_id uuid default null,
  p_group_id uuid default null,
  p_group_invite_id uuid default null,
  p_blend_id uuid default null,
  p_metadata jsonb default '{}'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (
    recipient_id, actor_id, type, title, message,
    friendship_id, group_id, group_invite_id, blend_id, metadata
  )
  values (
    p_recipient_id, p_actor_id, p_type, p_title, p_message,
    p_friendship_id, p_group_id, p_group_invite_id, p_blend_id, p_metadata
  )
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

-- Function: Mark notification as read
create or replace function public.mark_notification_read(
  p_notification_id uuid,
  p_recipient_id uuid default public.current_profile_id()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
begin
  update public.notifications
  set read_at = now()
  where id = p_notification_id
    and recipient_id = p_recipient_id
    and read_at is null;

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Function: Mark all notifications as read for a user
create or replace function public.mark_all_notifications_read(
  p_recipient_id uuid default public.current_profile_id()
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.notifications
  set read_at = now()
  where recipient_id = p_recipient_id
    and read_at is null;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Function: Get unread notification count
create or replace function public.get_unread_notification_count(
  p_recipient_id uuid default public.current_profile_id()
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)
  from public.notifications
  where recipient_id = p_recipient_id
    and read_at is null;
$$;

-- Function: Delete notification
create or replace function public.delete_notification(
  p_notification_id uuid,
  p_recipient_id uuid default public.current_profile_id()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted boolean;
begin
  delete from public.notifications
  where id = p_notification_id
    and recipient_id = p_recipient_id;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$$;

-- Function: Create group invite
create or replace function public.create_group_invite(
  p_group_id uuid,
  p_created_by uuid default public.current_profile_id(),
  p_code text default null,
  p_max_uses integer default 1,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_id uuid;
  v_code text;
  v_is_owner boolean;
begin
  -- Verify user is group owner
  select exists (
    select 1 from public.groups
    where id = p_group_id and owner_id = p_created_by
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'only_group_owner_can_create_invites';
  end if;

  -- Generate code if not provided
  if p_code is null then
    v_code := lower(substring(encode(gen_random_bytes(6), 'hex') from 1 for 8));
  else
    v_code := lower(p_code);
    -- Validate code format
    if v_code !~ '^[a-z0-9]{4,16}$' then
      raise exception 'invite_code_format_invalid';
    end if;
  end if;

  insert into public.group_invites (
    group_id, created_by, code, max_uses, expires_at
  )
  values (
    p_group_id, p_created_by, v_code, p_max_uses, p_expires_at
  )
  returning id into v_invite_id;

  return v_invite_id;
end;
$$;

-- Function: Accept group invite
create or replace function public.accept_group_invite(
  p_invite_code text,
  p_user_id uuid default public.current_profile_id()
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite record;
  v_group_id uuid;
  v_is_member boolean;
begin
  -- Find valid invite
  select * into v_invite
  from public.group_invites
  where code = lower(p_invite_code)
    and status = 'pending'
    and (expires_at is null or expires_at > now())
    and uses_count < max_uses;

  if not found then
    raise exception 'invite_invalid_or_expired';
  end if;

  -- Check if user is already a member
  select public.is_group_member(v_invite.group_id, p_user_id) into v_is_member;
  if v_is_member then
    raise exception 'already_group_member';
  end if;

  -- Add user to group
  insert into public.group_members (group_id, user_id, role)
  values (v_invite.group_id, p_user_id, 'member')
  returning group_id into v_group_id;

  -- Record invite usage
  insert into public.group_invite_usages (invite_id, user_id)
  values (v_invite.id, p_user_id);

  -- Update invite stats
  update public.group_invites
  set uses_count = uses_count + 1,
      status = case when uses_count + 1 >= max_uses then 'accepted' else 'pending' end,
      updated_at = now()
  where id = v_invite.id;

  -- Create notification for group owner
  perform public.create_notification(
    p_recipient_id => v_invite.created_by,
    p_type => 'group_invite_accepted',
    p_title => 'Invite accepted',
    p_message => 'Someone joined your group via your invite',
    p_actor_id => p_user_id,
    p_group_id => v_invite.group_id,
    p_group_invite_id => v_invite.id,
    p_metadata => jsonb_build_object('invite_code', v_invite.code)
  );

  return v_group_id;
end;
$$;

-- Function: Revoke group invite
create or replace function public.revoke_group_invite(
  p_invite_id uuid,
  p_user_id uuid default public.current_profile_id()
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated boolean;
  v_is_owner boolean;
begin
  -- Verify user is group owner
  select exists (
    select 1 from public.group_invites gi
    join public.groups g on g.id = gi.group_id
    where gi.id = p_invite_id and g.owner_id = p_user_id
  ) into v_is_owner;

  if not v_is_owner then
    raise exception 'only_group_owner_can_revoke_invites';
  end if;

  update public.group_invites
  set status = 'revoked',
      updated_at = now()
  where id = p_invite_id
    and status = 'pending';

  get diagnostics v_updated = row_count;
  return v_updated;
end;
$$;

-- Function: Clean up expired invites
create or replace function public.cleanup_expired_invites()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update public.group_invites
  set status = 'expired',
      updated_at = now()
  where status = 'pending'
    and expires_at is not null
    and expires_at <= now();

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Trigger function: Auto-update friendship timestamps on status change
create or replace function public.update_friendship_timestamps()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.last_interaction_at := now();

  case new.status
    when 'accepted' then
      if old.status is distinct from 'accepted' then
        new.accepted_at := now();
      end if;
    when 'declined' then
      if old.status is distinct from 'declined' then
        new.declined_at := now();
      end if;
    when 'blocked' then
      if old.status is distinct from 'blocked' then
        new.blocked_at := now();
      end if;
    when 'pending' then
      new.accepted_at := null;
      new.declined_at := null;
      new.blocked_at := null;
  end case;

  return new;
end;
$$;

create trigger friendship_timestamps
before update of status on public.friendships
for each row execute function public.update_friendship_timestamps();

-- Trigger function: Create notifications on friendship events
create or replace function public.notify_friendship_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_actor uuid;
begin
  -- Determine who to notify (the other person in the friendship)
  if new.requested_by = new.user_low then
    v_recipient := new.user_high;
  else
    v_recipient := new.user_low;
  end if;
  v_actor := new.requested_by;

  case new.status
    when 'pending' then
      -- Friend request sent
      if old.status is distinct from 'pending' then
        perform public.create_notification(
          p_recipient_id => v_recipient,
          p_type => 'friend_request',
          p_title => 'New friend request',
          p_message => 'sent you a friend request',
          p_actor_id => v_actor,
          p_friendship_id => new.id,
          p_metadata => jsonb_build_object('requested_by', v_actor)
        );
      end if;

    when 'accepted' then
      -- Friend request accepted
      if old.status = 'pending' then
        perform public.create_notification(
          p_recipient_id => v_actor,
          p_type => 'friend_accepted',
          p_title => 'Friend request accepted',
          p_message => 'accepted your friend request',
          p_actor_id => v_recipient,
          p_friendship_id => new.id,
          p_metadata => jsonb_build_object('accepted_by', v_recipient)
        );
      end if;

    when 'declined' then
      -- Friend request declined
      if old.status = 'pending' then
        perform public.create_notification(
          p_recipient_id => v_actor,
          p_type => 'friend_declined',
          p_title => 'Friend request declined',
          p_message => 'declined your friend request',
          p_actor_id => v_recipient,
          p_friendship_id => new.id,
          p_metadata => jsonb_build_object('declined_by', v_recipient)
        );
      end if;

    when 'blocked' then
      -- User blocked
      if old.status is distinct from 'blocked' then
        perform public.create_notification(
          p_recipient_id => v_recipient,
          p_type => 'friend_declined', -- reuse type or could add 'friend_blocked'
          p_title => 'Friend blocked',
          p_message => 'blocked you',
          p_actor_id => v_actor,
          p_friendship_id => new.id,
          p_metadata => jsonb_build_object('blocked_by', v_actor)
        );
      end if;
  end case;

  return new;
end;
$$;

create trigger friendship_notifications
after insert or update of status on public.friendships
for each row execute function public.notify_friendship_events();

-- Trigger function: Create notifications on group invite events
create or replace function public.notify_group_invite_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
  v_member_count integer;
begin
  if old.status = 'pending' and new.status = 'accepted' then
    -- Invite was accepted (via accept_group_invite function)
    -- Notification already created in accept_group_invite function
    null;
  elsif old.status = 'pending' and new.status = 'declined' then
    -- Invite explicitly declined
    select created_by into v_inviter from public.group_invites where id = new.id;
    perform public.create_notification(
      p_recipient_id => v_inviter,
      p_type => 'group_invite_declined',
      p_title => 'Group invite declined',
      p_message => 'declined your group invite',
      p_actor_id => new.created_by, -- This might not be accurate, would need tracking
      p_group_id => new.group_id,
      p_group_invite_id => new.id,
      p_metadata => jsonb_build_object('invite_code', new.code)
    );
  elsif old.status = 'pending' and new.status = 'revoked' then
    -- Invite revoked by owner
    -- Could notify users who used it? Probably not needed
    null;
  end if;

  return new;
end;
$$;

create trigger group_invite_notifications
after update of status on public.group_invites
for each row execute function public.notify_group_invite_events();

-- Trigger function: Create notifications on blend updates
create or replace function public.notify_blend_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_participants uuid[];
  v_actor uuid;
begin
  -- Only notify on significant changes (not on every refresh job update)
  if new.last_refreshed_at is distinct from old.last_refreshed_at then
    -- Blend was refreshed
    if new.refresh_status = 'completed' and old.refresh_status is distinct from 'completed' then
      -- Get participants
      if new.kind = 'pair' then
        v_participants := array[new.pair_low, new.pair_high];
      else
        select array_agg(user_id) into v_participants
        from public.group_members
        where group_id = new.group_id;
      end if;

      -- Notify all participants except the actor (if known)
      -- For auto-refresh, actor might be null
      foreach v_actor in array v_participants loop
        perform public.create_notification(
          p_recipient_id => v_actor,
          p_type => 'blend_refresh_completed',
          p_title => 'Blend updated',
          p_message => 'Your blend "' || new.name || '" has been refreshed',
          p_actor_id => null,
          p_blend_id => new.id,
          p_metadata => jsonb_build_object('blend_name', new.name, 'overlap', new.overlap)
        );
      end loop;
    elsif new.refresh_status = 'failed' and old.refresh_status is distinct from 'failed' then
      -- Get participants
      if new.kind = 'pair' then
        v_participants := array[new.pair_low, new.pair_high];
      else
        select array_agg(user_id) into v_participants
        from public.group_members
        where group_id = new.group_id;
      end if;

      foreach v_actor in array v_participants loop
        perform public.create_notification(
          p_recipient_id => v_actor,
          p_type => 'blend_refresh_failed',
          p_title => 'Blend refresh failed',
          p_message => 'Failed to refresh your blend "' || new.name || '"',
          p_actor_id => null,
          p_blend_id => new.id,
          p_metadata => jsonb_build_object('blend_name', new.name, 'error', new.error_message)
        );
      end loop;
    end if;
  end if;

  return new;
end;
$$;

create trigger blend_update_notifications
after update of last_refreshed_at, refresh_status on public.blends
for each row execute function public.notify_blend_update();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on new tables
alter table public.notifications enable row level security;
alter table public.group_invites enable row level security;
alter table public.group_invite_usages enable row level security;

-- Notifications policies
create policy "users see their notifications"
on public.notifications for select
using (auth.uid() = recipient_id);

create policy "users mark their notifications read"
on public.notifications for update
using (auth.uid() = recipient_id)
with check (auth.uid() = recipient_id and read_at is not null);

create policy "users delete their notifications"
on public.notifications for delete
using (auth.uid() = recipient_id);

-- System can create notifications (via functions with security definer)
create policy "system creates notifications"
on public.notifications for insert
with check (true);

-- Group invites policies
create policy "group members see invites"
on public.group_invites for select
using (public.is_group_member(group_id));

create policy "owners create invites"
on public.group_invites for insert
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  )
);

create policy "owners update invites"
on public.group_invites for update
using (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  )
);

create policy "owners delete invites"
on public.group_invites for delete
using (
  exists (
    select 1 from public.groups g
    where g.id = group_id and g.owner_id = auth.uid()
  )
);

-- Anyone with a valid code can see the invite (for accept flow)
create policy "public can see invite by code"
on public.group_invites for select
using (code is not null and status = 'pending' and (expires_at is null or expires_at > now()));

-- Group invite usages policies
create policy "users see their invite usages"
on public.group_invite_usages for select
using (auth.uid() = user_id);

create policy "group owners see invite usages"
on public.group_invite_usages for select
using (
  exists (
    select 1 from public.group_invites gi
    join public.groups g on g.id = gi.group_id
    where gi.id = group_invite_usages.invite_id
      and g.owner_id = auth.uid()
  )
);

create policy "system records invite usages"
on public.group_invite_usages for insert
with check (true);

-- Update friendships policies to include new columns
-- (existing policies should still work, but we can add explicit policies for new columns if needed)

-- ============================================================================
-- HELPER FUNCTIONS FOR NOTIFICATIONS
-- ============================================================================

-- Function: Get paginated notifications for user
create or replace function public.get_notifications(
  p_recipient_id uuid default public.current_profile_id(),
  p_limit integer default 20,
  p_offset integer default 0,
  p_unread_only boolean default false
)
returns setof public.notifications
language sql
stable
security definer
set search_path = public
as $$
  select *
  from public.notifications
  where recipient_id = p_recipient_id
    and (not p_unread_only or read_at is null)
  order by created_at desc
  limit p_limit offset p_offset;
$$;

-- Function: Get notifications with actor/profile info
create or replace function public.get_notifications_with_actors(
  p_recipient_id uuid default public.current_profile_id(),
  p_limit integer default 20,
  p_offset integer default 0,
  p_unread_only boolean default false
)
returns table (
  id uuid,
  recipient_id uuid,
  actor_id uuid,
  type public.notification_type,
  title text,
  message text,
  friendship_id uuid,
  group_id uuid,
  group_invite_id uuid,
  blend_id uuid,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz,
  actor_username text,
  actor_display_name text,
  actor_avatar_url text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    n.id,
    n.recipient_id,
    n.actor_id,
    n.type,
    n.title,
    n.message,
    n.friendship_id,
    n.group_id,
    n.group_invite_id,
    n.blend_id,
    n.metadata,
    n.read_at,
    n.created_at,
    p.username as actor_username,
    p.display_name as actor_display_name,
    p.avatar_url as actor_avatar_url
  from public.notifications n
  left join public.profiles p on p.id = n.actor_id
  where n.recipient_id = p_recipient_id
    and (not p_unread_only or n.read_at is null)
  order by n.created_at desc
  limit p_limit offset p_offset;
$$;

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite index for common notification queries
create index notifications_recipient_type_created_idx
on public.notifications (recipient_id, type, created_at desc);

-- Index for group invite lookups by code (already unique, but good for explicit lookups)
-- Already covered by unique constraint on code

-- ============================================================================
-- COMMENTS
-- ============================================================================

comment on table public.notifications is 'User notifications for friend requests, group invites, blend updates, etc.';
comment on table public.group_invites is 'Group invitation links/codes for joining groups';
comment on table public.group_invite_usages is 'Tracks which users have used which group invites';
comment on column public.friendships.accepted_at is 'Timestamp when friendship was accepted';
comment on column public.friendships.declined_at is 'Timestamp when friendship was declined';
comment on column public.friendships.blocked_at is 'Timestamp when friendship was blocked';
comment on column public.friendships.last_interaction_at is 'Timestamp of last status change or interaction';
comment on function public.create_notification is 'Creates a notification for a user';
comment on function public.mark_notification_read is 'Marks a single notification as read';
comment on function public.mark_all_notifications_read is 'Marks all unread notifications as read for a user';
comment on function public.get_unread_notification_count is 'Returns count of unread notifications for a user';
comment on function public.create_group_invite is 'Creates a new group invite link/code';
comment on function public.accept_group_invite is 'Accepts a group invite by code, adds user to group';
comment on function public.revoke_group_invite is 'Revokes a pending group invite (owner only)';
comment on function public.cleanup_expired_invites is 'Marks expired invites as expired (can be run via cron)';