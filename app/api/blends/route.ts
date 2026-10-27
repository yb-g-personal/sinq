import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Get all blends for the user
  const { data: blends, error } = await supabase
    .from('blends')
    .select('id, kind, name, description, overlap, last_refreshed_at, group_id, pair_low, pair_high, created_at')
    .or(`pair_low.eq.${user.id},pair_high.eq.${user.id}`)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich group blends with member count and user role
  const enrichedBlends = await Promise.all((blends ?? []).map(async (blend) => {
    let member_count = 0;
    let role = 'member';

    if (blend.kind === 'group' && blend.group_id) {
      const { data: members } = await supabase
        .from('group_members')
        .select('user_id, role')
        .eq('group_id', blend.group_id);

      member_count = members?.length ?? 0;

      const userMember = members?.find((m) => m.user_id === user.id);
      if (userMember) role = userMember.role;
    }

    return {
      ...blend,
      members: [], // Will be populated by the client if needed
      lastUpdated: blend.last_refreshed_at
        ? new Date(blend.last_refreshed_at).toLocaleDateString()
        : 'not refreshed',
      member_count,
      role,
    };
  }));

  return NextResponse.json(enrichedBlends);
}