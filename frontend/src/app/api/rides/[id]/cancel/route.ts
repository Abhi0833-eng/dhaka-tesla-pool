import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const id = params.id;
    const userId = userPayload.id;

    const updatedRide = await prisma.$transaction(async (tx) => {
      const ride = await tx.rideRequest.findUnique({
        where: { id },
        include: { pool: true },
      });

      if (!ride) {
        throw new Error('RIDE_NOT_FOUND');
      }

      if (ride.passengerId !== userId && userPayload.role !== 'ADMIN') {
        throw new Error('FORBIDDEN_NOT_OWNER');
      }

      if (!['REQUESTED', 'MATCHED'].includes(ride.status)) {
        throw new Error('CANNOT_CANCEL_IN_CURRENT_STATUS');
      }

      const cancelled = await tx.rideRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (ride.poolId && ride.pool) {
        const restoredAvailable = ride.pool.availableSeats + ride.seatsRequested;
        const restoredOccupied = Math.max(0, ride.pool.occupiedSeats - ride.seatsRequested);

        await tx.pool.update({
          where: { id: ride.poolId },
          data: {
            availableSeats: restoredAvailable,
            occupiedSeats: restoredOccupied,
            status: restoredAvailable > 0 ? 'OPEN' : 'FULL',
          },
        });
      }

      await tx.rideAuditLog.create({
        data: {
          rideRequestId: id,
          fromStatus: ride.status,
          toStatus: 'CANCELLED',
          changedByUserId: userId,
          note: 'Cancelled by passenger before trip start.',
        },
      });

      return cancelled;
    });

    return NextResponse.json({
      message: 'Ride cancelled successfully.',
      ride: updatedRide,
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      return NextResponse.json({ error: 'Ride request not found.' }, { status: 404 });
    }
    if (error.message === 'FORBIDDEN_NOT_OWNER') {
      return NextResponse.json({ error: 'You cannot cancel someone else’s ride request.' }, { status: 403 });
    }
    if (error.message === 'CANNOT_CANCEL_IN_CURRENT_STATUS') {
      return NextResponse.json({ error: 'Cannot cancel ride once trip starts.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to cancel ride.' }, { status: 500 });
  }
}
