import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router";
import { authClient } from "../auth/auth.client";
import { getCurrentAuthProfile } from "../services/auth.api";
import {
  ADMIN_ROLES,
  MANAGEMENT_ROLES,
  type KuberaUser,
} from "../types/api";
import { AuthContext } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<KuberaUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await getCurrentAuthProfile();
      setUser(profile);
    } catch (err) {
      setUser(null);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to resolve your Kubera account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const profile = await getCurrentAuthProfile();
        if (active) {
          setUser(profile);
          setError(null);
        }
      } catch (err) {
        if (active) {
          setUser(null);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to resolve your Kubera account.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const isManagement = useMemo(
    () =>
      Boolean(user?.roles.some((role) => MANAGEMENT_ROLES.includes(role))),
    [user],
  );

  const isAdmin = useMemo(
    () => Boolean(user?.roles.some((role) => ADMIN_ROLES.includes(role))),
    [user],
  );

  const value = useMemo(
    () => ({
      user,
      loading,
      error,
      isManagement,
      isAdmin,
      refreshProfile,
      signOut,
    }),
    [user, loading, error, isManagement, isAdmin, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
