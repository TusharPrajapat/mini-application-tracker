import { Request, Response, NextFunction } from "express";
import { resumeService } from "../services/resumeService";

export class ResumeController {
  /**
   * POST /api/profile/resume
   */
  async uploadResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const result = await resumeService.uploadResume(
        req.user.userId,
        req.file
      );

      res.status(200).json({
        success: true,
        message: "Resume uploaded successfully",
        data: {
          resumePath: result.resumePath,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Candidate profile not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("No file") ||
        err.message.includes("format") ||
        err.message.includes("exceeds") ||
        err.message.includes("Invalid")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * GET /api/profile/resume
   */
  async getResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const result = await resumeService.getResume(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          resumePath: result.resumePath,
          signedUrl: result.signedUrl,
          expiresIn: result.expiresIn,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * DELETE /api/profile/resume
   */
  async deleteResume(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      await resumeService.deleteResume(req.user.userId);

      res.status(200).json({
        success: true,
        message: "Resume deleted successfully",
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }
}

export const resumeController = new ResumeController();
