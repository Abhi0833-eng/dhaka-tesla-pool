import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  const secret = process.env.JWT_SECRET || 'dhaka-tesla-pool-super-secret-key-2026';

  try {
    const decoded = jwt.verify(token, secret) as AuthenticatedUser;
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
    return;
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden: Insufficient privileges.' });
      return;
    }
    next();
  };
}
