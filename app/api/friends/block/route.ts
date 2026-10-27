import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

  const normalizedUsername = username.trim().toLowerCase();
  const { data: target, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', normalizedUsername)
    .single();

  if (lookupError || !target) return NextResponse.json({ error: 'No user found with that username' }, { status: 404 });
  if (target.id === user.id) return NextResponse.json({ error: 'You cannot block yourself' }, { status: 400 });

  // Remove any existing friendship
  const [userLow, userHigh] = [user.id, target.id].sort();
  await supabase.from('friendships').delete().eq('user_low', userLow).eq('user_high', userHigh);

  // Add block
  const { error } = await supabase.from('blocked_users').insert({
    blocker_id: user.id,
    blocked_id: target.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}