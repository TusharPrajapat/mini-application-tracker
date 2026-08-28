import { Profile } from "../models/Profile";
import { UserRole } from "../types/commonEnum";
import {
  CreateProfileDTO,
  UpdateProfileDTO,
} from "../interfaces/profileInterface";

export class ProfileService {
  /**
   * Create a new Profile record.
   * Business logic & validation belongs in this service layer.
   */
  async createProfile(data: CreateProfileDTO): Promise<Profile> {
    // 1. Validate required fields
    if (
      !data.auth_user_id ||
      typeof data.auth_user_id !== "string" ||
      data.auth_user_id.trim() === ""
    ) {
      throw new Error(
        "auth_user_id is required and must be a non-empty string",
      );
    }

    if (
      !data.email ||
      typeof data.email !== "string" ||
      data.email.trim() === ""
    ) {
      throw new Error("email is required and must be a non-empty string");
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      throw new Error("Invalid email format");
    }

    // 2. Validate role using existing UserRole enum without duplicating numeric literals
    const validRoles: number[] = [UserRole.RECRUITER, UserRole.CANDIDATE];
    if (data.role === undefined || !validRoles.includes(data.role)) {
      throw new Error(
        `Invalid role value. Allowed roles are UserRole.RECRUITER (${UserRole.RECRUITER}) or UserRole.CANDIDATE (${UserRole.CANDIDATE})`,
      );
    }

    // 3. Check duplicate profile for auth_user_id
    const existingProfile = await Profile.findOne({
      where: {
        auth_user_id: data.auth_user_id,
      },
    });

    if (existingProfile) {
      throw new Error(
        `Profile with auth_user_id '${data.auth_user_id}' already exists`,
      );
    }

    // 4. Create record in Supabase PostgreSQL via Sequelize model
    const profile = await Profile.create({
      auth_user_id: data.auth_user_id,
      email: data.email,
      role: data.role,
    });

    if (!profile) {
      throw new Error("Failed to create profile");
    }

    return profile;
  }

  /**
   * Retrieve a Profile by its primary key ID.
   */
  async getProfileById(id: number): Promise<Profile | null> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const profile = await Profile.findByPk(id);

    if (!profile) {
      throw new Error(`Profile with id '${id}' not found`);
    }

    return profile;
  }

  /**
   * Retrieve a Profile by its auth_user_id UUID.
   */
  async getProfileByAuthUserId(auth_user_id: string): Promise<Profile | null> {
    if (
      !auth_user_id ||
      typeof auth_user_id !== "string" ||
      auth_user_id.trim() === ""
    ) {
      throw new Error("auth_user_id is required");
    }

    const profile = await Profile.findOne({
      where: { auth_user_id },
    });

    if (!profile) {
      throw new Error(`Profile with auth_user_id '${auth_user_id}' not found`);
    }

    return profile;
  }

  /**
   * Update an existing Profile by ID.
   */
  async updateProfileById(
    id: number,
    data: UpdateProfileDTO,
  ): Promise<Profile> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const profile = await Profile.findByPk(id);

    if (!profile) {
      throw new Error(`Profile with id '${id}' not found`);
    }

    if (data.email !== undefined) {
      if (typeof data.email !== "string" || data.email.trim() === "") {
        throw new Error("email must be a non-empty string");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(data.email)) {
        throw new Error("Invalid email format");
      }
      profile.email = data.email;
    }

    if (data.role !== undefined) {
      const validRoles: number[] = [UserRole.RECRUITER, UserRole.CANDIDATE];
      if (!validRoles.includes(data.role)) {
        throw new Error(
          `Invalid role value. Allowed roles are UserRole.RECRUITER (${UserRole.RECRUITER}) or UserRole.CANDIDATE (${UserRole.CANDIDATE})`,
        );
      }
      profile.role = data.role;
    }

    await profile.save();
    return profile;
  }

  /**
   * Delete a Profile by ID.
   */
  async deleteProfileById(id: number): Promise<void> {
    if (isNaN(id) || id <= 0) {
      throw new Error("ID must be a positive integer");
    }

    const profile = await Profile.findByPk(id);

    if (!profile) {
      throw new Error(`Profile with id '${id}' not found`);
    }

    await profile.destroy();
  }
}

export const profileService = new ProfileService();
