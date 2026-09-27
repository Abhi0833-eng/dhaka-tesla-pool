import express from 'express';
import cors from 'cors';
import { login, register, getMe } from './controllers/authController.js';
import { estimateFare, requestRide, getMyRides, cancelRide } from './controllers/rideController.js';
import { toggleDriverOnlineStatus, getDriverPool, updateRideStatus } from './controllers/driverController.js';
import { authMiddleware, requireRole } from './middlewares/authMiddleware.js';
import { DHAKA_ZONES } from './constants/zones.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health & Metadata Endpoints
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Dhaka Tesla Pool API',
    timestamp: new Date().toISOString(),
    zones: Object.keys(DHAKA_ZONES),
  });
});

app.get('/api/zones', (req, res) => {
  res.json({ zones: DHAKA_ZONES });
});

// Auth Routes
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.get('/api/auth/me', authMiddleware, getMe);

// Passenger Ride Routes
app.post('/api/rides/estimate', estimateFare);
app.post('/api/rides/request', authMiddleware, requireRole(['PASSENGER', 'ADMIN']), requestRide);
app.get('/api/rides/my-rides', authMiddleware, getMyRides);
app.post('/api/rides/:id/cancel', authMiddleware, cancelRide);

// Driver Routes
app.post('/api/driver/status', authMiddleware, requireRole(['DRIVER', 'ADMIN']), toggleDriverOnlineStatus);
app.get('/api/driver/pool', authMiddleware, requireRole(['DRIVER', 'ADMIN']), getDriverPool);
app.post('/api/driver/ride/:id/status', authMiddleware, requireRole(['DRIVER', 'ADMIN']), updateRideStatus);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Central Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

export default app;
