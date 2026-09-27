import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { calculateFare } from '../services/fareService.js';

const prisma = new PrismaClient();

export async function estimateFare(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { pickupZone, destinationZone, isPooled = true } = req.body;

    if (!pickupZone || !destinationZone) {
      res.status(400).json({ error: 'pickupZone and destinationZone are required.' });
      return;
    }

    const fare = calculateFare(pickupZone, destinationZone, isPooled);
    res.json({ fare });
  } catch (error: any) {
    res.status(500).json({ error: 'Error calculating fare estimate.' });
  }
}

export async function requestRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const passengerId = req.user.id;
    const { pickupZone, destinationZone, seatsRequested = 1, isPooled = true } = req.body;

    if (!pickupZone || !destinationZone) {
      res.status(400).json({ error: 'pickupZone and destinationZone are required.' });
      return;
    }

    if (seatsRequested < 1 || seatsRequested > 3) {
      res.status(400).json({ error: 'Seats requested must be between 1 and 3.' });
      return;
    }

    const fareInfo = calculateFare(pickupZone, destinationZone, isPooled);

    // Atomic transaction for pool matching and capacity enforcement
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

      // 3. Find open matching pool with enough available seats
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
        // Match existing pool
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
        // Find available online vehicle to create a new pool (must not have an active pool in progress)
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

    res.status(201).json({
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
    });
  } catch (error: any) {
    if (error.message === 'YOU_ALREADY_HAVE_AN_ACTIVE_RIDE') {
      res.status(400).json({ error: 'You already have an active ride request in progress.' });
      return;
    }
    if (error.message === 'INSUFFICIENT_WALLET_BALANCE') {
      res.status(400).json({ error: 'Insufficient wallet balance for this ride.' });
      return;
    }
    if (error.message === 'NO_AVAILABLE_TESLA_DRIVERS') {
      res.status(503).json({ error: 'No online Tesla drivers currently available in this zone.' });
      return;
    }

    console.error('Ride request error:', error);
    res.status(500).json({ error: 'Failed to create ride request.' });
  }
}

export async function getMyRides(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const rides = await prisma.rideRequest.findMany({
      where: { passengerId: req.user.id },
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

    res.json({ rides: formattedRides });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to retrieve passenger rides.' });
  }
}

export async function cancelRide(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { id } = req.params;
    const userId = req.user.id;

    const updatedRide = await prisma.$transaction(async (tx) => {
      const ride = await tx.rideRequest.findUnique({
        where: { id },
        include: { pool: true },
      });

      if (!ride) {
        throw new Error('RIDE_NOT_FOUND');
      }

      // Check authorization (passenger who owns ride or admin)
      if (ride.passengerId !== userId && req.user?.role !== 'ADMIN') {
        throw new Error('FORBIDDEN_NOT_OWNER');
      }

      // Check cancellation eligibility
      if (!['REQUESTED', 'MATCHED'].includes(ride.status)) {
        throw new Error('CANNOT_CANCEL_IN_CURRENT_STATUS');
      }

      // Update ride status to CANCELLED
      const cancelled = await tx.rideRequest.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Restore seats in Pool if attached
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

      // Audit Log
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

    res.json({
      message: 'Ride cancelled successfully.',
      ride: updatedRide,
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      res.status(404).json({ error: 'Ride request not found.' });
      return;
    }
    if (error.message === 'FORBIDDEN_NOT_OWNER') {
      res.status(403).json({ error: 'You cannot cancel someone else’s ride request.' });
      return;
    }
    if (error.message === 'CANNOT_CANCEL_IN_CURRENT_STATUS') {
      res.status(400).json({
        error: 'Cannot cancel ride once driver has arrived or trip is in progress.',
      });
      return;
    }

    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Failed to cancel ride.' });
  }
}
