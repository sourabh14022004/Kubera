import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowUpRight,
  Copy,
  Info,
  RefreshCw,
  Users,
} from "lucide-react";

import EmptyState from "../components/common/EmptyState";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { getAllLoans } from "../services/loans.api";
import { getInitials } from "../utils/format";

interface BorrowerAggregate {
  id: string;
  name: string;
  email: string;
  totalLoans: number;
  outstandingLoans: number;
  overdueLoans: number;
}

function MembersPage() {
  const { user, isManagement } = useAuth();
  const { showToast } = useToast();

  const [borrowers, setBorrowers] = useState<BorrowerAggregate[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isManagement) return;
    let active = true;

    async function loadBorrowersFromLoans() {
      setLoading(true);
      try {
        const res = await getAllLoans({ page: 1, limit: 100 });
        if (!active) return;

        const map = new Map<string, BorrowerAggregate>();
        for (const loan of res.data) {
          const existing = map.get(loan.member.id) ?? {
            id: loan.member.id,
            name: loan.member.name,
            email: loan.member.email,
            totalLoans: 0,
            outstandingLoans: 0,
            overdueLoans: 0,
          };
          existing.totalLoans += 1;
          if (loan.loanStatus === "OUTSTANDING") {
            existing.outstandingLoans += 1;
          } else if (loan.loanStatus === "OVERDUE") {
            existing.outstandingLoans += 1;
            existing.overdueLoans += 1;
          }
          map.set(loan.member.id, existing);
        }

        setBorrowers(Array.from(map.values()));
      } catch {
        // Non-blocking
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadBorrowersFromLoans();
    return () => {
      active = false;
    };
  }, [isManagement]);

  async function copyId(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      showToast("Member UUID copied to clipboard.", "success");
    } catch {
      showToast("Unable to copy UUID.", "error");
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Club Members
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Member directory and role assignments.
          </p>
        </div>
      </section>

      <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50/70 p-4 text-xs leading-relaxed text-blue-900">
        <Info size={18} className="mt-0.5 shrink-0 text-blue-600" />
        <div>
          <p className="font-semibold">
            User &amp; Role Management Backend Module in Progress
          </p>
          <p className="mt-1 text-blue-800/90">
            The backend currently provides{" "}
            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
              GET /api/auth/me
            </code>{" "}
            and loan endpoints, while dedicated{" "}
            <code className="rounded bg-blue-100 px-1 py-0.5 font-mono">
              /api/members
            </code>{" "}
            / role-assignment APIs are still being built. Below is your active
            Kubera identity and (for management roles) borrowers discovered from
            recorded loans.
          </p>
        </div>
      </div>

      {user && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            Your Kubera Identity
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                {getInitials(user.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {user.name}
                </p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <code className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-mono text-xs text-slate-700">
                {user.id}
              </code>
              <button
                type="button"
                onClick={() => void copyId(user.id)}
                title="Copy your Member UUID"
                className="rounded-lg border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <Copy size={14} />
              </button>
            </div>
          </div>
        </section>
      )}

      {isManagement && (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Active Borrowers (from Loan Records)
              </h2>
              <p className="text-xs text-slate-500">
                Members who have borrowed bulk or serialized items
              </p>
            </div>
            <Link
              to="/loans?tab=all-loans"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Open All Loans
              <ArrowUpRight size={13} />
            </Link>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={20} className="animate-spin text-blue-600" />
            </div>
          ) : borrowers.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={Users}
                title="No borrower history yet"
                description="Once members check out components or assets, they will appear here with quick UUID copy."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                    <th className="px-5 py-3.5">Member</th>
                    <th className="px-4 py-3.5">Kubera UUID</th>
                    <th className="px-4 py-3.5">Total Loans</th>
                    <th className="px-4 py-3.5">Outstanding</th>
                    <th className="px-5 py-3.5">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {borrowers.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <p className="font-semibold text-slate-900">{b.name}</p>
                        <p className="text-xs text-slate-500">{b.email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-xs text-slate-600">
                            {b.id}
                          </code>
                          <button
                            type="button"
                            onClick={() => void copyId(b.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Copy UUID"
                          >
                            <Copy size={13} />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800 tabular-nums">
                        {b.totalLoans}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        {b.outstandingLoans}
                      </td>
                      <td className="px-5 py-3.5 tabular-nums">
                        <span
                          className={
                            b.overdueLoans > 0
                              ? "font-semibold text-red-600"
                              : "text-slate-400"
                          }
                        >
                          {b.overdueLoans}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default MembersPage;
