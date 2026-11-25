import { useEffect, useState } from "react";
import { UserCheck } from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { getAllLoans } from "../../services/loans.api";
import { UUID_REGEX } from "../../utils/format";

interface KnownMember {
  id: string;
  name: string;
  email: string;
}

interface MemberPickerProps {
  value: string;
  onChange: (memberId: string) => void;
  label?: string;
}

function MemberPicker({
  value,
  onChange,
  label = "Borrowing Member ID",
}: MemberPickerProps) {
  const { user, isManagement } = useAuth();
  const [recentMembers, setRecentMembers] = useState<KnownMember[]>([]);

  useEffect(() => {
    if (!isManagement) return;
    let active = true;

    async function loadKnownMembers() {
      try {
        const res = await getAllLoans({ page: 1, limit: 50 });
        if (!active) return;

        const map = new Map<string, KnownMember>();
        for (const loan of res.data) {
          if (loan.member && !map.has(loan.member.id)) {
            map.set(loan.member.id, loan.member);
          }
        }
        setRecentMembers(Array.from(map.values()));
      } catch {
        // Non-blocking: manual UUID entry remains available.
      }
    }

    void loadKnownMembers();
    return () => {
      active = false;
    };
  }, [isManagement]);

  const isValidUuid = value.trim().length > 0 && UUID_REGEX.test(value.trim());

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-semibold text-slate-700">
          {label} <span className="text-red-500">*</span>
        </label>

        {user && (
          <button
            type="button"
            onClick={() => onChange(user.id)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700 transition hover:bg-blue-100"
          >
            <UserCheck size={12} />
            Assign to me
          </button>
        )}
      </div>

      {recentMembers.length > 0 && (
        <select
          value={recentMembers.some((m) => m.id === value) ? value : ""}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
        >
          <option value="">Quick-pick from recent borrowers...</option>
          {user && (
            <option value={user.id}>
              {user.name} (You — {user.email})
            </option>
          )}
          {recentMembers
            .filter((m) => m.id !== user?.id)
            .map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} ({member.email})
              </option>
            ))}
        </select>
      )}

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
        className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs outline-none transition focus:ring-2 ${
          value && !isValidUuid
            ? "border-amber-300 bg-amber-50/40 focus:border-amber-500 focus:ring-amber-100"
            : "border-slate-200 bg-white focus:border-blue-500 focus:ring-blue-100"
        }`}
      />

      <p className="text-[11px] text-slate-400">
        Member directory API is not yet live; pick a recent borrower, click
        &ldquo;Assign to me&rdquo;, or paste the member&apos;s Kubera UUID.
      </p>
    </div>
  );
}

export default MemberPicker;
