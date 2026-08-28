import { Router } from "express";
import { applicationController } from "../controllers/applicationController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// POST /api/applications - Submit job application (CANDIDATE only)
router.post(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  (req, res, next) => applicationController.createApplication(req, res, next)
);

// GET /api/applications - List applications (RECRUITER: owned jobs; CANDIDATE: own applications)
router.get(
  "/",
  authenticateToken,
  requireRole(UserRole.RECRUITER, UserRole.CANDIDATE),
  (req, res, next) => applicationController.getApplications(req, res, next)
);

// GET /api/applications/:id - Get application by ID (RECRUITER: owned job; CANDIDATE: own application)
router.get(
  "/:id",
  authenticateToken,
  requireRole(UserRole.RECRUITER, UserRole.CANDIDATE),
  (req, res, next) => applicationController.getApplicationById(req, res, next)
);

// PUT /api/applications/:id/stage - Update application stage with version check (RECRUITER only)
router.put(
  "/:id/stage",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) =>
    applicationController.updateApplicationStage(req, res, next)
);

// GET /api/applications/:id/candidate-profile - Get applicant's candidate profile (RECRUITER only)
router.get(
  "/:id/candidate-profile",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) =>
    applicationController.getCandidateProfileForApplication(req, res, next)
);

// GET /api/applications/:id/candidate-resume - Get applicant's 60-second signed resume URL (RECRUITER only)
router.get(
  "/:id/candidate-resume",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res, next) =>
    applicationController.getCandidateResumeForApplication(req, res, next)
);

export default router;
