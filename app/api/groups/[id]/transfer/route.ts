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
  const { newOwnerId } = await request.json();
  if (!newOwnerId) return NextResponse.json({ error: 'New owner ID is required' }, { status: 400 });

  // Verify ownership
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (groupError || !group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: 'Only the owner can transfer ownership' }, { status: 403 });

  // Verify new owner is a member
  const { data: member, error: memberError } = await supabase
    .from('group_members')
    .select('id')
    .eq('group_id', groupId)
    .eq('user_id', newOwnerId)
    .single();

  if (memberError || !member) return NextResponse.json({ error: 'New owner must be a member of the group' }, { status: 400 });

  const { error } = await supabase.from('groups').update({ owner_id: newOwnerId }).eq('id', groupId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update roles
  await supabase.from('group_members').update({ role: 'member' }).eq('group_id', groupId).eq('user_id', user.id);
  await supabase.from('group_members').update({ role: 'owner' }).eq('group_id', groupId).eq('user_id', newOwnerId);

  return NextResponse.json({ success: true });
}