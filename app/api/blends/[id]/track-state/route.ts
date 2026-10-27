import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: blendId } = await params;
  const { trackId, state } = await request.json();

  if (!trackId || !state) {
    return NextResponse.json({ error: 'trackId and state are required' }, { status: 400 });
  }

  if (!['active', 'pinned', 'excluded'].includes(state)) {
    return NextResponse.json({ error: 'Invalid state' }, { status: 400 });
  }

  const { error } = await supabase.from('blend_tracks').update({ state }).eq('blend_id', blendId).eq('track_id', trackId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}