import { apiClient } from "@/services/api/client";
import type { LoginRequest, LoginResponse } from "@/types/auth";

interface ApiLoginResponse {
  accessToken?: string;
  token?: string;
  expiresIn?: number;
  user: {
    id: string;
    fullName: string;
    role: "ohs" | "supervisor" | "manager" | "hr";
    departmentName?: string;
  };
}

export const authService = {
  async login(input: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<ApiLoginResponse>("/auth/login", input);

    return {
      accessToken: response.data.accessToken ?? response.data.token ?? "",
      expiresIn: response.data.expiresIn ?? 3600,
      user: response.data.user
    };
  }
};
