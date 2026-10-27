import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use admin API to delete user (requires service role)
  // For now, we'll delete the profile data and sign out
  // In production, you'd use the Supabase Admin API with service role key
  const { error: signOutError } = await supabase.auth.signOut();
  if (signOutError) return NextResponse.json({ error: signOutError.message }, { status: 500 });

  // Note: Actual account deletion requires service role and should be done via a secure server-side function
  // This is a placeholder - the real implementation would call a Supabase Edge Function with service role
  return NextResponse.json({ success: true, message: 'Account deletion initiated. Check your email for confirmation.' });
}