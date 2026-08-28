import { Request, Response, NextFunction } from "express";
import { jobService } from "../services/jobService";

export class JobController {
  /**
   * HTTP Handler for POST /api/jobs
   * Only RECRUITER role permitted (enforced by requireRole middleware).
   */
  async createJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      console.log("req.user", req.user);
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const { title, description, status } = req.body;

      const job = await jobService.createJob(req.user.userId, {
        title,
        description,
        status,
      });

      res.status(201).json({
        success: true,
        message: "Job created successfully",
        data: job,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("required") || err.message.includes("Invalid")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({
          success: false,
          error: err.message || "Internal server error",
        });
    }
  }

  /**
   * HTTP Handler for GET /api/jobs
   * Returns recruiter's own jobs for RECRUITER, or OPEN jobs for CANDIDATE.
   */
  async getJobs(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const jobs = await jobService.getJobs(req.user);

      res.status(200).json({
        success: true,
        data: jobs,
      });
    } catch (error) {
      const err = error as Error;
      res
        .status(500)
        .json({
          success: false,
          error: err.message || "Internal server error",
        });
    }
  }

  /**
   * HTTP Handler for GET /api/jobs/:id
   */
  async getJobById(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      const job = await jobService.getJobById(id, req.user);

      res.status(200).json({
        success: true,
        data: job,
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
        .json({
          success: false,
          error: err.message || "Internal server error",
        });
    }
  }

  /**
   * HTTP Handler for PUT /api/jobs/:id
   * Only RECRUITER role permitted. Updates job if owned by authenticated recruiter.
   */
  async updateJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);
      const { title, description, status } = req.body;

      const updatedJob = await jobService.updateJob(id, req.user.userId, {
        title,
        description,
        status,
      });

      res.status(200).json({
        success: true,
        message: "Job updated successfully",
        data: updatedJob,
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

      if (
        err.message.includes("positive integer") ||
        err.message.includes("Invalid") ||
        err.message.includes("must be")
      ) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({
          success: false,
          error: err.message || "Internal server error",
        });
    }
  }

  /**
   * HTTP Handler for DELETE /api/jobs/:id
   * Only RECRUITER role permitted. Deletes job if owned by authenticated recruiter.
   */
  async deleteJob(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: "Unauthenticated" });
        return;
      }

      const id = Number(req.params.id);

      await jobService.deleteJob(id, req.user.userId);

      res.status(200).json({
        success: true,
        message: `Job with id '${id}' deleted successfully`,
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
        .json({
          success: false,
          error: err.message || "Internal server error",
        });
    }
  }
}

export const jobController = new JobController();
