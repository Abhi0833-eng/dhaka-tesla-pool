import { NextResponse } from 'next/server';
import { calculateFare } from '@/lib/fare';

export async function POST(req: Request) {
  try {
    const { pickupZone, destinationZone, isPooled = true } = await req.json();

    if (!pickupZone || !destinationZone) {
      return NextResponse.json(
        { error: 'pickupZone and destinationZone are required.' },
        { status: 400 }
      );
    }

    const fare = calculateFare(pickupZone, destinationZone, isPooled);
    return NextResponse.json({ fare });
  } catch (error) {
    return NextResponse.json({ error: 'Error calculating fare.' }, { status: 500 });
  }
}
