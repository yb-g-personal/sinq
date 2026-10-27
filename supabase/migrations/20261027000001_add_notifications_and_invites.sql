-- Migration: Add notifications, group invitations, and enhanced social features
-- This migration is additive to the existing schema

-- New enum types
create type public.notification_type as enum (
  'friend_request',
  'friend_request_accepted',
  'friend_request_declined',
  'group_invite',
  'group_invite_accepted',
  'group_invite_declined',
  'member_joined_group',
  'member_left_group',
  'blend_updated',
  'playlist_sync_completed',
  'playlist_sync_failed',
  'provider_connection_expired'
);

create type public.group_invite_status as enum ('pending', 'accepted', 'declined', 'expired');

-- Notifications table
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  message text not null,
  data jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index notifications_user_id_read_at_idx on public.notifications (user_id, read_at) where read_at is null;

-- Group invitations table
create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  invited_user_id uuid references public.profiles(id) on delete cascade,
  invite_code text not null unique,
  status public.group_invite_status not null default 'pending',
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  constraint group_invitations_unique_user_group unique (group_id, invited_user_id) where invited_user_id is not null
);

create index group_invitations_group_id_idx on public.group_invitations (group_id);
create index group_invitations_invited_user_id_idx on public.group_invitations (invited_user_id);
create index group_invitations_invite_code_idx on public.group_invitations (invite_code);

-- Blocked users table
create table public.blocked_users (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

-- Update friendships table to add responded_at timestamp
alter table public.friendships add column if not exists responded_at timestamptz;

-- Add avatar_url to profiles if not exists (already exists, but ensure it's there)
-- The profiles table already has avatar_url, bio, created_at

-- Enable RLS on new tables
alter table public.notifications enable row level security;
alter table public.group_invitations enable row level security;
alter table public.blocked_users enable row level security;

-- RLS Policies for notifications
create policy "users see their notifications" on public.notifications
  for select using (auth.uid() = user_id);

create policy "users manage their notifications" on public.notifications
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "system creates notifications" on public.notifications
  for insert with check (true); -- Server-side only via service role or functions

-- RLS Policies for group_invitations
create policy "group members see invitations" on public.group_invitations
  for select using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = group_invitations.group_id
      and gm.user_id = auth.uid()
    )
    or invited_user_id = auth.uid()
    or invited_by = auth.uid()
  );

create policy "owners manage invitations" on public.group_invitations
  for insert with check (
    exists (
      select 1 from public.groups g
      where g.id = group_invitations.group_id
      and g.owner_id = auth.uid()
    )
  );

create policy "owners update invitations" on public.group_invitations
  for update using (
    exists (
      select 1 from public.groups g
      where g.id = group_invitations.group_id
      and g.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.groups g
      where g.id = group_invitations.group_id
      and g.owner_id = auth.uid()
    )
  );

create policy "invited users respond to invitations" on public.group_invitations
  for update using (invited_user_id = auth.uid()) with check (invited_user_id = auth.uid());

-- RLS Policies for blocked_users
create policy "users see their blocks" on public.blocked_users
  for select using (auth.uid() = blocker_id or auth.uid() = blocked_id);

create policy "users create blocks" on public.blocked_users
  for insert with check (auth.uid() = blocker_id);

create policy "users remove their blocks" on public.blocked_users
  for delete using (auth.uid() = blocker_id);

-- Function to create notifications
create or replace function public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_data jsonb default '{}'
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_notification_id uuid;
begin
  insert into public.notifications (user_id, type, title, message, data)
  values (p_user_id, p_type, p_title, p_message, p_data)
  returning id into v_notification_id;

  return v_notification_id;
end;
$$;

-- Function to mark notification as read
create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_at = now()
  where id = p_notification_id and user_id = auth.uid();
end;
$$;

-- Function to mark all notifications as read
create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set read_at = now()
  where user_id = auth.uid() and read_at is null;
end;
$$;

-- Function to get unread notification count
create or replace function public.get_unread_notification_count()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from public.notifications
  where user_id = auth.uid() and read_at is null;
$$;

