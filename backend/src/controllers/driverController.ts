import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

const prisma = new PrismaClient();

// Allowed lifecycle transitions
const VALID_TRANSITIONS: Record<string, string> = {
  REQUESTED: 'MATCHED',
  MATCHED: 'DRIVER_ARRIVED',
  DRIVER_ARRIVED: 'STARTED',
  STARTED: 'COMPLETED',
};

export async function toggleDriverOnlineStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { isOnline, currentZone } = req.body;

    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: req.user.id },
    });

    if (!vehicle) {
      res.status(404).json({ error: 'No Tesla vehicle registered for this driver.' });
      return;
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id: vehicle.id },
      data: {
        isOnline: isOnline !== undefined ? Boolean(isOnline) : vehicle.isOnline,
        currentZone: currentZone || vehicle.currentZone,
      },
    });

    res.json({
      message: `Driver status updated to ${updatedVehicle.isOnline ? 'ONLINE' : 'OFFLINE'}.`,
      vehicle: updatedVehicle,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update driver online status.' });
  }
}

export async function getDriverPool(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { driverId: req.user.id },
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
      res.status(404).json({ error: 'No Tesla vehicle found for driver.' });
      return;
    }

    const currentPool = vehicle.pools[0] || null;

    res.json({
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
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch driver pool details.' });
  }
}

export async function updateRideStatus(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const { id } = req.params;
    const { targetStatus, note } = req.body;

    if (!targetStatus) {
      res.status(400).json({ error: 'targetStatus is required.' });
      return;
    }

    const driverId = req.user.id;

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

      // Check if logged-in driver owns the vehicle in the ride's pool
      if (ride.pool?.vehicle?.driverId !== driverId && req.user?.role !== 'ADMIN') {
        throw new Error('FORBIDDEN_NOT_ASSIGNED_DRIVER');
      }

      // Validate lifecycle state transition
      const expectedNext = VALID_TRANSITIONS[ride.status];
      if (expectedNext !== targetStatus) {
        throw new Error(
          `INVALID_STATE_TRANSITION: Cannot transition ride from '${ride.status}' to '${targetStatus}'. Next valid status is '${expectedNext || 'NONE'}'.`
        );
      }

      // If completing ride, handle fare settlement and wallet balance transfer
      if (targetStatus === 'COMPLETED') {
        const farePoysha = ride.finalFarePoysha;

        // Deduct from passenger wallet
        await tx.user.update({
          where: { id: ride.passengerId },
          data: {
            walletBalancePoysha: {
              decrement: farePoysha,
            },
          },
        });

        // Credit to driver wallet
        await tx.user.update({
          where: { id: driverId },
          data: {
            walletBalancePoysha: {
              increment: farePoysha,
            },
          },
        });
      }

      // Update ride status
      const updatedRide = await tx.rideRequest.update({
        where: { id },
        data: { status: targetStatus },
      });

      // Audit Log
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

    res.json({
      message: `Ride status updated successfully to '${targetStatus}'.`,
      ride: result,
    });
  } catch (error: any) {
    if (error.message === 'RIDE_NOT_FOUND') {
      res.status(404).json({ error: 'Ride request not found.' });
      return;
    }
    if (error.message === 'FORBIDDEN_NOT_ASSIGNED_DRIVER') {
      res.status(403).json({ error: 'You are not the driver assigned to this ride.' });
      return;
    }
    if (error.message.startsWith('INVALID_STATE_TRANSITION')) {
      res.status(400).json({ error: error.message });
      return;
    }

    console.error('Update ride status error:', error);
    res.status(500).json({ error: 'Failed to update ride status.' });
  }
}
