export type UserRole = "ohs" | "supervisor" | "manager" | "hr";

export type UiRole = "admin" | "user";

export interface AuthUser {
  id: string;
  fullName: string;
  role: UserRole;
<<<<<<< HEAD
  departmentName?: string;
=======
  departmentName: string | null;
>>>>>>> abd55b3 (fixes)
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresIn: number;
  user: AuthUser;
}
