import { authenticatedRequest, publicRequest } from "./api-client";
import type { HealthResponse, KuberaUser } from "../types/api";

interface AuthMeResponse {
  success: boolean;
  message: string;
  user: KuberaUser;
}

export async function getCurrentAuthProfile(): Promise<KuberaUser> {
  const response = await authenticatedRequest<AuthMeResponse>("/auth/me");
  return response.user;
}

export async function checkApiHealth(): Promise<HealthResponse> {
  return publicRequest<HealthResponse>("/health");
}
