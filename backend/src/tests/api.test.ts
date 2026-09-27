import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../app.js';
import { calculateFare } from '../services/fareService.js';

const prisma = new PrismaClient();

let nusratToken: string;
let rafiqToken: string;
let shirinToken: string;
let jashimToken: string;
let nusratId: string;
let rafiqId: string;
let shirinId: string;
let jashimId: string;

describe('⚡ Dhaka Tesla Pool API & System Tests', () => {
  beforeAll(async () => {
    // 1. Log in Story Cast members to retrieve authentic JWTs
    const nusratRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nusrat@dhaka.com', password: 'password123' });
    nusratToken = nusratRes.body.token;
    nusratId = nusratRes.body.user.id;

    const rafiqRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'rafiq@dhaka.com', password: 'password123' });
    rafiqToken = rafiqRes.body.token;
    rafiqId = rafiqRes.body.user.id;

    const shirinRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'shirin@dhaka.com', password: 'password123' });
    shirinToken = shirinRes.body.token;
    shirinId = shirinRes.body.user.id;

    const jashimRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'jashim@dhaka.com', password: 'password123' });
    jashimToken = jashimRes.body.token;
    jashimId = jashimRes.body.user.id;
  });

  beforeEach(async () => {
    // Clean active rides & pools before each test
    await prisma.rideAuditLog.deleteMany();
    await prisma.rideRequest.deleteMany();
    await prisma.pool.deleteMany();

    // Re-create initial open pool for Jashim's Bullet
    const vehicle = await prisma.vehicle.findFirst({ where: { driverId: jashimId } });
    if (vehicle) {
      await prisma.pool.create({
        data: {
          vehicleId: vehicle.id,
          status: 'OPEN',
          totalSeats: 3,
          occupiedSeats: 0,
          availableSeats: 3,
          pickupZone: 'Banani',
          destinationZone: 'Mohakhali / Gulshan 1',
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('1. Fare Calculation Engine', () => {
    test('Calculates Nusrat & Rafiq pooled fares correctly using baseFare + distanceCharge - poolDiscount', () => {
      // Nusrat: Banani to Mohakhali (3.5 km approx)
      const nusratFare = calculateFare('Banani', 'Mohakhali', true);
      expect(nusratFare.baseFarePoysha).toBe(5000); // 50 BDT
      expect(nusratFare.poolDiscountPoysha).toBe(2000); // 20 BDT discount
      expect(nusratFare.finalFarePoysha).toBe(
        nusratFare.baseFarePoysha + nusratFare.distanceFarePoysha - nusratFare.poolDiscountPoysha
      );
      expect(nusratFare.fareBDT).toBe(nusratFare.finalFarePoysha / 100);

      // Rafiq: Banani to Gulshan 1 (2.8 km approx)
      const rafiqFare = calculateFare('Banani', 'Gulshan 1', true);
      expect(rafiqFare.baseFarePoysha).toBe(5000); // 50 BDT
      expect(rafiqFare.poolDiscountPoysha).toBe(2000); // 20 BDT discount
      expect(rafiqFare.finalFarePoysha).toBe(
        rafiqFare.baseFarePoysha + rafiqFare.distanceFarePoysha - rafiqFare.poolDiscountPoysha
      );
    });
  });

  describe('2. Pooling & Bullet Seat Capacity Enforcement', () => {
    test('Nusrat and Rafiq book seats in Bullet, reducing available seats from 3 to 1', async () => {
      // Nusrat books 1 seat
      const res1 = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      expect(res1.status).toBe(201);
      expect(res1.body.ride.status).toBe('MATCHED');
      expect(res1.body.ride.pool.availableSeats).toBe(2);

      // Rafiq books 1 seat 2 minutes later
      const res2 = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Gulshan 1', seatsRequested: 1 });
      expect(res2.status).toBe(201);
      expect(res2.body.ride.status).toBe('MATCHED');
      expect(res2.body.ride.pool.availableSeats).toBe(1);
      expect(res2.body.ride.pool.occupiedSeats).toBe(2);
    });

    test('Shirin claims 3rd seat, transitioning Pool status to FULL', async () => {
      // Nusrat & Rafiq book first 2 seats
      await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Gulshan 1', seatsRequested: 1 });

      // Shirin books 3rd seat
      const res3 = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${shirinToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });

      expect(res3.status).toBe(201);
      expect(res3.body.ride.pool.availableSeats).toBe(0);
      expect(res3.body.ride.pool.occupiedSeats).toBe(3);
      expect(res3.body.ride.pool.status).toBe('FULL');
    });

    test('Attempting to book beyond Bullet capacity (3 seats) creates a new pool or fails gracefully', async () => {
      // 3 seats occupied
      await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${rafiqToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Gulshan 1', seatsRequested: 1 });
      await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${shirinToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });

      // Register 4th passenger: Tanvir
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Tanvir', email: `tanvir_${Date.now()}@dhaka.com`, password: 'password123' });
      const tanvirToken = registerRes.body.token;

      // Tanvir tries to book a seat when Bullet pool is FULL and no other driver is available
      const res4 = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${tanvirToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Farmgate', seatsRequested: 1 });

      // Should fail gracefully with 503 No online Tesla drivers message
      expect(res4.status).toBe(503);
      expect(res4.body.error).toContain('No online Tesla drivers');
    });
  });

  describe('3. Lifecycle & State Machine Enforcement', () => {
    test('Valid lifecycle: MATCHED -> DRIVER_ARRIVED -> STARTED -> COMPLETED', async () => {
      const rideRes = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      const rideId = rideRes.body.ride.id;

      // 1. DRIVER_ARRIVED
      const s1 = await request(app)
        .post(`/api/driver/ride/${rideId}/status`)
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ targetStatus: 'DRIVER_ARRIVED' });
      expect(s1.status).toBe(200);
      expect(s1.body.ride.status).toBe('DRIVER_ARRIVED');

      // 2. STARTED
      const s2 = await request(app)
        .post(`/api/driver/ride/${rideId}/status`)
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ targetStatus: 'STARTED' });
      expect(s2.status).toBe(200);
      expect(s2.body.ride.status).toBe('STARTED');

      // 3. COMPLETED
      const s3 = await request(app)
        .post(`/api/driver/ride/${rideId}/status`)
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ targetStatus: 'COMPLETED' });
      expect(s3.status).toBe(200);
      expect(s3.body.ride.status).toBe('COMPLETED');
    });

    test('Rejects invalid state jumps (e.g., MATCHED directly to COMPLETED)', async () => {
      const rideRes = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      const rideId = rideRes.body.ride.id;

      const invalidRes = await request(app)
        .post(`/api/driver/ride/${rideId}/status`)
        .set('Authorization', `Bearer ${jashimToken}`)
        .send({ targetStatus: 'COMPLETED' });

      expect(invalidRes.status).toBe(400);
      expect(invalidRes.body.error).toContain('INVALID_STATE_TRANSITION');
    });
  });

  describe('4. Security & Authorization Checks', () => {
    test('Rafiq CANNOT cancel Nusrat ride', async () => {
      const nusratRide = await request(app)
        .post('/api/rides/request')
        .set('Authorization', `Bearer ${nusratToken}`)
        .send({ pickupZone: 'Banani', destinationZone: 'Mohakhali', seatsRequested: 1 });
      const rideId = nusratRide.body.ride.id;

      // Rafiq attempts to cancel Nusrat's ride
      const cancelRes = await request(app)
        .post(`/api/rides/${rideId}/cancel`)
        .set('Authorization', `Bearer ${rafiqToken}`);

      expect(cancelRes.status).toBe(403);
      expect(cancelRes.body.error).toContain('someone else’s ride');
    });
  });
});
