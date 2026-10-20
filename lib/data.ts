import { createClient } from '@/lib/supabase/server';
import type { Blend, Profile, Track } from '@/lib/types';

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type BlendRow = {
  id: string;
  kind: 'pair' | 'group';
  name: string;
  description: string | null;
  overlap: number;
  last_refreshed_at: string | null;
  group_id: string | null;
  pair_low: string | null;
  pair_high: string | null;
};

function initials(displayName: string) {
  return displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}

export function toProfile(row: ProfileRow): Profile {
  return { id: row.id, displayName: row.display_name, username: row.username, initials: initials(row.display_name), tone: 'bg-[#dec4f7]', status: 'Listening now' };
}

export type FriendshipView = { id: string; status: 'pending' | 'accepted' | 'declined' | 'blocked'; requestedBy: string; other: Profile };
export type GroupInvitationView = { id: string; groupId: string; groupName: string; inviter: Profile };
export type RecentScrobble = { title: string; artist: string; listenedAt: string };

function formatUpdated(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'not refreshed';
}

function toBlend(row: BlendRow, members: string[] = [], tracks: Track[] = []): Blend {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    members,
    overlap: row.overlap,
    lastUpdated: formatUpdated(row.last_refreshed_at),
    description: row.description ?? 'A shared listening room that changes as your taste evolves.',
    tracks,
    scores: [
      { label: 'Shared signal', value: row.overlap, explanation: 'Shared listening signals currently available for this blend.' },
      { label: 'Discovery potential', value: Math.max(0, 100 - row.overlap), explanation: 'Tracks from the edges of each listening profile can open a new path.' }
    ]
  };
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('id', user.id).single();
  if (error) throw new Error(error.message);
  return toProfile(data as ProfileRow);
}

export async function getBlends() {
  const supabase = await createClient();
  const { data, error } = await supabase.from('blends').select('id, kind, name, description, overlap, last_refreshed_at, group_id, pair_low, pair_high').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as BlendRow[]).map((row) => toBlend(row));
}

export async function getBlend(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from('blends').select('id, kind, name, description, overlap, last_refreshed_at, group_id, pair_low, pair_high, blend_tracks(state, reason, position, tracks(id, title, artist, album, artwork_url))').eq('id', id).single();
  if (error) return null;
  const row = {
    ...data,
    blend_tracks: data.blend_tracks.map((item) => ({
      state: item.state as 'active' | 'excluded' | 'pinned',
      reason: item.reason as string,
      position: item.position as number,
      tracks: Array.isArray(item.tracks) ? item.tracks[0] ?? null : item.tracks
    }))
  };
  const memberIds = row.kind === 'group' && row.group_id
    ? (await supabase.from('group_members').select('profiles(display_name)').eq('group_id', row.group_id)).data?.map((member) => (member.profiles as unknown as { display_name: string }).display_name) ?? []
    : [];
  const tracks = row.blend_tracks.filter((item) => item.tracks).sort((a, b) => a.position - b.position).map((item) => ({
    id: item.tracks!.id, title: item.tracks!.title, artist: item.tracks!.artist, album: item.tracks!.album ?? '', reason: item.reason, pinned: item.state === 'pinned', excluded: item.state === 'excluded'
  }));
  return toBlend(row, memberIds, tracks);
}

export async function getFriends() {
  return (await getFriendships()).filter((friendship) => friendship.status === 'accepted').map((friendship) => friendship.other);
}

export async function getFriendships() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('friendships').select('id, status, requested_by, user_low, user_high, profiles_low:profiles!friendships_user_low_fkey(id, username, display_name, avatar_url), profiles_high:profiles!friendships_user_high_fkey(id, username, display_name, avatar_url)').or(`user_low.eq.${user.id},user_high.eq.${user.id}`);
  if (error) throw new Error(error.message);
  return (data ?? []).map((friendship) => {
    const raw = friendship as {
      id: string;
      status: FriendshipView['status'];
      requested_by: string;
      user_low: string;
      profiles_low: ProfileRow | ProfileRow[];
      profiles_high: ProfileRow | ProfileRow[];
    };
    const row = {
      user_low: raw.user_low,
      profiles_low: Array.isArray(raw.profiles_low) ? raw.profiles_low[0] : raw.profiles_low,
      profiles_high: Array.isArray(raw.profiles_high) ? raw.profiles_high[0] : raw.profiles_high
    };
    if (!row.profiles_low || !row.profiles_high) throw new Error('Friend profile data is incomplete');
    return { id: raw.id, status: raw.status, requestedBy: raw.requested_by, other: toProfile(row.user_low === user.id ? row.profiles_high : row.profiles_low) };
  });
}

export async function getGroupInvitations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('group_invitations').select('id, group_id, groups(name), profiles!group_invitations_inviter_id_fkey(id, username, display_name, avatar_url)').eq('invitee_id', user.id).eq('status', 'pending').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((invitation) => {
    const group = Array.isArray(invitation.groups) ? invitation.groups[0] : invitation.groups;
    const inviter = Array.isArray(invitation.profiles) ? invitation.profiles[0] : invitation.profiles;
    return { id: invitation.id, groupId: invitation.group_id, groupName: group?.name ?? 'Shared group', inviter: toProfile(inviter as ProfileRow) };
  }) as GroupInvitationView[];
}

export async function getOwnedGroups() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('groups').select('id, name').eq('owner_id', user.id).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getRecentScrobbles() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase.from('listening_signals').select('artist, listened_at, source_payload').eq('user_id', user.id).order('listened_at', { ascending: false }).limit(6);
  if (error) throw new Error(error.message);
  return (data ?? []).map((signal) => {
    const payload = signal.source_payload as { name?: string } | null;
    return { title: payload?.name ?? 'Recent listen', artist: signal.artist ?? 'Unknown artist', listenedAt: signal.listened_at ?? '' };
  }) as RecentScrobble[];
}
