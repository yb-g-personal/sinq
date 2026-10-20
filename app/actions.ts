'use server';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { refreshBlend } from '@/lib/blend/refresh';

export type SignInState = { error?: string };

function getAppOrigin() {
	if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '');
	const requestHeaders = headers();
	const protocol = requestHeaders.get('x-forwarded-proto') ?? 'http';
	const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
	return host ? `${protocol}://${host}` : 'http://localhost:3000';
}

function redirectWithNotice(path: string, kind: 'success' | 'error', message: string): never {
	redirect(`${path}?notice=${encodeURIComponent(`${kind}|${message}`)}`);
}

function publicError(message: string) {
	return message.includes('violates row-level security') ? 'Your session expired. Please sign in again and retry.' : message;
}

export async function signIn(_previousState: SignInState, formData: FormData): Promise<SignInState> {
	if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
		return { error: 'Authentication is not configured yet. Please try again later.' };
	}

	const supabase = await createClient();
	const { error } = await supabase.auth.signInWithPassword({
		email: String(formData.get('email')).trim(),
		password: String(formData.get('password'))
	});

	if (error) {
		return {
			error: error.message === 'Email not confirmed'
				? 'Please confirm your email address from the message in your inbox before signing in.'
				: 'That email and password combination could not be signed in.'
		};
	}

	redirectWithNotice('/', 'success', 'You are signed in.');
}
export async function signUp(formData: FormData) { const supabase = await createClient(); const { error } = await supabase.auth.signUp({ email: String(formData.get('email')).trim(), password: String(formData.get('password')), options: { emailRedirectTo: `${getAppOrigin()}/sign-in`, data: { username: String(formData.get('username')), display_name: String(formData.get('display_name')) } } }); if (error) redirectWithNotice('/sign-in', 'error', 'We could not create that account. Check your details and try again.'); redirect('/sign-in?notice=check-email'); }
export async function createGroup(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in?notice=error%7CPlease%20sign%20in%20before%20creating%20a%20group.'); const { data, error } = await supabase.from('groups').insert({ owner_id: user.id, name: String(formData.get('name')), description: String(formData.get('description') || '') }).select('id').single(); if (error) redirectWithNotice('/groups', 'error', publicError(error.message)); redirectWithNotice(`/blends/${data.id}`, 'success', 'Group created.'); }
export async function setBlendTrackState(blendId: string, trackId: string, state: 'active' | 'pinned' | 'excluded') { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirectWithNotice('/sign-in', 'error', 'Please sign in again.'); const { error } = await supabase.from('blend_tracks').update({ state }).eq('blend_id', blendId).eq('track_id', trackId); if (error) redirectWithNotice(`/blends/${blendId}`, 'error', publicError(error.message)); redirectWithNotice(`/blends/${blendId}`, 'success', 'Track updated.'); }
export async function updateProfile(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirectWithNotice('/sign-in', 'error', 'Please sign in again.'); const { error } = await supabase.from('profiles').update({ display_name: String(formData.get('display_name')), username: String(formData.get('username')) }).eq('id', user.id); if (error) redirectWithNotice('/settings', 'error', publicError(error.message)); redirectWithNotice('/settings', 'success', 'Settings saved.'); }
export async function connectLastFm(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirectWithNotice('/sign-in', 'error', 'Please sign in again.'); const username = String(formData.get('username')).trim(); if (!username) redirectWithNotice('/services', 'error', 'Enter a Last.fm username first.'); const { error } = await supabase.from('provider_connections').upsert({ user_id: user.id, provider: 'lastfm', provider_user_id: username, disconnected_at: null }, { onConflict: 'user_id,provider' }); if (error) redirectWithNotice('/services', 'error', publicError(error.message)); redirectWithNotice('/services', 'success', 'Last.fm connected.'); }
export async function addFriend(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirectWithNotice('/sign-in', 'error', 'Please sign in again.'); const username = String(formData.get('username')).trim().toLowerCase(); const { data: friend, error: lookupError } = await supabase.from('profiles').select('id').eq('username_normalized', username).single(); if (lookupError || !friend) redirectWithNotice('/friends', 'error', 'No user found with that username.'); if (friend.id === user.id) redirectWithNotice('/friends', 'error', 'You cannot add yourself.'); const [userLow, userHigh] = [user.id, friend.id].sort(); const { error } = await supabase.from('friendships').upsert({ user_low: userLow, user_high: userHigh, requested_by: user.id, status: 'pending' }, { onConflict: 'user_low,user_high' }); if (error) redirectWithNotice('/friends', 'error', publicError(error.message)); redirectWithNotice('/friends', 'success', 'Friend request sent.'); }
export async function refreshListening() {
	const supabase = await createClient();
	const { data: { user } } = await supabase.auth.getUser();
	if (!user) redirectWithNotice('/sign-in', 'error', 'Please sign in again.');
	const [{ data: connection }, { data: pairBlends }, { data: memberships }] = await Promise.all([
		supabase.from('provider_connections').select('provider_user_id').eq('user_id', user.id).eq('provider', 'lastfm').single(),
		supabase.from('blends').select('id').or(`pair_low.eq.${user.id},pair_high.eq.${user.id}`),
		supabase.from('group_members').select('group_id').eq('user_id', user.id)
	]);
	if (!connection?.provider_user_id) redirectWithNotice('/services', 'error', 'Connect a Last.fm username first.');
	const groupIds = (memberships ?? []).map((membership) => membership.group_id);
	const { data: groupBlends } = groupIds.length
		? await supabase.from('blends').select('id').in('group_id', groupIds)
		: { data: [] };
	const blendIds = [...(pairBlends ?? []), ...(groupBlends ?? [])];
	const results = await Promise.all(blendIds.map((blend) => refreshBlend(blend.id, [connection.provider_user_id!])));
	const failed = results.find((result) => !result.ok);
	if (failed) redirectWithNotice('/services', 'error', failed.error ?? 'Listening sync failed.');
	redirectWithNotice('/services', 'success', `Listening synced${results.length ? ` across ${results.length} blend${results.length === 1 ? '' : 's'}` : ''}.`);
}
