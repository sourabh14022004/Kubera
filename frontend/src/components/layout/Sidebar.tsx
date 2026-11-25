import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  Users,
  MapPin,
  History,
  Settings,
  Boxes,
  Tags,
  LogOut,
  X,
} from "lucide-react";
import { useAuth } from "../../context/auth-context";
import { formatRoleLabel } from "../../utils/format";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const primaryNavigation = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Assets & Loans", path: "/loans", icon: ArrowLeftRight },
  { label: "Storage Locations", path: "/storage", icon: MapPin },
  { label: "Categories", path: "/categories", icon: Tags },
  { label: "Activity Log", path: "/activity", icon: History },
];

const orgNavigation = [
  { label: "Members", path: "/members", icon: Users },
  { label: "Settings", path: "/settings", icon: Settings },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-slate-800/80 bg-[#0B1120] text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-18 items-center justify-between border-b border-slate-800/80 px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/25">
            <Boxes size={21} />
          </div>

          <div>
            <h1 className="text-base font-bold tracking-wider">KUBERA</h1>
            <p className="text-[11px] text-slate-400">Robotics Lab OS</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X size={19} />
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-3.5 py-5">
        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
            Operations
          </p>

          <nav className="space-y-1">
            {primaryNavigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="mb-2 px-3 text-[11px] font-semibold tracking-widest text-slate-500 uppercase">
            Workspace
          </p>

          <nav className="space-y-1">
            {orgNavigation.map(({ label, path, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30"
                      : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
                  }`
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div className="border-t border-slate-800/80 p-3.5">
        {user && (
          <div className="mb-2.5 rounded-xl bg-slate-900/90 px-3 py-2.5 ring-1 ring-slate-800">
            <p className="truncate text-xs font-semibold text-slate-200">
              {user.name}
            </p>
            <p className="mt-0.5 truncate text-[11px] text-slate-400">
              {user.roles.length > 0
                ? user.roles.map(formatRoleLabel).join(" · ")
                : "Member"}
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => void signOut()}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
