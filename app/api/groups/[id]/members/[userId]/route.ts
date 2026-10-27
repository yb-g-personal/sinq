import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: groupId, userId: memberId } = await params;

  // Verify ownership
  const { data: group, error: groupError } = await supabase
    .from('groups')
    .select('owner_id')
    .eq('id', groupId)
    .single();

  if (groupError || !group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });
  if (group.owner_id !== user.id) return NextResponse.json({ error: 'Only the owner can remove members' }, { status: 403 });
  if (memberId === user.id) return NextResponse.json({ error: 'Owner cannot remove themselves' }, { status: 400 });

  const { error } = await supabase.from('group_members').delete()
    .eq('group_id', groupId).eq('user_id', memberId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}