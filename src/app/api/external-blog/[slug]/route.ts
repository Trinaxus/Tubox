import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    error: 'external-blog/[slug] endpoint deprecated. Use /api/json-blog/[slug] instead.'
  }, { status: 410 });
}
