import { Router } from "express";
import { jobController } from "../controllers/jobController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// POST /api/jobs - Create a new job posting (RECRUITER only)
router.post(
  "/",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) => jobController.createJob(req, res, next)
);

// GET /api/jobs - List jobs (RECRUITER sees their posted jobs; CANDIDATE sees OPEN jobs)
router.get(
  "/",
  authenticateToken,
  requireRole(UserRole.RECRUITER, UserRole.CANDIDATE),
  (req, res, next) => jobController.getJobs(req, res, next)
);

// GET /api/jobs/:id - Get job by ID (RECRUITER sees owned job; CANDIDATE sees OPEN job)
router.get(
  "/:id",
  authenticateToken,
  requireRole(UserRole.RECRUITER, UserRole.CANDIDATE),
  (req, res, next) => jobController.getJobById(req, res, next)
);

// PUT /api/jobs/:id - Update job by ID (RECRUITER only, owned job)
router.put(
  "/:id",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) => jobController.updateJob(req, res, next)
);

// DELETE /api/jobs/:id - Delete job by ID (RECRUITER only, owned job)
router.delete(
  "/:id",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) => jobController.deleteJob(req, res, next)
);

export default router;
