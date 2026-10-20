import { NextResponse } from 'next/server';
import { refreshBlend } from '@/lib/blend/refresh';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json().catch(() => ({})) as { lastFmUsernames?: string[] };
  const result = await refreshBlend(params.id, body.lastFmUsernames ?? []);
  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
