import { NextResponse } from 'next/server';
import { DHAKA_ZONES } from '@/lib/fare';

export async function GET() {
  return NextResponse.json({ zones: DHAKA_ZONES });
}
