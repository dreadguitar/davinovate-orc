import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

/**
 * Middleware that ensures every request has a userId attached 
 * to be used in database queries for automatic data isolation.
 */
export const isolationMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user || !req.user.id) {
    return res.status(403).json({ message: 'User context is missing for isolation' });
  }

  // The userId is already in req.user.id from authMiddleware
  // This middleware is mainly a safety check and can be extended
  // to add organizational isolation or other multi-tenancy logic.
  next();
};
