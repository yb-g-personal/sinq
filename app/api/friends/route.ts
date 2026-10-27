import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('friendships')
    .select('id, user_low, user_high, profiles_low:profiles!friendships_user_low_fkey(id, username, display_name, avatar_url), profiles_high:profiles!friendships_user_high_fkey(id, username, display_name, avatar_url)')
    .eq('status', 'accepted')
    .or(`user_low.eq.${user.id},user_high.eq.${user.id}`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const friends = (data ?? []).map((friendship: any) => {
    const other = friendship.user_low === user.id ? friendship.profiles_high : friendship.profiles_low;
    const profile = Array.isArray(other) ? other[0] : other;
    if (!profile) return null;
    return {
      id: profile.id,
      displayName: profile.display_name,
      username: profile.username,
      initials: profile.display_name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(),
      tone: 'bg-[#dec4f7]',
      status: 'Listening now',
      friendshipId: friendship.id,
    };
  }).filter(Boolean);

  return NextResponse.json(friends);
}