-- Function to create group invitation
create or replace function public.create_group_invitation(
  p_group_id uuid,
  p_invited_user_id uuid,
  p_invited_by uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_code text;
  v_invitation_id uuid;
begin
  -- Generate unique invite code
  loop
    v_invite_code := upper(substring(encode(gen_random_bytes(4), 'hex'), 1, 8));
    exit when not exists (select 1 from public.group_invitations where invite_code = v_invite_code);
  end loop;

  insert into public.group_invitations (group_id, invited_by, invited_user_id, invite_code)
  values (p_group_id, p_invited_by, p_invited_user_id, v_invite_code)
  returning id into v_invitation_id;

  -- Create notification for invited user
  perform public.create_notification(
    p_invited_user_id,
    'group_invite',
    'Group invitation',
    (select display_name from public.profiles where id = p_invited_by) || ' invited you to join a group',
    jsonb_build_object('group_id', p_group_id, 'invitation_id', v_invitation_id, 'invite_code', v_invite_code)
  );

  return v_invitation_id;
end;
$$;

-- Function to accept group invitation
create or replace function public.accept_group_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_group_id uuid;
  v_member_count integer;
begin
  -- Get invitation details
  select * into v_invitation
  from public.group_invitations
  where id = p_invitation_id and invited_user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Invitation not found or already processed';
  end if;

  -- Check group member limit
  perform pg_advisory_xact_lock(hashtextextended(v_invitation.group_id::text, 0));
  select count(*) into v_member_count from public.group_members where group_id = v_invitation.group_id;

  if v_member_count >= 10 then
    raise exception 'group_member_limit_exceeded';
  end if;

  -- Add user to group
  insert into public.group_members (group_id, user_id, role)
  values (v_invitation.group_id, auth.uid(), 'member');

  -- Update invitation status
  update public.group_invitations
  set status = 'accepted', accepted_at = now()
  where id = p_invitation_id;

  -- Create notifications
  perform public.create_notification(
    v_invitation.invited_by,
    'group_invite_accepted',
    'Invitation accepted',
    (select display_name from public.profiles where id = auth.uid()) || ' joined the group',
    jsonb_build_object('group_id', v_invitation.group_id, 'user_id', auth.uid())
  );

  -- Notify group members
  insert into public.notifications (user_id, type, title, message, data)
  select gm.user_id, 'member_joined_group', 'New member',
    (select display_name from public.profiles where id = auth.uid()) || ' joined the group',
    jsonb_build_object('group_id', v_invitation.group_id, 'user_id', auth.uid())
  from public.group_members gm
  where gm.group_id = v_invitation.group_id
  and gm.user_id != auth.uid()
  and gm.user_id != v_invitation.invited_by;
end;
$$;

-- Function to decline group invitation
create or replace function public.decline_group_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.group_invitations
  set status = 'declined'
  where id = p_invitation_id and invited_user_id = auth.uid() and status = 'pending';

  if not found then
    raise exception 'Invitation not found or already processed';
  end if;
end;
$$;

-- Trigger to create notifications for friend request events
create or replace function public.notify_friend_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_requester_name text;
  v_recipient_id uuid;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') and NEW.status = 'pending' then
    v_recipient_id := case when NEW.user_low = NEW.requested_by then NEW.user_high else NEW.user_low end;
    select display_name into v_requester_name from public.profiles where id = NEW.requested_by;

    perform public.create_notification(
      v_recipient_id,
      'friend_request',
      'New friend request',
      v_requester_name || ' wants to be your friend',
      jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requested_by)
    );
  end if;
  return NEW;
end;
$$;

create trigger friendship_notification
after insert or update of status on public.friendships
for each row execute function public.notify_friend_request();

-- Trigger to create notifications for friend request acceptance/decline
create or replace function public.notify_friend_response()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_responder_name text;
  v_requester_id uuid;
  v_notification_type public.notification_type;
begin
  if TG_OP = 'UPDATE' and OLD.status = 'pending' and NEW.status in ('accepted', 'declined') then
    v_requester_id := OLD.requested_by;
    select display_name into v_responder_name from public.profiles where id = case when NEW.user_low = auth.uid() then NEW.user_high else NEW.user_low end;

    v_notification_type := case when NEW.status = 'accepted' then 'friend_request_accepted' else 'friend_request_declined' end;

    perform public.create_notification(
      v_requester_id,
      v_notification_type,
      case when NEW.status = 'accepted' then 'Friend request accepted' else 'Friend request declined' end,
      v_responder_name || case when NEW.status = 'accepted' then ' accepted your friend request' else ' declined your friend request' end,
      jsonb_build_object('friendship_id', NEW.id, 'responder_id', case when NEW.user_low = auth.uid() then NEW.user_high else NEW.user_low end)
    );
  end if;
  return NEW;
end;
$$;

create trigger friendship_response_notification
after update of status on public.friendships
for each row execute function public.notify_friend_response();

