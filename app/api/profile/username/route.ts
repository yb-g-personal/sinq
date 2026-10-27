import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

  const normalizedUsername = username.trim().toLowerCase();
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', normalizedUsername)
    .neq('id', user.id)
    .single();

  if (existing) return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });

  const { error } = await supabase.from('profiles').update({
    username,
  }).eq('id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update auth user metadata
  await supabase.auth.updateUser({ data: { username } });

  return NextResponse.json({ success: true });
}