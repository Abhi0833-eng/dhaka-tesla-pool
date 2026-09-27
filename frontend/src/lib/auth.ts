import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dhaka-tesla-pool-super-secret-key-2026';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function verifyAuthToken(req: Request): AuthenticatedUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
  } catch (err) {
    return null;
  }
}
