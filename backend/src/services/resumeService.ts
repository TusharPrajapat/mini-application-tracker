import { CandidateProfile } from "../models/CandidateProfile";
import { Application } from "../models/Application";
import { Job } from "../models/Job";
import { storageService } from "./storageService";

export class ResumeService {
  /**
   * Upload / Replace Candidate Resume (POST /api/profile/resume)
   */
  async uploadResume(
    profileId: number,
    file?: Express.Multer.File
  ): Promise<{ resumePath: string }> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    if (!file) {
      throw new Error("No file uploaded. 'resume' form field is required");
    }

    // Validate Candidate Profile existence
    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new Error("Candidate profile not found. Create your profile first.");
    }

    // Backend File Size Validation (Max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      throw new Error("File size exceeds maximum allowed limit of 5 MB");
    }

    // Backend MIME Type & Extension Validation (PDF Only)
    const isPdfMime = file.mimetype === "application/pdf";
    const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");

    if (!isPdfMime || !isPdfExt) {
      throw new Error("Invalid file format. Only PDF files (.pdf) are allowed");
    }

    // Construct predictable storage path: resumes/{profileId}/resume.pdf
    const storagePath = `${profileId}/resume.pdf`;
    const oldResumePath = profile.resume_path;

    // Upload to Supabase Storage
    const uploadedPath = await storageService.uploadResume(
      storagePath,
      file.buffer,
      file.mimetype
    );

    // Save storage path in database
    try {
      profile.resume_path = uploadedPath;
      await profile.save();
    } catch (dbError) {
      // Rollback newly uploaded storage file on database failure
      await storageService.deleteResume(uploadedPath);
      throw new Error("Failed to save resume path in database");
    }

    // Cleanup old file if it existed under a different path
    if (oldResumePath && oldResumePath !== uploadedPath) {
      await storageService.deleteResume(oldResumePath);
    }

    return { resumePath: uploadedPath };
  }

  /**
   * Get Short-Lived Signed Resume URL (GET /api/profile/resume)
   */
  async getResume(
    profileId: number
  ): Promise<{ resumePath: string; signedUrl: string; expiresIn: number }> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile || !profile.resume_path) {
      throw new Error("Resume not found for this candidate profile");
    }

    // Generate 60-second short-lived signed URL
    const expiresIn = 60;
    const signedUrl = await storageService.createSignedResumeUrl(
      profile.resume_path,
      expiresIn
    );

    return {
      resumePath: profile.resume_path,
      signedUrl,
      expiresIn,
    };
  }

  /**
   * Delete Candidate Resume (DELETE /api/profile/resume)
   */
  async deleteResume(profileId: number): Promise<void> {
    if (isNaN(profileId) || profileId <= 0) {
      throw new Error("Invalid profile ID");
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: profileId },
    });

    if (!profile) {
      throw new Error("Candidate profile not found");
    }

    if (!profile.resume_path) {
      return; // Already deleted / null
    }

    const oldPath = profile.resume_path;

    // Remove file from storage and reset database path
    await storageService.deleteResume(oldPath);
    profile.resume_path = null;
    await profile.save();
  }

  /**
   * Recruiter Review: Get signed resume URL for an application candidate (GET /api/applications/:id/candidate-resume)
   */
  async getResumeForApplication(
    applicationId: number,
    recruiterId: number
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    if (isNaN(applicationId) || applicationId <= 0) {
      throw new Error("Application ID must be a positive integer");
    }

    const application = await Application.findByPk(applicationId, {
      include: [{ model: Job, as: "job" }],
    });

    if (!application) {
      throw new Error(`Application with id '${applicationId}' not found`);
    }

    if (!application.job || application.job.recruiter_id !== recruiterId) {
      throw new Error(
        "Forbidden: You do not have permission to access resumes for this application"
      );
    }

    const profile = await CandidateProfile.findOne({
      where: { profile_id: application.candidate_id },
    });

    if (!profile || !profile.resume_path) {
      throw new Error("No resume uploaded for this candidate");
    }

    const expiresIn = 60;
    const signedUrl = await storageService.createSignedResumeUrl(
      profile.resume_path,
      expiresIn
    );

    return {
      signedUrl,
      expiresIn,
    };
  }
}

export const resumeService = new ResumeService();
