import { Request, Response, NextFunction } from "express";
import { applicationService } from "../services/applicationService";

export class ApplicationController {
  /**
   * HTTP Handler for POST /api/applications
   * Only CANDIDATE role permitted (enforced by requireRole middleware).
   */
  async createApplication(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const { job_id, resume_path } = req.body;

      const application = await applicationService.createApplication(
        req.user.userId,
        {
          job_id,
          resume_path,
        }
      );

      res.status(201).json({
        success: true,
        message: "Application submitted successfully",
        data: application,
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
        err.message.includes("Cannot apply")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

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
   * HTTP Handler for GET /api/applications
   * Returns recruiter's job applications (RECRUITER) or candidate's own applications (CANDIDATE).
   */
  async getApplications(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const applications = await applicationService.getApplications(req.user);

      res.status(200).json({
        success: true,
        data: applications,
      });
    } catch (error) {
      const err = error as Error;
      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/applications/:id
   */
  async getApplicationById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      const application = await applicationService.getApplicationById(
        id,
        req.user
      );

      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("positive integer")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for PUT /api/applications/:id/stage
   * Only RECRUITER role permitted. Updates stage with optimistic concurrency version check.
   */
  async updateApplicationStage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);
      const { stage, version } = req.body;

      const updatedApplication =
        await applicationService.updateApplicationStage(id, req.user.userId, {
          stage,
          version,
        });

      res.status(200).json({
        success: true,
        message: "Application stage updated successfully",
        data: updatedApplication,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("Conflict")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("Forbidden")) {
        res.status(403).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("not found")) {
        res.status(404).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("positive integer") ||
        err.message.includes("Invalid") ||
        err.message.includes("required")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }
}

export const applicationController = new ApplicationController();
