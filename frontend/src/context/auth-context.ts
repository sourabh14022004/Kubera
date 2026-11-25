import { createContext, useContext } from "react";
import type { KuberaUser } from "../types/api";

export interface AuthContextValue {
  user: KuberaUser | null;
  loading: boolean;
  error: string | null;
  isManagement: boolean;
  isAdmin: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }
  return ctx;
}
