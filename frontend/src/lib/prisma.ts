import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

// Vercel Serverless Environment Handler for SQLite
if (process.env.VERCEL) {
  const tmpDbPath = '/tmp/dev.db';
  try {
    if (!fs.existsSync(tmpDbPath)) {
      const srcDbPath = path.join(process.cwd(), 'prisma', 'dev.db');
      if (fs.existsSync(srcDbPath)) {
        fs.copyFileSync(srcDbPath, tmpDbPath);
      }
    }
  } catch (err) {
    console.error('Vercel /tmp database initialization error:', err);
  }
  process.env.DATABASE_URL = 'file:/tmp/dev.db';
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasourceUrl: process.env.VERCEL ? 'file:/tmp/dev.db' : process.env.DATABASE_URL || 'file:./dev.db',
    log: ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
