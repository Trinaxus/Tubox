import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    error: 'external-blog endpoint deprecated. Use /api/json-blog instead.'
  }, { status: 410 });
}
