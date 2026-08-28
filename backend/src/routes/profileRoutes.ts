import { Router } from "express";
import { profileController } from "../controllers/profileController";

const router = Router();

// POST /api/profiles - Create profile
router.post("/", (req, res, next) =>
  profileController.createProfile(req, res, next)
);

// GET /api/profiles/:id - Get profile by primary key ID
router.get("/:id", (req, res, next) =>
  profileController.getProfileById(req, res, next)
);

// PUT /api/profiles/:id - Update profile by primary key ID
router.put("/:id", (req, res, next) =>
  profileController.updateProfileById(req, res, next)
);

// DELETE /api/profiles/:id - Delete profile by primary key ID
router.delete("/:id", (req, res, next) =>
  profileController.deleteProfileById(req, res, next)
);

export default router;
