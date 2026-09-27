import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { isOnline, currentZone } = await req.json();

    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: userPayload.id },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'No Tesla vehicle found.' }, { status: 404 });
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        isOnline: isOnline !== undefined ? Boolean(isOnline) : vehicle.isOnline,
        currentZone: currentZone || vehicle.currentZone,
      },
    });

    return NextResponse.json({
      message: `Driver status updated to ${updatedVehicle.isOnline ? 'ONLINE' : 'OFFLINE'}.`,
      vehicle: updatedVehicle,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update driver status.' }, { status: 500 });
  }
}
