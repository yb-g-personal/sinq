import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = user.id;

  // Get pending friend requests (received)
  const { data: received, error: receivedError } = await supabase
    .from('friendships')
    .select('id, user_low, user_high, requested_by, created_at, profiles_low:profiles!friendships_user_low_fkey(id, username, display_name, avatar_url), profiles_high:profiles!friendships_user_high_fkey(id, username, display_name, avatar_url)')
    .eq('status', 'pending')
    .neq('requested_by', userId)
    .or(`user_low.eq.${userId},user_high.eq.${userId}`);

  if (receivedError) return NextResponse.json({ error: receivedError.message }, { status: 500 });

  // Get sent friend requests
  const { data: sent, error: sentError } = await supabase
    .from('friendships')
    .select('id, user_low, user_high, requested_by, created_at, profiles_low:profiles!friendships_user_low_fkey(id, username, display_name, avatar_url), profiles_high:profiles!friendships_user_high_fkey(id, username, display_name, avatar_url)')
    .eq('status', 'pending')
    .eq('requested_by', userId);

  if (sentError) return NextResponse.json({ error: sentError.message }, { status: 500 });

  function formatRequest(friendship: any) {
    const other = friendship.user_low === userId ? friendship.profiles_high : friendship.profiles_low;
    const profile = Array.isArray(other) ? other[0] : other;
    return {
      id: friendship.id,
      requester: {
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        initials: profile.display_name.split(/\s+/).map((part: string) => part[0]).join('').slice(0, 2).toUpperCase(),
      },
      created_at: friendship.created_at,
      isSent: friendship.requested_by === userId,
    };
  }

  return NextResponse.json({
    received: (received ?? []).map(formatRequest),
    sent: (sent ?? []).map(formatRequest),
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = user.id;

  const { username } = await request.json();
  if (!username) return NextResponse.json({ error: 'Username is required' }, { status: 400 });

  const normalizedUsername = username.trim().toLowerCase();
  const { data: friend, error: lookupError } = await supabase
    .from('profiles')
    .select('id')
    .eq('username_normalized', normalizedUsername)
    .single();

  if (lookupError || !friend) return NextResponse.json({ error: 'No user found with that username' }, { status: 404 });
  if (friend.id === userId) return NextResponse.json({ error: 'You cannot add yourself' }, { status: 400 });

  // Check if blocked
  const { data: block } = await supabase
    .from('blocked_users')
    .select('id')
    .or(`and(blocker_id.eq.${userId},blocked_id.eq.${friend.id}),and(blocker_id.eq.${friend.id},blocked_id.eq.${userId})`)
    .single();

  if (block) return NextResponse.json({ error: 'Cannot send friend request' }, { status: 400 });

  const [userLow, userHigh] = [userId, friend.id].sort();
  const { error } = await supabase.from('friendships').upsert({
    user_low: userLow,
    user_high: userHigh,
    requested_by: userId,
    status: 'pending',
  }, { onConflict: 'user_low,user_high' });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}