export enum UserRole {
  RECRUITER = 1,
  CANDIDATE = 2,
}

export interface SignupPayload {
  email: string;
  password: string;
  role: UserRole.RECRUITER | UserRole.CANDIDATE;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface User {
  id: string;
  email?: string;
}

export interface Profile {
  id: number;
  auth_user_id: string;
  email: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface SignupResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    profile: Profile;
  };
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
    profile: Profile;
  };
}

export interface MeResponse {
  success: boolean;
  data: {
    userId: number;
    role: UserRole;
  };
}

export interface HealthCheckResponse {
  status: string;
  message: string;
}
