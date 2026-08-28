import { Router } from "express";
import { authController } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// POST /api/auth/signup - Register new user & profile
router.post("/signup", (req, res, next) =>
  authController.signup(req, res, next)
);

// POST /api/auth/login - Authenticate user & get Supabase access token
router.post("/login", (req, res, next) =>
  authController.login(req, res, next)
);

// GET /api/auth/me - Protected route returning authenticated user's internal ID and role
router.get("/me", authenticateToken, (req, res, next) =>
  authController.getMe(req, res, next)
);

// --- Role-Based Authorization Test Routes ---

// GET /api/auth/recruiter-only - Protected route for RECRUITER role only
router.get(
  "/recruiter-only",
  authenticateToken,
  requireRole(UserRole.RECRUITER),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted: You are an authorized Recruiter",
      user: req.user,
    });
  }
);

// GET /api/auth/candidate-only - Protected route for CANDIDATE role only
router.get(
  "/candidate-only",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted: You are an authorized Candidate",
      user: req.user,
    });
  }
);

// GET /api/auth/protected-shared - Protected route for RECRUITER or CANDIDATE
router.get(
  "/protected-shared",
  authenticateToken,
  requireRole(UserRole.RECRUITER, UserRole.CANDIDATE),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Access granted: You are an authorized user",
      user: req.user,
    });
  }
);

export default router;
