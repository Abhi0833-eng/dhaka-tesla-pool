import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'dhaka-tesla-pool-super-secret-key-2026';

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      include: { vehicle: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalanceBDT: user.walletBalancePoysha / 100,
        vehicle: user.vehicle,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during login.' });
  }
}

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { name, email, password, role = 'PASSENGER' } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' });
      return;
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      res.status(409).json({ error: 'User with this email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
        walletBalancePoysha: 50000, // 500.00 BDT initial signup bonus
      },
    });

    // If driver, automatically create a default 3-seat Tesla "Bullet"
    if (role === 'DRIVER') {
      await prisma.vehicle.create({
        data: {
          driverId: user.id,
          model: 'Bullet (3-seat Battery Tesla)',
          licensePlate: `DHAKA-METRO-T-${Math.floor(10 + Math.random() * 90)}`,
          capacity: 3,
          isOnline: true,
          currentZone: 'Banani',
        },
      });
    }

    const token = jwt.sign(
      { id: user.id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalanceBDT: user.walletBalancePoysha / 100,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error during registration.' });
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        vehicle: true,
        rideRequests: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        walletBalanceBDT: user.walletBalancePoysha / 100,
        walletBalancePoysha: user.walletBalancePoysha,
        vehicle: user.vehicle,
        recentRides: user.rideRequests,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch user profile.' });
  }
}
