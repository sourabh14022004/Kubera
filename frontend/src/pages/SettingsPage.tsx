import { useEffect, useState } from "react";
import {
  CheckCircle2,
  LogOut,
  RefreshCw,
  Server,
  Shield,
  User,
} from "lucide-react";

import { useAuth } from "../context/auth-context";
import { checkApiHealth } from "../services/auth.api";
import { formatRoleLabel } from "../utils/format";

function SettingsPage() {
  const { user, isAdmin, isManagement, refreshProfile, signOut } = useAuth();
  const [healthMessage, setHealthMessage] = useState<string | null>(null);
  const [healthOk, setHealthOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    async function check() {
      try {
        const res = await checkApiHealth();
        if (active) {
          setHealthOk(res.success);
          setHealthMessage(res.message);
        }
      } catch (err) {
        if (active) {
          setHealthOk(false);
          setHealthMessage(
            err instanceof Error ? err.message : "Backend unreachable",
          );
        }
      } finally {
        if (active) setChecking(false);
      }
    }
    void check();
    return () => {
      active = false;
    };
  }, []);

  const capabilities = [
    {
      label: "Browse Storage, Components, Assets, Reports & Own Loans",
      allowed: Boolean(user),
    },
    {
      label: "Create/Update Components, Register Assets, Issue & Return Loans",
      allowed: isManagement,
    },
    {
      label: "Bulk Stock-In, Checkout, Adjust, Write-Off & Create Storage Racks",
      allowed: isManagement,
    },
    {
      label: "Manage Categories & Retire/Restore/Delete Storage Racks",
      allowed: isAdmin,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Account &amp; Workspace Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Inspect your Kubera profile, role permissions, and API status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshProfile()}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
        >
          <RefreshCw size={15} />
          Sync Profile
        </button>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile */}
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <User size={19} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Kubera Profile
              </h2>
              <p className="text-xs text-slate-500">
                Resolved via GET /api/auth/me
              </p>
            </div>
          </div>

          {user && (
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs text-slate-500">Name</dt>
                <dd className="font-semibold text-slate-900">{user.name}</dd>
              </div>
              <div className="flex justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs text-slate-500">Email</dt>
                <dd className="font-medium text-slate-800">{user.email}</dd>
              </div>
              <div className="flex flex-col gap-1 rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs text-slate-500">Internal User ID</dt>
                <dd className="font-mono text-xs break-all text-slate-700">
                  {user.id}
                </dd>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 px-4 py-3">
                <dt className="text-xs text-slate-500">Assigned Roles</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {user.roles.length > 0 ? (
                    user.roles.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700"
                      >
                        {formatRoleLabel(r)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-500">
                      Standard Member
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => void signOut()}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
            >
              <LogOut size={14} />
              Sign Out of Kubera
            </button>
          </div>
        </section>

        {/* Permissions & API Status */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Shield size={19} />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-slate-900">
                  Effective Permissions
                </h2>
                <p className="text-xs text-slate-500">
                  Enforced by Kubera RBAC middleware
                </p>
              </div>
            </div>

            <ul className="mt-4 space-y-2.5">
              {capabilities.map((cap) => (
                <li
                  key={cap.label}
                  className="flex items-start gap-2.5 text-xs"
                >
                  <CheckCircle2
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      cap.allowed ? "text-emerald-600" : "text-slate-300"
                    }`}
                  />
                  <span
                    className={
                      cap.allowed ? "text-slate-700" : "text-slate-400"
                    }
                  >
                    {cap.label}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Server size={19} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    Backend Connection
                  </h2>
                  <p className="font-mono text-[11px] text-slate-500">
                    {import.meta.env.VITE_API_BASE_URL}
                  </p>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  checking
                    ? "bg-slate-100 text-slate-600"
                    : healthOk
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-red-50 text-red-700"
                }`}
              >
                {checking ? "Checking..." : healthOk ? "Online" : "Offline"}
              </span>
            </div>

            {healthMessage && (
              <p className="mt-3 rounded-xl bg-slate-50 px-3.5 py-2.5 font-mono text-xs text-slate-600">
                {healthMessage}
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;
