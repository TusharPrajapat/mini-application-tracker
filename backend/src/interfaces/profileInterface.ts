import { UserRole } from "../types/commonEnum";

export interface CreateProfileDTO {
  auth_user_id: string;
  email: string;
  role: UserRole;
}

export interface UpdateProfileDTO {
  email?: string;
  role?: UserRole;
}
