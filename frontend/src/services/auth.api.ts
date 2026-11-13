
import { authenticatedRequest } from "./api-client";

export interface NeonAuthProfile {
  id: string;
  email?: string;
  name?: string;
}

interface AuthMeResponse {
  success: boolean;
  message: string;
  user: NeonAuthProfile;
}

export async function getCurrentAuthProfile(): Promise<NeonAuthProfile> {
  const response =
    await authenticatedRequest<AuthMeResponse>("/auth/me");

  return response.user;
}
