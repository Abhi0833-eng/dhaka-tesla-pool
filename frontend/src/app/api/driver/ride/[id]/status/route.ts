import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';

const VALID_TRANSITIONS: Record<string, string> = {
  REQUESTED: 'MATCHED',
  MATCHED: 'DRIVER_ARRIVED',
  DRIVER_ARRIVED: 'STARTED',
  STARTED: 'COMPLETED',
};

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { id } = params;
    const { targetStatus, note } = await req.json();

    if (!targetStatus) {
      return NextResponse.json({ error: 'targetStatus is required.' }, { status: 400 });
    }

    const driverId = userPayload.id;

    const result = await prisma.$transaction(async (tx) => {
      const ride = await tx.rideRequest.findUnique({
        where: { id },
        include: {
          passenger: true,
          pool: {
            include: { vehicle: true },
          },
        },
      });

      if (!ride) {
        throw new Error('RIDE_NOT_FOUND');
      }

      if (ride.pool?.vehicle?.driverId !== driverId && userPayload.role !== 'ADMIN') {
        throw new Error('FORBIDDEN_NOT_ASSIGNED_DRIVER');
      }

      const expectedNext = VALID_TRANSITIONS[ride.status];
      if (expectedNext !== targetStatus) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot transition ride from '${ride.status}' to '${targetStatus}'.`
        );
      }

      if (targetStatus === 'COMPLETED') {
        const farePoysha = ride.finalFarePoysha;

        await tx.user.update({
          where: { id: ride.passengerId },
          data: {
            walletBalancePoysha: {
              decrement: farePoysha,
            },
          },
        });

        await tx.user.update({
          where: { id: driverId },
          data: {
            walletBalancePoysha: {
              increment: farePoysha,
            },
          },
        });
      }

      const updatedRide = await tx.rideRequest.update({
        where: { id },
        data: { status: targetStatus },
      });

      await tx.rideAuditLog.create({
        data: {
          rideRequestId: id,
          fromStatus: ride.status,
          toStatus: targetStatus,
          changedByUserId: driverId,
          note: note || `Driver advanced ride status to ${targetStatus}`,
        },
      });

      return updatedRide;
    });

    return NextResponse.json({
      message: `Ride status updated successfully to '${targetStatus}'.`,
      ride: result,
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      return NextResponse.json({ error: 'Ride request not found.' }, { status: 404 });
    }
    if (error.message === 'FORBIDDEN_NOT_ASSIGNED_DRIVER') {
      return NextResponse.json({ error: 'You are not the driver assigned to this ride.' }, { status: 403 });
    }
    if (error.message?.startsWith('INVALID_STATE_TRANSITION')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: 'Failed to update ride status.' }, { status: 500 });
  }
}
