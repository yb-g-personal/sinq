import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: groupId } = await params;

  const { data: inviteCode, error } = await supabase.rpc('generate_group_invite_link', {
    p_group_id: groupId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/groups/join/${inviteCode}`;

  return NextResponse.json({ inviteLink, inviteCode });
}