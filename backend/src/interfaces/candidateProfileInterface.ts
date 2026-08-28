import { CandidateProfile } from "../models/CandidateProfile";

export interface CreateCandidateProfileDTO {
  full_name: string;
  phone?: string;
  skills?: string;
  experience?: string;
}

export interface UpdateCandidateProfileDTO {
  full_name?: string;
  phone?: string;
  skills?: string;
  experience?: string;
}

export interface CandidateProfileResponse {
  success: boolean;
  message?: string;
  data: {
    profile: CandidateProfile;
  };
}

export interface DeleteCandidateProfileResponse {
  success: boolean;
  message: string;
}
