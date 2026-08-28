import { Request, Response, NextFunction } from "express";
import { supabase } from "../config/supabase";
import { profileService } from "../services/profileService";

export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: "Authorization token required",
      });
      return;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Bearer token missing",
      });
      return;
    }

    // Verify access token with Supabase Auth
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        error: "Invalid or expired token",
      });
      return;
    }

    const authUserId = data.user.id;

    // Fetch profile tied to the Supabase auth user UUID
    const profile = await profileService.getProfileByAuthUserId(authUserId);

    if (!profile) {
      res.status(401).json({
        success: false,
        error: "User profile not found",
      });
      return;
    }

    // Attach internal userId (profile.id) and profile.role to req.user
    req.user = {
      userId: profile.id,
      role: profile.role,
    };

    next();
  } catch (error) {
    const err = error as Error;
    res.status(401).json({
      success: false,
      error: err.message || "Authentication failed",
    });
  }
}
