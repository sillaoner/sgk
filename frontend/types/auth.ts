export type UserRole = "ohs" | "supervisor" | "manager" | "hr";

export type UiRole = "admin" | "user";

export interface AuthUser {
  id: string;
  fullName: string;
  role: UserRole;
  departmentName: string | null;
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
