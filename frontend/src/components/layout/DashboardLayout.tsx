import { useState } from "react";
import { Outlet } from "react-router";
import { AlertCircle, LogOut, RefreshCw } from "lucide-react";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useAuth } from "../../context/auth-context";

function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading, error, refreshProfile, signOut } = useAuth();

  const closeSidebar = () => setIsSidebarOpen(false);

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={closeSidebar}
          aria-label="Close navigation overlay"
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {loading && !user ? (
            <div className="flex min-h-[55vh] flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
              <p className="text-sm font-medium text-slate-500">
                Loading your Kubera workspace...
              </p>
            </div>
          ) : error && !user ? (
            <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-red-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <AlertCircle size={24} />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">
                Unable to access Kubera workspace
              </h2>
              <p className="mt-2 text-sm text-slate-600">{error}</p>
              <p className="mt-2 text-xs text-slate-400">
                Make sure your backend server is running and your account is
                registered &amp; active in Kubera.
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => void refreshProfile()}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                  <RefreshCw size={15} />
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
