import { authClient } from "./auth.client";
import { Navigate, Outlet } from "react-router";
import { AuthProvider } from "../context/AuthContext";

function RequiredAuth() {
  const { data, isPending, error } = authClient.useSession();

  if (isPending) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
        <p className="text-sm font-medium text-slate-500">
          Verifying your session...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p role="alert" className="text-sm font-medium text-slate-700">
            Unable to verify your session. Please refresh the page.
          </p>
        </div>
      </div>
    );
  }

  if (!data?.user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

export default RequiredAuth;
