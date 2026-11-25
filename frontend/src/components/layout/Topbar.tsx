import { Menu, AlertTriangle, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useAuth } from "../../context/auth-context";
import { formatRoleLabel, getInitials } from "../../utils/format";

interface TopbarProps {
  onMenuClick: () => void;
}

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": {
    title: "Dashboard",
    subtitle: "Live lab stock health, loans, and movement feed",
  },
  "/inventory": {
    title: "Inventory",
    subtitle: "Bulk stock, individual component definitions & quick actions",
  },
  "/loans": {
    title: "Assets & Loans",
    subtitle: "Serialized equipment registry and active member loans",
  },
  "/storage": {
    title: "Storage Locations",
    subtitle: "Color-coded racks, drawers, and physical bin mapping",
  },
  "/categories": {
    title: "Categories",
    subtitle: "Organize component classifications and taxonomy",
  },
  "/activity": {
    title: "Activity Log",
    subtitle: "Immutable audit trail of stock movements",
  },
  "/members": {
    title: "Members",
    subtitle: "Club borrower summary & directory status",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Kubera account, roles, and API diagnostics",
  },
};

function Topbar({ onMenuClick }: TopbarProps) {
  const { pathname } = useLocation();
  const { user, signOut } = useAuth();
  const meta = pageMeta[pathname] ?? {
    title: "Kubera",
    subtitle: "Robotics Lab Management",
  };

  const primaryRole =
    user && user.roles.length > 0
      ? formatRoleLabel(user.roles[0])
      : "Kubera User";

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md sm:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={21} />
        </button>

        <div>
          <h2 className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
            {meta.title}
          </h2>
          <p className="hidden text-xs text-slate-500 sm:block">
            {meta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          to="/inventory?stockStatus=LOW_STOCK"
          title="View low stock components"
          className="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-medium text-amber-800 transition hover:bg-amber-100/80 sm:inline-flex"
        >
          <AlertTriangle size={14} />
          Stock Alerts
        </Link>

        <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white shadow-xs">
            {getInitials(user?.name)}
          </div>

          <div className="hidden sm:block">
            <p className="max-w-36 truncate text-sm font-semibold text-slate-800">
              {user?.name ?? "Loading..."}
            </p>
            <p className="text-[11px] text-slate-500">{primaryRole}</p>
          </div>

          <button
            type="button"
            onClick={() => void signOut()}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
