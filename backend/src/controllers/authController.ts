import { Request, Response, NextFunction } from "express";
import { authService } from "../services/authService";

export class AuthController {
  /**
   * HTTP Handler for POST /api/auth/signup
   */
  async signup(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password, role } = req.body;

      const result = await authService.signup({
        email,
        password,
        role,
      });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (err.message.includes("already exists")) {
        res.status(409).json({ success: false, error: err.message });
        return;
      }

      if (
        err.message.includes("required") ||
        err.message.includes("Invalid") ||
        err.message.includes("at least")
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
   * HTTP Handler for POST /api/auth/login
   */
  async login(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { email, password } = req.body;

      const result = await authService.login({
        email,
        password,
      });

      res.status(200).json({
        success: true,
        message: "Login successful",
        data: result,
      });
    } catch (error) {
      const err = error as Error;

      if (
        err.message.includes("Invalid credentials") ||
        err.message.includes("Invalid login credentials") ||
        err.message.includes("not found")
      ) {
        res.status(401).json({ success: false, error: err.message });
        return;
      }

      if (err.message.includes("required")) {
        res.status(400).json({ success: false, error: err.message });
        return;
      }

      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }

  /**
   * HTTP Handler for GET /api/auth/me
   * Protected route: Returns authenticated user's internal profile ID and role.
   */
  async getMe(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: "Unauthenticated",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          userId: req.user.userId,
          role: req.user.role,
        },
      });
    } catch (error) {
      const err = error as Error;
      res
        .status(500)
        .json({ success: false, error: err.message || "Internal server error" });
    }
  }
}

export const authController = new AuthController();
