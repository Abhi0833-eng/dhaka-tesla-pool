import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuthToken } from '@/lib/auth';
import { calculateFare } from '@/lib/fare';

export async function POST(req: Request) {
  try {
    const userPayload = verifyAuthToken(req);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const passengerId = userPayload.id;
    const { pickupZone, destinationZone, seatsRequested = 1, isPooled = true } = await req.json();

    if (!pickupZone || !destinationZone) {
      return NextResponse.json(
        { error: 'pickupZone and destinationZone are required.' },
        { status: 400 }
      );
    }

    const fareInfo = calculateFare(pickupZone, destinationZone, isPooled);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Check existing active ride
      const activeRide = await tx.rideRequest.findFirst({
        where: {
          passengerId,
          status: { in: ['REQUESTED', 'MATCHED', 'DRIVER_ARRIVED', 'STARTED'] },
        },
      });

      if (activeRide) {
        throw new Error('YOU_ALREADY_HAVE_AN_ACTIVE_RIDE');
      }

      // 2. Check passenger wallet balance
      const passenger = await tx.user.findUnique({ where: { id: passengerId } });
      if (!passenger || passenger.walletBalancePoysha < fareInfo.finalFarePoysha) {
        throw new Error('INSUFFICIENT_WALLET_BALANCE');
      }

      // 3. Find open matching pool
      let matchingPool = await tx.pool.findFirst({
        where: {
          pickupZone,
          status: 'OPEN',
          availableSeats: { gte: seatsRequested },
        },
        include: { vehicle: { include: { driver: true } } },
      });

      let poolId: string;
      let matchedVehicle;

      if (matchingPool) {
        const updatedAvailable = matchingPool.availableSeats - seatsRequested;
        const updatedOccupied = matchingPool.occupiedSeats + seatsRequested;
        const newStatus = updatedAvailable === 0 ? 'FULL' : 'OPEN';

        const updatedPool = await tx.pool.update({
          where: { id: matchingPool.id },
          data: {
            availableSeats: updatedAvailable,
            occupiedSeats: updatedOccupied,
            status: newStatus,
          },
        });

        poolId = updatedPool.id;
        matchedVehicle = matchingPool.vehicle;
      } else {
        const availableVehicle = await tx.vehicle.findFirst({
          where: {
            isOnline: true,
            pools: {
              none: {
                status: { in: ['OPEN', 'FULL', 'IN_PROGRESS'] },
              },
            },
          },
          include: { driver: true },
        });

        if (!availableVehicle) {
          throw new Error('NO_AVAILABLE_TESLA_DRIVERS');
        }

        const newPool = await tx.pool.create({
          data: {
            vehicleId: availableVehicle.id,
            status: availableVehicle.capacity - seatsRequested === 0 ? 'FULL' : 'OPEN',
            totalSeats: availableVehicle.capacity,
            occupiedSeats: seatsRequested,
            availableSeats: availableVehicle.capacity - seatsRequested,
            pickupZone,
            destinationZone,
          },
        });

        poolId = newPool.id;
        matchedVehicle = availableVehicle;
      }

      // 4. Create RideRequest
      const rideRequest = await tx.rideRequest.create({
        data: {
          passengerId,
          poolId,
          pickupZone,
          destinationZone,
          seatsRequested,
          status: 'MATCHED',
          fareBasePoysha: fareInfo.baseFarePoysha,
          fareDistancePoysha: fareInfo.distanceFarePoysha,
          fareDiscountPoysha: fareInfo.poolDiscountPoysha,
          finalFarePoysha: fareInfo.finalFarePoysha,
          distanceKm: fareInfo.distanceKm,
          isPooled,
        },
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
        },
      });

      // 5. Create Audit Log
      await tx.rideAuditLog.create({
        data: {
          rideRequestId: rideRequest.id,
          fromStatus: 'REQUESTED',
          toStatus: 'MATCHED',
          changedByUserId: passengerId,
          note: `Matched with Tesla vehicle ${matchedVehicle.model} (${matchedVehicle.licensePlate})`,
        },
      });

      return rideRequest;
    });

    return NextResponse.json({
      message: 'Ride request created successfully and matched with Tesla pool!',
      ride: {
        id: result.id,
        status: result.status,
        pickupZone: result.pickupZone,
        destinationZone: result.destinationZone,
        seatsRequested: result.seatsRequested,
        distanceKm: result.distanceKm,
        finalFareBDT: result.finalFarePoysha / 100,
        fareBreakdown: {
          baseFareBDT: result.fareBasePoysha / 100,
          distanceFareBDT: result.fareDistancePoysha / 100,
          poolDiscountBDT: result.fareDiscountPoysha / 100,
        },
        pool: result.pool,
      },
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === 'YOU_ALREADY_HAVE_AN_ACTIVE_RIDE') {
      return NextResponse.json({ error: 'You already have an active ride request in progress.' }, { status: 400 });
    }
    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      return NextResponse.json({ error: 'Insufficient wallet balance for this ride.' }, { status: 400 });
    }
    if (error.message === 'NO_AVAILABLE_TESLA_DRIVERS') {
      return NextResponse.json({ error: 'No online Tesla drivers currently available in this zone.' }, { status: 503 });
    }

    return NextResponse.json({ error: 'Failed to create ride request.' }, { status: 500 });
  }
}
