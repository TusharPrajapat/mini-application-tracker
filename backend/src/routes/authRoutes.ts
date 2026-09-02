import { Router } from "express";
import { authController } from "../controllers/authController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// POST /api/auth/signup - Register new user & profile
router.post("/signup", (req, res, next) =>
  authController.signup(req, res, next),
);

// POST /api/auth/login - Authenticate user & get Supabase access token
router.post("/login", (req, res, next) => authController.login(req, res, next));

// GET /api/auth/me - Protected route returning authenticated user's internal ID and role
router.get("/me", authenticateToken, (req, res, next) =>
  authController.getMe(req, res, next),
);

export default router;
