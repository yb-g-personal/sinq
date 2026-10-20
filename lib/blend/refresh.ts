import { createClient } from '@/lib/supabase/server';
import { fetchLastFmRecentTracks } from '@/lib/providers/lastfm';

export async function refreshBlend(blendId: string, lastFmUsernames: string[]) {
  const supabase = await createClient();
  const idempotencyKey = `${blendId}:${new Date().toISOString().slice(0, 13)}`;
  const { data: job, error: jobError } = await supabase.from('refresh_jobs').insert({ blend_id: blendId, idempotency_key: idempotencyKey, status: 'running' }).select('id').single();
  if (jobError) return { ok: false, error: jobError.message };
  try {
    const signals = (await Promise.all(lastFmUsernames.map((username) => fetchLastFmRecentTracks(username)))).flat();
    const { error } = await supabase.from('blends').update({ refresh_status: 'ready', last_refreshed_at: new Date().toISOString() }).eq('id', blendId);
    if (error) throw error;
    await supabase.from('refresh_jobs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', job.id);
    return { ok: true, importedSignals: signals.length };
  } catch (error) {
    await supabase.from('refresh_jobs').update({ status: 'failed', error_message: error instanceof Error ? error.message : 'Unknown refresh error' }).eq('id', job.id);
    return { ok: false, error: error instanceof Error ? error.message : 'Unknown refresh error' };
  }
}
