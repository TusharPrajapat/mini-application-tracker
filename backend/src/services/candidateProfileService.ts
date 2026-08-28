import { CandidateProfile } from "../models/CandidateProfile";
import { Application } from "../models/Application";
import { Job } from "../models/Job";
import { Profile } from "../models/Profile";
import {
  CreateCandidateProfileDTO,
  UpdateCandidateProfileDTO,
} from "../interfaces/candidateProfileInterface";

const PROHIBITED_FIELDS = [
  "id",
  "profile_id",
  "resume_path",
  "role",
  "created_at",
  "updated_at",
  "auth_user_id",
  "email",
];

export class CandidateProfileService {
  /**
   * Reject system-managed or prohibited client fields.
   */
  private checkProhibitedFields(data: Record<string, unknown>): void {
    const keys = Object.keys(data);
    for (const prohibited of PROHIBITED_FIELDS) {
      if (keys.includes(prohibited)) {
        throw new Error(
          `Invalid request field '${prohibited}': Client-managed manipulation of system fields is prohibited`
        );
      }
    }
  }

  /**
   * Create Candidate Profile (POST /api/profile)
   */
  async createProfile(
    profileId: number,
    rawData: Record<string, unknown>
  ): Promise<CandidateProfile> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    this.checkProhibitedFields(rawData);

    const data = rawData as unknown as CreateCandidateProfileDTO;

    // Validation: full_name is required
    if (
      !data.full_name ||
      typeof data.full_name !== "string" ||
      data.full_name.trim() === ""
    ) {
      throw new Error("full_name is required and must be a non-empty string");
    }

    if (data.full_name.trim().length > 150) {
      throw new Error("full_name cannot exceed 150 characters");
    }

    // Validation: phone optional
    if (
      data.phone !== undefined &&
      data.phone !== null &&
      (typeof data.phone !== "string" || data.phone.trim().length > 20)
    ) {
      throw new Error("phone must be a string up to 20 characters");
    }

    // Validation: skills optional
    if (
      data.skills !== undefined &&
      data.skills !== null &&
      typeof data.skills !== "string"
    ) {
      throw new Error("skills must be a string");
    }

    // Validation: experience optional
    if (
      data.experience !== undefined &&
      data.experience !== null &&
      typeof data.experience !== "string"
    ) {
      throw new Error("experience must be a string");
    }

    // Check duplicate profile
    const existing = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (existing) {
      throw new Error("Conflict: Candidate profile already exists");
    }

    return await CandidateProfile.create({
      profile_id: profileId,
      full_name: data.full_name.trim(),
      phone: data.phone ? data.phone.trim() : null,
      skills: data.skills ? data.skills.trim() : null,
      experience: data.experience ? data.experience.trim() : null,
      resume_path: null,
    });
  }

  /**
   * Get Candidate Profile (GET /api/profile)
   */
  async getProfile(profileId: number): Promise<CandidateProfile> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new Error("Candidate profile not found");
    }

    return profile;
  }

  /**
   * Update Candidate Profile (PUT /api/profile)
   */
  async updateProfile(
    profileId: number,
    rawData: Record<string, unknown>
  ): Promise<CandidateProfile> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    this.checkProhibitedFields(rawData);

    const keys = Object.keys(rawData);
    if (keys.length === 0) {
      throw new Error(
        "At least one field (full_name, phone, skills, experience) must be provided for update"
      );
    }

    const data = rawData as unknown as UpdateCandidateProfileDTO;

    // Validation if provided
    if (data.full_name !== undefined) {
      if (
        typeof data.full_name !== "string" ||
        data.full_name.trim() === ""
      ) {
        throw new Error("full_name must be a non-empty string");
      }
      if (data.full_name.trim().length > 150) {
        throw new Error("full_name cannot exceed 150 characters");
      }
    }

    if (
      data.phone !== undefined &&
      data.phone !== null &&
      (typeof data.phone !== "string" || data.phone.trim().length > 20)
    ) {
      throw new Error("phone must be a string up to 20 characters");
    }

    if (
      data.skills !== undefined &&
      data.skills !== null &&
      typeof data.skills !== "string"
    ) {
      throw new Error("skills must be a string");
    }

    if (
      data.experience !== undefined &&
      data.experience !== null &&
      typeof data.experience !== "string"
    ) {
      throw new Error("experience must be a string");
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new Error("Candidate profile not found");
    }

    if (data.full_name !== undefined) {
      profile.full_name = data.full_name.trim();
    }
    if (data.phone !== undefined) {
      profile.phone = data.phone ? data.phone.trim() : null;
    }
    if (data.skills !== undefined) {
      profile.skills = data.skills ? data.skills.trim() : null;
    }
    if (data.experience !== undefined) {
      profile.experience = data.experience ? data.experience.trim() : null;
    }

    await profile.save();
    return profile;
  }

  /**
   * Delete Candidate Profile (DELETE /api/profile)
   */
  async deleteProfile(profileId: number): Promise<void> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new Error("Candidate profile not found");
    }

    await profile.destroy();
  }

  /**
   * Recruiter Review: Get candidate profile for an application (GET /api/applications/:id/candidate-profile)
   */
  async getCandidateProfileForApplication(
    applicationId: number,
    recruiterId: number
  ): Promise<{
    candidate: { id: number; email: string; role: number };
    profile: CandidateProfile;
  }> {
    if (isNaN(applicationId) || applicationId <= 0) {
      throw new Error("Application ID must be a positive integer");
    }

    const application = await Application.findByPk(applicationId, {
      include: [
        { model: Job, as: "job" },
        {
          model: Profile,
          as: "candidate",
          attributes: ["id", "email", "role"],
        },
      ],
    });

    if (!application) {
      throw new Error(`Application with id '${applicationId}' not found`);
    }

    if (!application.job || application.job.recruiter_id !== recruiterId) {
      throw new Error(
        "Forbidden: You do not have permission to view candidate information for this application"
      );
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: application.candidate_id },
    });

    if (!profile) {
      throw new Error("Candidate profile not found for this applicant");
    }

    if (!application.candidate) {
      throw new Error("Candidate information not found");
    }

    return {
      candidate: {
        id: application.candidate.id,
        email: application.candidate.email,
        role: application.candidate.role,
      },
      profile,
    };
  }
}

export const candidateProfileService = new CandidateProfileService();
