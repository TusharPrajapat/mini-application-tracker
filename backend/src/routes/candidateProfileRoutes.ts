import { Router } from "express";
import { candidateProfileController } from "../controllers/candidateProfileController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// POST /api/profile - Create Candidate Profile (Candidate only)
router.post(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  candidateProfileController.createProfile.bind(candidateProfileController)
);

// GET /api/profile - Get Candidate Profile (Candidate only)
router.get(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  candidateProfileController.getProfile.bind(candidateProfileController)
);

// PUT /api/profile - Update Candidate Profile (Candidate only)
router.put(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  candidateProfileController.updateProfile.bind(candidateProfileController)
);

// DELETE /api/profile - Delete Candidate Profile (Candidate only)
router.delete(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  candidateProfileController.deleteProfile.bind(candidateProfileController)
);

export default router;
