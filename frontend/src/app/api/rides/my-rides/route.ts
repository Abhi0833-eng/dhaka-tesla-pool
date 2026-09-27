import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const rides = await prisma.rideRequest.findMany({
      where: { passengerId: userPayload.id },
      orderBy: { createdAt: 'desc' },
      include: {
        pool: {
          include: {
            vehicle: {
              include: {
                driver: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        auditLogs: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    const formattedRides = rides.map((r) => ({
      ...r,
      finalFareBDT: r.finalFarePoysha / 100,
      fareBaseBDT: r.fareBasePoysha / 100,
      fareDistanceBDT: r.fareDistancePoysha / 100,
      fareDiscountBDT: r.fareDiscountPoysha / 100,
    }));

    return NextResponse.json({ rides: formattedRides });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve passenger rides.' }, { status: 500 });
  }
}
