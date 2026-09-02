import { Router } from "express";
import { dashboardController } from "../controllers/dashboardController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

/**
 * GET /api/dashboard/recruiter/stats
 * Protected route: Must be authenticated and have RECRUITER role (role = 1)
 */
router.get(
  "/recruiter/stats",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) => dashboardController.getRecruiterStats(req, res, next)
);

export default router;
