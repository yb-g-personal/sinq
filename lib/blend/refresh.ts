import { createClient } from '@/lib/supabase/server';
import { fetchLastFmRecentTracks } from '@/lib/providers/lastfm';

export async function refreshBlend(blendId: string, lastFmUsernames: string[]) {
  const supabase = await createClient();
  const idempotencyKey = `${blendId}:${new Date().toISOString().slice(0, 13)}`;
  let { data: job, error: jobError } = await supabase.from('refresh_jobs').insert({ blend_id: blendId, idempotency_key: idempotencyKey, status: 'running' }).select('id').single();
  if (jobError) {
    const { data: existingJob } = await supabase.from('refresh_jobs').select('id, status').eq('idempotency_key', idempotencyKey).maybeSingle();
    if (!existingJob) return { ok: false, error: jobError.message };
    if (existingJob.status === 'running') return { ok: false, error: 'A listening sync is already running for this blend.' };
    if (existingJob.status === 'completed') return { ok: true, importedSignals: 0 };
    const retry = await supabase.from('refresh_jobs').update({ status: 'running', error_message: null, completed_at: null }).eq('id', existingJob.id).select('id').single();
    job = retry.data;
    jobError = retry.error;
    if (jobError || !job) return { ok: false, error: jobError?.message ?? 'Could not restart the listening sync.' };
  }
  if (!job) return { ok: false, error: 'Could not create a listening sync job.' };
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
