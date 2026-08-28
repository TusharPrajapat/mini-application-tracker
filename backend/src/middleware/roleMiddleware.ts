import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types/commonEnum";

/**
 * Authorization Middleware: requireRole
 *
 * Enforces role-based authorization for protected routes.
 * Must be executed AFTER authenticateToken middleware.
 *
 * @param allowedRoles List of UserRole enum values authorized to access the route
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // 1. Verify that user identity has been populated by authenticateToken
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Unauthenticated: Authentication required",
      });
      return;
    }

    // 2. Check if the authenticated profile's role matches any of the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Forbidden: You do not have permission to access this resource",
      });
      return;
    }

    // 3. Role is authorized, proceed to the next middleware or controller handler
    next();
  };
}
