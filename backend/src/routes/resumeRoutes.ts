import { Router, Request, Response, NextFunction } from "express";
import multer from "multer";
import { resumeController } from "../controllers/resumeController";
import { authenticateToken } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import { UserRole } from "../types/commonEnum";

const router = Router();

// Configure Multer for in-memory buffer storage with 5 MB size limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
  },
});

// Middleware helper handling Multer limit errors cleanly
const uploadSingleResume = (req: Request, res: Response, next: NextFunction) => {
  upload.single("resume")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res
          .status(400)
          .json({ success: false, error: "File size exceeds maximum allowed limit of 5 MB" });
      }
      return res.status(400).json({ success: false, error: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
    next();
  });
};

// POST /api/profile/resume - Upload/Replace Candidate Resume (Candidate only)
router.post(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  uploadSingleResume,
  resumeController.uploadResume.bind(resumeController)
);

// GET /api/profile/resume - Get 60-second Signed Resume URL (Candidate only)
router.get(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  resumeController.getResume.bind(resumeController)
);

// DELETE /api/profile/resume - Delete Candidate Resume (Candidate only)
router.delete(
  "/",
  authenticateToken,
  requireRole(UserRole.CANDIDATE),
  resumeController.deleteResume.bind(resumeController)
);

export default router;
