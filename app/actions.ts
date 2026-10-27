'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { refreshBlend } from '@/lib/blend/refresh';
import { revalidatePath } from 'next/cache';

export async function signIn(formData: FormData) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) redirect('/');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
  });
  if (error) throw new Error(error.message);
  redirect('/');
}

export async function signUp(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get('email')),
    password: String(formData.get('password')),
    options: {
      data: {
        username: String(formData.get('username')),
        display_name: String(formData.get('display_name')),
      },
    },
  });
  if (error) throw new Error(error.message);
  redirect('/sign-in');
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(error.message);
  redirect('/sign-in');
}

export async function createGroup(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data, error } = await supabase.from('groups').insert({
    owner_id: user.id,
    name: String(formData.get('name')),
    description: String(formData.get('description') || ''),
  }).select('id').single();
  if (error) throw new Error(error.message);
  redirect(`/blends/${data.id}`);
}

export async function updateGroup(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('groups').update({
    name: String(formData.get('name')),
    description: String(formData.get('description') || ''),
  }).eq('id', groupId).eq('owner_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/blends/${groupId}`);
  redirect(`/blends/${groupId}`);
}

export async function deleteGroup(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('groups').delete().eq('id', groupId).eq('owner_id', user.id);
  if (error) throw new Error(error.message);
  redirect('/groups');
}

export async function inviteToGroup(groupId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const username = String(formData.get('username')).trim().toLowerCase();
  const { data: friend, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', username)
    .single();

  if (lookupError || !friend) throw new Error('No user found with that username');
  if (friend.id === user.id) throw new Error('You cannot invite yourself');

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', friend.id)
    .single();

  if (existingMember) throw new Error('User is already a member of this group');

  // Check if there's already a pending invitation
  const { data: existingInvite } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', groupId)
    .eq('invited_user_id', friend.id)
    .eq('status', 'pending')
    .single();

  if (existingInvite) throw new Error('Invitation already sent');

  // Create invitation
  const { error } = await supabase.rpc('create_group_invitation', {
    p_group_id: groupId,
    p_invited_user_id: friend.id,
    p_invited_by: user.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/blends/${groupId}`);
  redirect(`/blends/${groupId}`);
}

export async function acceptGroupInvite(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.rpc('accept_group_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/groups');
  revalidatePath('/blends');
  redirect('/groups');
}

export async function declineGroupInvite(invitationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.rpc('decline_group_invitation', {
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/groups');
  redirect('/groups');
}

export async function acceptGroupInviteByCode(inviteCode: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: groupId, error } = await supabase.rpc('accept_group_invite_by_code', {
    p_invite_code: inviteCode,
  });
  if (error) throw new Error(error.message);
  revalidatePath('/groups');
  revalidatePath('/blends');
  redirect(`/blends/${groupId}`);
}

export async function leaveGroup(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('group_members').delete()
    .eq('group_id', groupId).eq('user_id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/groups');
  revalidatePath('/blends');
  redirect('/groups');
}

export async function removeGroupMember(groupId: string, memberId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  // Verify ownership
  const { data: group } = await supabase.from('groups').select('owner_id').eq('id', groupId).single();
  if (!group || group.owner_id !== user.id) throw new Error('Only the owner can remove members');
  if (memberId === user.id) throw new Error('Owner cannot remove themselves');
  const { error } = await supabase.from('group_members').delete()
    .eq('group_id', groupId).eq('user_id', memberId);
  if (error) throw new Error(error.message);
  revalidatePath(`/blends/${groupId}`);
  redirect(`/blends/${groupId}`);
}

export async function transferGroupOwnership(groupId: string, newOwnerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  // Verify ownership
  const { data: group } = await supabase.from('groups').select('owner_id').eq('id', groupId).single();
  if (!group || group.owner_id !== user.id) throw new Error('Only the owner can transfer ownership');
  // Verify new owner is a member
  const { data: member } = await supabase.from('group_members').select('id').eq('group_id', groupId).eq('user_id', newOwnerId).single();
  if (!member) throw new Error('New owner must be a member of the group');
  const { error } = await supabase.from('groups').update({ owner_id: newOwnerId }).eq('id', groupId);
  if (error) throw new Error(error.message);
  // Update roles
  await supabase.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', user.id);
  await supabase.from('group_members').update({ role: 'owner' }).eq('group_id', groupId).eq('user_id', newOwnerId);
  revalidatePath(`/blends/${groupId}`);
  redirect(`/blends/${groupId}`);
}

export async function generateGroupInviteLink(groupId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: inviteCode, error } = await supabase.rpc('generate_group_invite_link', {
    p_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/groups/join/${inviteCode}`;
  return { inviteLink, inviteCode };
}

export async function sendFriendRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const username = String(formData.get('username')).trim().toLowerCase();
  const { data: friend, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', username)
    .single();

  if (lookupError || !friend) throw new Error('No user found with that username');
  if (friend.id === user.id) throw new Error('You cannot add yourself');

  // Check if blocked
  const { data: block } = await supabase
    .from('blocked_users')
    .select('id')
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${friend.id}),and(blocker_id.eq.${friend.id},blocked_id.eq.${user.id})`)
    .single();

  if (block) throw new Error('Cannot send friend request');

  const [userLow, userHigh] = [user.id, friend.id].sort();
  const { error } = await supabase.from('friendships').upsert({
    user_low: userLow,
    user_high: userHigh,
    requested_by: user.id,
    status: 'pending',
  }, { onConflict: 'user_low,user_high' });

  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  redirect('/friends');
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);
  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  revalidatePath('/blends');
  redirect('/friends');
}

export async function declineFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'declined', responded_at: new Date().toISOString() })
    .eq('id', friendshipId)
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);
  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  redirect('/friends');
}

export async function cancelFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .eq('requested_by', user.id)
    .eq('status', 'pending');
  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  redirect('/friends');
}

export async function removeFriend(friendshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase
    .from('friendships')
    .delete()
    .eq('id', friendshipId)
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);
  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  revalidatePath('/blends');
  redirect('/friends');
}

export async function blockUser(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const username = String(formData.get('username')).trim().toLowerCase();
  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', username)
    .single();

  if (lookupError || !target) throw new Error('No user found with that username');
  if (target.id === user.id) throw new Error('You cannot block yourself');

  // Remove any existing friendship
  const [userLow, userHigh] = [user.id, target.id].sort();
  await supabase.from('friendships').delete().eq('user_low', userLow).eq('user_high', userHigh);

  // Add block
  const { error } = await supabase.from('blocked_users').insert({
    blocker_id: user.id,
    blocked_id: target.id,
  });

  if (error) throw new Error(error.message);
  revalidatePath('/friends');
  revalidatePath('/settings');
  redirect('/settings');
}

export async function unblockUser(blockedId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);
  if (error) throw new Error(error.message);
  revalidatePath('/settings');
  redirect('/settings');
}

export async function getNotifications() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function markNotificationRead(notificationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.rpc('mark_notification_read', {
    p_notification_id: notificationId,
  });
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.rpc('mark_all_notifications_read');
  if (error) throw new Error(error.message);
}

export async function getUnreadNotificationCount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { data, error } = await supabase.rpc('get_unread_notification_count');
  if (error) throw new Error(error.message);
  return data ?? 0;
}

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('profiles').update({
    display_name: String(formData.get('display_name')),
    username: String(formData.get('username')),
    bio: String(formData.get('bio') || ''),
  }).eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/settings');
  revalidatePath('/');
  redirect('/settings');
}

export async function updateAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  // This would need Supabase Storage integration
  // For now, just update the avatar_url in profiles
  const avatarUrl = String(formData.get('avatar_url'));
  const { error } = await supabase.from('profiles').update({
    avatar_url: avatarUrl,
  }).eq('id', user.id);
  if (error) throw new Error(error.message);
  revalidatePath('/settings');
  redirect('/settings');
}

export async function changeUsername(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const newUsername = String(formData.get('username')).trim().toLowerCase();
  // Check if username is available
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', newUsername)
    .neq('id', user.id)
    .single();

  if (existing) throw new Error('Username is already taken');

  const { error } = await supabase.from('profiles').update({
    username: newUsername,
  }).eq('id', user.id);

  if (error) throw new Error(error.message);
  // Update auth user metadata
  await supabase.auth.updateUser({ data: { username: newUsername } });
  revalidatePath('/settings');
  redirect('/settings');
}

export async function connectLastFm(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const username = String(formData.get('username')).trim();
  if (!username) throw new Error('Last.fm username is required');
  const { error } = await supabase.from('provider_connections').upsert({
    user_id: user.id,
    provider: 'lastfm',
    provider_user_id: username,
    disconnected_at: null,
  }, { onConflict: 'user_id,provider' });
  if (error) throw new Error(error.message);
  revalidatePath('/services');
  redirect('/services');
}

export async function disconnectProvider(provider: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('provider_connections').update({
    disconnected_at: new Date().toISOString(),
  }).eq('user_id', user.id).eq('provider', provider);
  if (error) throw new Error(error.message);
  revalidatePath('/services');
  redirect('/services');
}

export async function refreshListening() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const [{ data: connection }, { data: blends }] = await Promise.all([
    supabase.from('provider_connections')
      .select('provider_user_id')
      .eq('user_id', user.id)
      .eq('provider', 'lastfm')
      .single(),
    supabase.from('blends')
      .select('id')
      .or(`pair_low.eq.${user.id},pair_high.eq.${user.id}`)
  ]);
  if (!connection?.provider_user_id) throw new Error('Connect a Last.fm username first');
  await Promise.all((blends ?? []).map((blend) => refreshBlend(blend.id, [connection.provider_user_id!])));
  revalidatePath('/services');
  revalidatePath('/blends');
  redirect('/services');
}

export async function setBlendTrackState(blendId: string, trackId: string, state: 'active' | 'pinned' | 'excluded') {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { error } = await supabase.from('blend_tracks').update({ state }).eq('blend_id', blendId).eq('track_id', trackId);
  if (error) throw new Error(error.message);
  revalidatePath(`/blends/${blendId}`);
}

export async function exportBlendCSV(blendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: blend } = await supabase.from('blends').select('id, name').eq('id', blendId).single();
  if (!blend) throw new Error('Blend not found');
  const { data: tracks } = await supabase
    .from('blend_tracks')
    .select('state, reason, position, tracks(id, title, artist, album, artwork_url, isrc)')
    .eq('blend_id', blendId)
    .order('position');
  if (!tracks) return '';
  const csv = [
    ['Title', 'Artist', 'Album', 'State', 'Reason', 'Position', 'ISRC'].join(','),
    ...tracks.map((t: any) => [
      `"${t.tracks?.title || ''}"`,
      `"${t.tracks?.artist || ''}"`,
      `"${t.tracks?.album || ''}"`,
      t.state,
      `"${t.reason || ''}"`,
      t.position,
      t.tracks?.isrc || '',
    ].join(',')),
  ].join('\n');
  return csv;
}

export async function copyBlendList(blendId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');
  const { data: blend } = await supabase.from('blends').select('name').eq('id', blendId).single();
  if (!blend) throw new Error('Blend not found');
  const { data: tracks } = await supabase
    .from('blend_tracks')
    .select('tracks(title, artist)')
    .eq('blend_id', blendId)
    .eq('state', 'active')
    .order('position');
  if (!tracks) return '';
  return `${blend.name}\n\n${tracks.map((t: any) => `${t.tracks?.title} - ${t.tracks?.artist}`).join('\n')}`;
}

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  // Delete user data (cascades will handle most)
  // The auth user deletion will cascade to profiles via the foreign key
  const { error } = await supabase.auth.admin.deleteUser(user.id);
  if (error) throw new Error(error.message);

  redirect('/sign-in');
}