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

  const { data: blend } = await supabase.from('blends').select('id, name').eq('id', blendId).single();
  if (!blend) return NextResponse.json({ error: 'Blend not found' }, { status: 404 });

  const { data: tracks } = await supabase
    .from('blend_tracks')
    .select('state, reason, position, tracks(id, title, artist, album, artwork_url, isrc)')
    .eq('blend_id', blendId)
    .order('position');

  if (!tracks) return NextResponse.json({ csv: '' });

  const csv = [
    ['Title', 'Artist', 'Album', 'State', 'Reason', 'Position', 'ISRC'].join(','),
    ...tracks.map((t: any) => [
      `"${t.tracks?.title || ''}"`,
      `"${t.tracks?.artist || ''}"`,
      `"${t.tracks?.album || ''}"`,
      t.state,
      `"${t.reason || ''}"`,
      t.position,
      t.tracks?.isrc || '',
    ].join(',')),
  ].join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${blend.name}.csv"`,
    },
  });
}