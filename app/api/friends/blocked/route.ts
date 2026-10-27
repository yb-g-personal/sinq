import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('blocked_users')
    .select(`
      blocked_id,
      profiles!blocked_users_blocked_id_fkey(username, display_name, avatar_url)
    `)
    .eq('blocker_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const blockedUsers = (data ?? []).map((block: any) => ({
    id: block.blocked_id,
    username: block.profiles?.username || '',
    display_name: block.profiles?.display_name || '',
    avatar_url: block.profiles?.avatar_url || null,
    initials: block.profiles?.display_name
      ? block.profiles.display_name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase()
      : '',
  }));

  return NextResponse.json({ blockedUsers });
}