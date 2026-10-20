import { createClient } from '@/lib/supabase/server';
import { fetchLastFmRecentTracks } from '@/lib/providers/lastfm';

export async function refreshBlend(blendId: string, lastFmUsernames: string[]) {
  const supabase = await createClient();
  const idempotencyKey = `${blendId}:${new Date().toISOString().slice(0, 13)}`;
  const { data: job, error: jobError } = await supabase.from('refresh_jobs').insert({ blend_id: blendId, idempotency_key: idempotencyKey, status: 'running' }).select('id').single();
  if (jobError) return { ok: false, error: jobError.message };
  try {
    const results = await Promise.all(lastFmUsernames.map(async (username) => ({ username, tracks: await fetchLastFmRecentTracks(username) })));
    const signals = results.flatMap((result) => result.tracks);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');
    const { data: connection } = await supabase.from('provider_connections').select('id').eq('user_id', user.id).eq('provider', 'lastfm').eq('provider_user_id', lastFmUsernames[0]).single();
    if (connection && signals.length) {
      const { error: signalError } = await supabase.from('listening_signals').insert(signals.map((track) => ({ user_id: user.id, provider_connection_id: connection.id, artist: track.artist['#text'], listened_at: track.date?.uts ? new Date(Number(track.date.uts) * 1000).toISOString() : new Date().toISOString(), play_count: track.playcount ? Number(track.playcount) : null, source_payload: track })));
      if (signalError) throw signalError;
      const { error: connectionError } = await supabase.from('provider_connections').update({ last_synced_at: new Date().toISOString() }).eq('id', connection.id);
      if (connectionError) throw connectionError;
    }
    const { error } = await supabase.from('blends').update({ refresh_status: 'ready', last_refreshed_at: new Date().toISOString() }).eq('id', blendId);
    if (error) throw error;
    await supabase.from('refresh_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id);
    return { ok: true, importedSignals: signals.length };
  } catch (error) {
    await supabase.from('refresh_jobs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Unknown refresh error' }).eq('id', job.id);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown refresh error' };
  }
}
