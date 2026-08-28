export interface CandidateProfile {
  id: number;
  profile_id: number;
  full_name: string;
  phone?: string | null;
  skills?: string | null;
  experience?: string | null;
  resume_path?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCandidateProfilePayload {
  full_name: string;
  phone?: string;
  skills?: string;
  experience?: string;
}

export interface UpdateCandidateProfilePayload {
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
