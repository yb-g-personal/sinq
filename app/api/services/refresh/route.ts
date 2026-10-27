import { createClient } from '@/lib/supabase/server';
import { refreshBlend } from '@/lib/blend/refresh';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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

  if (!connection?.provider_user_id) {
    return NextResponse.json({ error: 'Connect a Last.fm username first' }, { status: 400 });
  }

  await Promise.all((blends ?? []).map((blend) => refreshBlend(blend.id, [connection.provider_user_id!])));

  return NextResponse.json({ success: true });
}