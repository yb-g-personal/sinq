import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, description } = await request.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
  }

  const { data, error } = await supabase.from('groups').insert({
    owner_id: user.id,
    name: name.trim(),
    description: description?.trim() || '',
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: data.id });
}