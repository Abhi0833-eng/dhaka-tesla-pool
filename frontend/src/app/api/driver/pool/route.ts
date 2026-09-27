import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: userPayload.id },
      include: {
        pools: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          include: {
            rideRequests: {
              include: {
                passenger: {
                  select: { id: true, name: true, email: true, walletBalancePoysha: true },
                },
                auditLogs: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'No Tesla vehicle found for driver.' }, { status: 404 });
    }

    const currentPool = vehicle.pools[0] || null;

    return NextResponse.json({
      vehicle: {
        id: vehicle.id,
        model: vehicle.model,
        licensePlate: vehicle.licensePlate,
        capacity: vehicle.capacity,
        isOnline: vehicle.isOnline,
        currentZone: vehicle.currentZone,
      },
      currentPool: currentPool
        ? {
            ...currentPool,
            rideRequests: currentPool.rideRequests.map((r) => ({
              ...r,
              finalFareBDT: r.finalFarePoysha / 100,
            })),
          }
        : null,
      poolsHistory: vehicle.pools,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch driver pool.' }, { status: 500 });
  }
}
