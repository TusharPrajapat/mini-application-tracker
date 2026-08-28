import { supabase } from "../config/supabase";
import { profileService } from "./profileService";
import { UserRole } from "../types/commonEnum";
import { Profile } from "../models/Profile";
import {
  SignupDTO,
  LoginDTO,
  SignupResult,
  LoginResult,
} from "../interfaces/authInterface";

export class AuthService {
  /**
   * Complete Signup Flow:
   * 1. Validate email.
   * 2. Validate password.
   * 3. Validate role against UserRole enum (1 = RECRUITER, 2 = CANDIDATE).
   * 4. Create user in Supabase Auth.
   * 5. Extract Supabase auth user UUID.
   * 6. Create matching profiles record with postgres BIGSERIAL generated id.
   */
  async signup(data: SignupDTO): Promise<SignupResult> {
    // 1. Email validation
    if (!data.email || typeof data.email !== "string" || data.email.trim() === "") {
      throw new Error("email is required and must be a non-empty string");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error("Invalid email format");
    }

    // 2. Password validation
    if (!data.password || typeof data.password !== "string") {
      throw new Error("password is required and must be a string");
    }

    if (data.password.length < 6) {
      throw new Error("password must be at least 6 characters long");
    }

    // 3. Strict Role validation against UserRole enum
    const validRoles: number[] = [UserRole.RECRUITER, UserRole.CANDIDATE];
    const numericRole = Number(data.role);

    if (data.role === undefined || isNaN(numericRole) || !validRoles.includes(numericRole)) {
      throw new Error(
        `Invalid role value. Allowed roles are UserRole.RECRUITER (${UserRole.RECRUITER}) or UserRole.CANDIDATE (${UserRole.CANDIDATE})`
      );
    }

    const validatedRole = numericRole as UserRole;

    // 4. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (authError) {
      throw new Error(`Supabase Auth signup failed: ${authError.message}`);
    }

    if (!authData.user) {
      throw new Error("Failed to create user in Supabase Auth");
    }

    // 5. Extract Supabase Auth UUID
    const authUserId = authData.user.id;

    // 6. Create corresponding profiles record
    const profile = await profileService.createProfile({
      auth_user_id: authUserId,
      email: data.email,
      role: validatedRole,
    });

    return {
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      profile,
    };
  }

  /**
   * Complete Login Flow:
   * 1. Validate credentials.
   * 2. Authenticate using Supabase Auth.
   * 3. Return Supabase access token and user profile details.
   */
  async login(data: LoginDTO): Promise<LoginResult> {
    if (!data.email || typeof data.email !== "string" || data.email.trim() === "") {
      throw new Error("email is required");
    }

    if (!data.password || typeof data.password !== "string") {
      throw new Error("password is required");
    }

    // Authenticate with Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

    if (authError || !authData.session || !authData.user) {
      throw new Error(authError?.message || "Invalid credentials");
    }

    // Fetch user profile
    const profile = await profileService.getProfileByAuthUserId(authData.user.id);

    if (!profile) {
      throw new Error("Profile record not found for authenticated user");
    }

    return {
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      expiresIn: authData.session.expires_in,
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      profile,
    };
  }
}

export const authService = new AuthService();
