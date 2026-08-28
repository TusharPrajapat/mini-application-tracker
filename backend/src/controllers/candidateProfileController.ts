import { Request, Response, NextFunction } from "express";
import { candidateProfileService } from "../services/candidateProfileService";

export class CandidateProfileController {
  /**
   * POST /api/profile
   */
  async createProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const profile = await candidateProfileService.createProfile(
        req.user.userId,
        req.body || {}
      );

      res.status(201).json({
        success: true,
        message: "Candidate profile created successfully",
        data: {
          profile,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Conflict")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("required") ||
        err.message.includes("Invalid") ||
        err.message.includes("prohibited") ||
        err.message.includes("cannot exceed") ||
        err.message.includes("must be")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * GET /api/profile
   */
  async getProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const profile = await candidateProfileService.getProfile(
        req.user.userId
      );

      res.status(200).json({
        success: true,
        data: {
          profile,
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
   * PUT /api/profile
   */
  async updateProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const updatedProfile = await candidateProfileService.updateProfile(
        req.user.userId,
        req.body || {}
      );

      res.status(200).json({
        success: true,
        message: "Candidate profile updated successfully",
        data: {
          profile: updatedProfile,
        },
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("required") ||
        err.message.includes("Invalid") ||
        err.message.includes("prohibited") ||
        err.message.includes("cannot exceed") ||
        err.message.includes("must be") ||
        err.message.includes("At least one")
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
   * DELETE /api/profile
   */
  async deleteProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      await candidateProfileService.deleteProfile(req.user.userId);

      res.status(200).json({
        success: true,
        message: "Candidate profile deleted successfully",
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

export const candidateProfileController = new CandidateProfileController();
