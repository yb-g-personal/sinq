import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  const { data, error } = await supabase
    .from('blends')
    .select(`
      id, kind, name, description, overlap, last_refreshed_at, group_id, pair_low, pair_high,
      blend_tracks(state, reason, position, tracks(id, title, artist, album, artwork_url))
    `)
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Blend not found' }, { status: 404 });

  // Get member names
  let members: string[] = [];
  if (data.kind === 'group' && data.group_id) {
    const { data: groupMembers } = await supabase
      .from('group_members')
      .select('profiles(display_name)')
      .eq('group_id', data.group_id);
    members = (groupMembers ?? []).map((m: any) => m.profiles?.display_name).filter(Boolean);
  } else if (data.kind === 'pair') {
    // For pair blends, get the other user's display name
    const otherId = data.pair_low === user.id ? data.pair_high : data.pair_low;
    if (otherId) {
      const { data: otherProfile } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('id', otherId)
        .single();
      if (otherProfile) {
        // Get current user's display name
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('display_name')
          .eq('id', user.id)
          .single();
        members = [currentProfile?.display_name, otherProfile.display_name].filter(Boolean) as string[];
      }
    }
  }

  const tracks = data.blend_tracks
    ?.filter((item: any) => item.tracks)
    .sort((a: any, b: any) => a.position - b.position)
    .map((item: any) => ({
      id: item.tracks[0]?.id,
      title: item.tracks[0]?.title,
      artist: item.tracks[0]?.artist,
      album: item.tracks[0]?.album ?? '',
      reason: item.reason,
      pinned: item.state === 'pinned',
      excluded: item.state === 'excluded',
    })) ?? [];

  const blend = {
    id: data.id,
    kind: data.kind,
    name: data.name,
    description: data.description ?? 'A shared listening room that changes as your taste evolves.',
    overlap: data.overlap,
    lastUpdated: data.last_refreshed_at ? new Date(data.last_refreshed_at).toLocaleDateString() : 'not refreshed',
    members,
    tracks,
    scores: [
      { label: 'Shared signal', value: data.overlap, explanation: 'Shared listening signals currently available for this blend.' },
      { label: 'Discovery potential', value: Math.max(0, 100 - data.overlap), explanation: 'Tracks from the edges of each listening profile can open a new path.' }
    ]
  };

  return NextResponse.json(blend);
}