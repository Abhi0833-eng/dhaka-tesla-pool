import { NextResponse } from 'next/server';
import { DHAKA_ZONES } from '@/lib/fare';

export async function GET() {
  return NextResponse.json({
    status: 'OK',
    service: 'Dhaka Tesla Pool Vercel Native API',
    timestamp: new Date().toISOString(),
    zones: Object.keys(DHAKA_ZONES),
  });
}