-- Trigger to create notification when group member joins
create or replace function public.notify_group_member_join()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
begin
  if TG_OP = 'INSERT' then
    select display_name into v_member_name from public.profiles where id = NEW.user_id;

    insert into public.notifications (user_id, type, title, message, data)
    select gm.user_id, 'member_joined_group', 'New member',
      v_member_name || ' joined the group',
      jsonb_build_object('group_id', NEW.group_id, 'user_id', NEW.user_id)
    from public.group_members gm
    where gm.group_id = NEW.group_id
    and gm.user_id != NEW.user_id;
  end if;
  return NEW;
end;
$$;

create trigger group_member_join_notification
after insert on public.group_members
for each row execute function public.notify_group_member_join();

-- Trigger to create notification when group member leaves
create or replace function public.notify_group_member_leave()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_name text;
begin
  if TG_OP = 'DELETE' then
    select display_name into v_member_name from public.profiles where id = OLD.user_id;

    insert into public.notifications (user_id, type, title, message, data)
    select gm.user_id, 'member_left_group', 'Member left',
      v_member_name || ' left the group',
      jsonb_build_object('group_id', OLD.group_id, 'user_id', OLD.user_id)
    from public.group_members gm
    where gm.group_id = OLD.group_id
    and gm.user_id != OLD.user_id;
  end if;
  return OLD;
end;
$$;

create trigger group_member_leave_notification
after delete on public.group_members
for each row execute function public.notify_group_member_leave();

-- Function to generate group invite link
create or replace function public.generate_group_invite_link(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite_code text;
begin
  -- Check if user is owner
  if not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid()) then
    raise exception 'Only group owner can generate invite links';
  end if;

  -- Create a group invitation without specific user (link-based)
  loop
    v_invite_code := upper(substring(encode(gen_random_bytes(6), 'hex'), 1, 12));
    exit when not exists (select 1 from public.group_invitations where invite_code = v_invite_code);
  end loop;

  insert into public.group_invitations (group_id, invited_by, invite_code)
  values (p_group_id, auth.uid(), v_invite_code);

  return v_invite_code;
end;
$$;

-- Function to accept group invite by code
create or replace function public.accept_group_invite_by_code(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invitation record;
  v_member_count integer;
begin
  -- Find invitation by code
  select * into v_invitation
  from public.group_invitations
  where invite_code = p_invite_code and status = 'pending' and expires_at > now();

  if not found then
    raise exception 'Invalid or expired invite code';
  end if;

  -- Check if already a member
  if exists (select 1 from public.group_members where group_id = v_invitation.group_id and user_id = auth.uid()) then
    raise exception 'Already a member of this group';
  end if;

  -- Check group member limit
  perform pg_advisory_xact_lock(hashtextextended(v_invitation.group_id::text, 0));
  select count(*) into v_member_count from public.group_members where group_id = v_invitation.group_id;

  if v_member_count >= 10 then
    raise exception 'group_member_limit_exceeded';
  end if;

  -- Add user to group
  insert into public.group_members (group_id, user_id, role)
  values (v_invitation.group_id, auth.uid(), 'member');

  -- Update invitation
  update public.group_invitations
  set invited_user_id = auth.uid(), status = 'accepted', accepted_at = now()
  where id = v_invitation.id;

  -- Create notifications
  perform public.create_notification(
    v_invitation.invited_by,
    'group_invite_accepted',
    'Someone joined via your link',
    (select display_name from public.profiles where id = auth.uid()) || ' joined the group via your invite link',
    jsonb_build_object('group_id', v_invitation.group_id, 'user_id', auth.uid())
  );

  -- Notify group members
  insert into public.notifications (user_id, type, title, message, data)
  select gm.user_id, 'member_joined_group', 'New member',
    (select display_name from public.profiles where id = auth.uid()) || ' joined the group',
    jsonb_build_object('group_id', v_invitation.group_id, 'user_id', auth.uid())
  from public.group_members gm
  where gm.group_id = v_invitation.group_id
  and gm.user_id != auth.uid()
  and gm.user_id != v_invitation.invited_by;

  return v_invitation.group_id;
end;
$$;

-- Update the ensure_pair_blend trigger to also create notification on acceptance
-- (Already handled by notify_friend_response trigger)

-- Grant permissions for functions
grant execute on function public.create_notification(uuid, notification_type, text, text, jsonb) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.get_unread_notification_count() to authenticated;
grant execute on function public.create_group_invitation(uuid, uuid, uuid) to authenticated;
grant execute on function public.accept_group_invitation(uuid) to authenticated;
grant execute on function public.decline_group_invitation(uuid) to authenticated;
grant execute on function public.generate_group_invite_link(uuid) to authenticated;
grant execute on function public.accept_group_invite_by_code(text) to authenticated;