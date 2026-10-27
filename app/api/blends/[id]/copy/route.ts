import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: blendId } = await params;

  const { data: blend } = await supabase.from('blends').select('name').eq('id', blendId).single();
  if (!blend) return NextResponse.json({ error: 'Blend not found' }, { status: 404 });

  const { data: tracks } = await supabase
    .from('blend_tracks')
    .select('tracks(title, artist)')
    .eq('blend_id', blendId)
    .eq('state', 'active')
    .order('position');

  if (!tracks) return NextResponse.json({ text: '' });

  const text = `${blend.name}\n\n${tracks.map((t: any) => `${t.tracks?.title} - ${t.tracks?.artist}`).join('\n')}`;

  return NextResponse.json({ text });
}