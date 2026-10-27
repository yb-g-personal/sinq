import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'Last.fm username is required' }, { status: 400 });

  const { error } = await supabase.from('provider_connections').upsert({
    user_id: user.id,
    provider: 'lastfm',
    provider_user_id: username,
    disconnected_at: null,
  }, { onConflict: 'user_id,provider' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { error } = await supabase.from('provider_connections').update({
    disconnected_at: new Date().toISOString(),
  }).eq('user_id', user.id).eq('provider', 'lastfm');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}