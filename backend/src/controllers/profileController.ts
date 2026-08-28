import { Request, Response, NextFunction } from "express";
import { profileService } from "../services/profileService";

export class ProfileController {
  /**
   * HTTP Handler for POST /api/profiles
   */
  async createProfile(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { auth_user_id, email, role } = req.body;
      const profile = await profileService.createProfile({
        auth_user_id,
        email,
        role: Number(role),
      });

      res.status(201).json({
        success: true,
        message: "Profile created successfully",
        data: profile,
      });
    } catch (error) {
      const err = error as Error;
      if (err.message.includes("already exists")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }
      if (
        err.message.includes("required") ||
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
   * HTTP Handler for GET /api/profiles/:id
   */
  async getProfileById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Number(req.params.id);
      const profile = await profileService.getProfileById(id);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      const err = error as Error;
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
   * HTTP Handler for PUT /api/profiles/:id
   */
  async updateProfileById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Number(req.params.id);
      const { email, role } = req.body;
      const updatedProfile = await profileService.updateProfileById(id, {
        email,
        role: role !== undefined ? Number(role) : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedProfile,
      });
    } catch (error) {
      const err = error as Error;
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
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for DELETE /api/profiles/:id
   */
  async deleteProfileById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const id = Number(req.params.id);
      await profileService.deleteProfileById(id);

      res.status(200).json({
        success: true,
        message: `Profile with id '${id}' deleted successfully`,
      });
    } catch (error) {
      const err = error as Error;
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
}

export const profileController = new ProfileController();
