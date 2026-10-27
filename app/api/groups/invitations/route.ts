import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('group_invitations')
    .select(`
      id,
      group_id,
      invite_code,
      status,
      expires_at,
      created_at,
      invited_by,
      invited_user_id,
      groups!inner(name),
      profiles!group_invitations_invited_by_fkey(display_name, username)
    `)
    .eq('invited_user_id', user.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const invitations = (data ?? []).map((invite: any) => ({
    id: invite.id,
    group_id: invite.group_id,
    group_name: invite.groups?.name || 'Unknown Group',
    invited_by: {
      display_name: invite.profiles?.display_name || 'Unknown',
      username: invite.profiles?.username || 'unknown',
    },
    invite_code: invite.invite_code,
    expires_at: invite.expires_at,
    created_at: invite.created_at,
  }));

  return NextResponse.json({ invitations });
}