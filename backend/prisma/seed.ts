import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Dhaka Tesla Pool database with Banani story cast...');

  // Clean existing data
  await prisma.rideAuditLog.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  const defaultPasswordHash = await bcrypt.hash('password123', 10);

  // 1. Create Driver: Jashim
  const jashim = await prisma.user.create({
    data: {
      name: 'Jashim (Driver)',
      email: 'jashim@dhaka.com',
      passwordHash: defaultPasswordHash,
      role: 'DRIVER',
      walletBalancePoysha: 150000, // 1,500 BDT
    },
  });

  // 2. Create Jashim's vehicle: Bullet (3-seat capacity)
  const bullet = await prisma.vehicle.create({
    data: {
      driverId: jashim.id,
      model: 'Bullet (3-seat Battery Tesla)',
      licensePlate: 'DHAKA-METRO-T-11',
      capacity: 3,
      isOnline: true,
      currentZone: 'Banani',
    },
  });

  // 3. Create Passengers: Nusrat, Rafiq, Shirin
  const nusrat = await prisma.user.create({
    data: {
      name: 'Nusrat',
      email: 'nusrat@dhaka.com',
      passwordHash: defaultPasswordHash,
      role: 'PASSENGER',
      walletBalancePoysha: 100000, // 1,000 BDT
    },
  });

  const rafiq = await prisma.user.create({
    data: {
      name: 'Rafiq',
      email: 'rafiq@dhaka.com',
      passwordHash: defaultPasswordHash,
      role: 'PASSENGER',
      walletBalancePoysha: 80000, // 800 BDT
    },
  });

  const shirin = await prisma.user.create({
    data: {
      name: 'Shirin',
      email: 'shirin@dhaka.com',
      passwordHash: defaultPasswordHash,
      role: 'PASSENGER',
      walletBalancePoysha: 60000, // 600 BDT
    },
  });

  console.log('✅ Created Story Cast:');
  console.log(` - Driver: Jashim (${jashim.email}) with vehicle '${bullet.model}' (${bullet.capacity} seats)`);
  console.log(` - Passenger 1: Nusrat (${nusrat.email})`);
  console.log(` - Passenger 2: Rafiq (${rafiq.email})`);
  console.log(` - Passenger 3: Shirin (${shirin.email})`);

  // 4. Create initial active pool for Jashim's Bullet in Banani
  const pool = await prisma.pool.create({
    data: {
      vehicleId: bullet.id,
      status: 'OPEN',
      totalSeats: 3,
      occupiedSeats: 0,
      availableSeats: 3,
      pickupZone: 'Banani',
      destinationZone: 'Mohakhali / Gulshan 1',
    },
  });

  console.log(`✅ Created Active Pool for Bullet (ID: ${pool.id}) with 3 available seats in Banani.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
