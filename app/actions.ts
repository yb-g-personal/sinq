'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { refreshBlend } from '@/lib/blend/refresh';

export type SignInState = { error?: string };

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

	redirect('/');
}
export async function signUp(formData: FormData) { const supabase = await createClient(); const { error } = await supabase.auth.signUp({ email: String(formData.get('email')), password: String(formData.get('password')), options: { data: { username: String(formData.get('username')), display_name: String(formData.get('display_name')) } } }); if (error) throw new Error(error.message); redirect('/sign-in'); }
export async function createGroup(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const { data, error } = await supabase.from('groups').insert({ owner_id: user.id, name: String(formData.get('name')), description: String(formData.get('description') || '') }).select('id').single(); if (error) throw new Error(error.message); redirect(`/blends/${data.id}`); }
export async function setBlendTrackState(blendId: string, trackId: string, state: 'active' | 'pinned' | 'excluded') { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const { error } = await supabase.from('blend_tracks').update({ state }).eq('blend_id', blendId).eq('track_id', trackId); if (error) throw new Error(error.message); }
export async function updateProfile(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const { error } = await supabase.from('profiles').update({ display_name: String(formData.get('display_name')), username: String(formData.get('username')) }).eq('id', user.id); if (error) throw new Error(error.message); redirect('/settings'); }
export async function connectLastFm(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const username = String(formData.get('username')).trim(); if (!username) throw new Error('Last.fm username is required'); const { error } = await supabase.from('provider_connections').upsert({ user_id: user.id, provider: 'lastfm', provider_user_id: username, disconnected_at: null }, { onConflict: 'user_id,provider' }); if (error) throw new Error(error.message); redirect('/services'); }
export async function addFriend(formData: FormData) { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const username = String(formData.get('username')).trim().toLowerCase(); const { data: friend, error: lookupError } = await supabase.from('profiles').select('id').eq('username_normalized', username).single(); if (lookupError || !friend) throw new Error('No user found with that username'); if (friend.id === user.id) throw new Error('You cannot add yourself'); const [userLow, userHigh] = [user.id, friend.id].sort(); const { error } = await supabase.from('friendships').upsert({ user_low: userLow, user_high: userHigh, requested_by: user.id, status: 'pending' }, { onConflict: 'user_low,user_high' }); if (error) throw new Error(error.message); redirect('/friends'); }
export async function refreshListening() { const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser(); if (!user) redirect('/sign-in'); const [{ data: connection }, { data: blends }] = await Promise.all([supabase.from('provider_connections').select('provider_user_id').eq('user_id', user.id).eq('provider', 'lastfm').single(), supabase.from('blends').select('id').or(`pair_low.eq.${user.id},pair_high.eq.${user.id}`)]); if (!connection?.provider_user_id) throw new Error('Connect a Last.fm username first'); await Promise.all((blends ?? []).map((blend) => refreshBlend(blend.id, [connection.provider_user_id!]))); redirect('/services'); }
