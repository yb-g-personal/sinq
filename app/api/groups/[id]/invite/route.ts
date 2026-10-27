import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: groupId } = await params;
  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

  const normalizedUsername = username.trim().toLowerCase();
  const { data: friend, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', normalizedUsername)
    .single();

  if (lookupError || !friend) return NextResponse.json({ error: 'No user found with that username' }, { status: 404 });
  if (friend.id === user.id) return NextResponse.json({ error: 'You cannot invite yourself' }, { status: 400 });

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', friend.id)
    .single();

  if (existingMember) return NextResponse.json({ error: 'User is already a member of this group' }, { status: 400 });

  // Check if there's already a pending invitation
  const { data: existingInvite } = await supabase
    .from('group_invitations')
    .select('id')
    .eq('group_id', groupId)
    .eq('invited_user_id', friend.id)
    .eq('status', 'pending')
    .single();

  if (existingInvite) return NextResponse.json({ error: 'Invitation already sent' }, { status: 400 });

  // Create invitation
  const { error } = await supabase.rpc('create_group_invitation', {
    p_group_id: groupId,
    p_invited_user_id: friend.id,
    p_invited_by: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}