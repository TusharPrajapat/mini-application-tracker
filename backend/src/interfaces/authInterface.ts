import { UserRole } from "../types/commonEnum";
import { Profile } from "../models/Profile";

export interface SignupDTO {
  email: string;
  password: string;
  role: number;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface SignupResult {
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    id: string;
    email?: string;
  };
  profile: Profile;
}

export interface AuthUser {
  userId: number;
  role: UserRole;
}
