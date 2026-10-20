create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, invitee_id)
);

alter table public.group_invitations enable row level security;

create policy "users see their group invitations" on public.group_invitations
  for select using (auth.uid() in (inviter_id, invitee_id) or public.is_group_member(group_id));
create policy "group owners invite users" on public.group_invitations
  for insert with check (auth.uid() = inviter_id and exists (select 1 from public.groups where id = group_id and owner_id = auth.uid()));
create policy "invitees respond to invitations" on public.group_invitations
  for update using (auth.uid() = invitee_id) with check (auth.uid() = invitee_id);

create or replace function public.accept_group_invitation(target_invitation_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare invitation public.group_invitations;
begin
  select * into invitation
  from public.group_invitations
  where id = target_invitation_id and invitee_id = auth.uid() and status = 'pending'
  for update;
  if not found then return false; end if;
  insert into public.group_members (group_id, user_id, role)
  values (invitation.group_id, auth.uid(), 'member');
  update public.group_invitations set status = 'accepted', updated_at = now() where id = target_invitation_id;
  return true;
exception when unique_violation then
  update public.group_invitations set status = 'accepted', updated_at = now() where id = target_invitation_id;
  return true;
end;
$$;

grant execute on function public.accept_group_invitation(uuid) to authenticated;

create or replace function public.is_blend_participant(target_blend_id uuid, target_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blends b
    left join public.friendships f on f.user_low = b.pair_low and f.user_high = b.pair_high and f.status = 'accepted'
    where b.id = target_blend_id
      and (target_user_id in (f.user_low, f.user_high) or public.is_group_member(b.group_id, target_user_id))
  );
$$;

drop policy if exists "blend participants see blends" on public.blends;
drop policy if exists "blend participants update blends" on public.blends;
create policy "blend participants see blends" on public.blends for select using (public.is_blend_participant(id));
create policy "blend participants update blends" on public.blends for update using (public.is_blend_participant(id));

drop policy if exists "blend participants see tracks" on public.blend_tracks;
drop policy if exists "blend participants update tracks" on public.blend_tracks;
create policy "blend participants see tracks" on public.blend_tracks for select using (public.is_blend_participant(blend_id));
create policy "blend participants update tracks" on public.blend_tracks for update using (public.is_blend_participant(blend_id));

drop policy if exists "blend participants see track metadata" on public.tracks;
create policy "blend participants see track metadata" on public.tracks for select using (exists (select 1 from public.blend_tracks bt where bt.track_id = tracks.id and public.is_blend_participant(bt.blend_id)));

drop policy if exists "blend participants see refresh jobs" on public.refresh_jobs;
drop policy if exists "blend participants create refresh jobs" on public.refresh_jobs;
drop policy if exists "blend participants update refresh jobs" on public.refresh_jobs;
create policy "blend participants see refresh jobs" on public.refresh_jobs for select using (public.is_blend_participant(blend_id));
create policy "blend participants create refresh jobs" on public.refresh_jobs for insert with check (public.is_blend_participant(blend_id));
create policy "blend participants update refresh jobs" on public.refresh_jobs for update using (public.is_blend_participant(blend_id));