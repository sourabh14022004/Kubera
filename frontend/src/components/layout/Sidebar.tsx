
import { NavLink } from "react-router";
import {
  LayoutDashboard,
  Package,
  Users,
  MapPin,
  History,
  Settings,
  Boxes,
  X,
} from "lucide-react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Inventory", path: "/inventory", icon: Package },
  { label: "Members", path: "/members", icon: Users },
  { label: "Storage Locations", path: "/storage", icon: MapPin },
  { label: "Activity Log", path: "/activity", icon: History },
];

function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-800 bg-slate-950 text-white transition-transform duration-200 lg:static lg:translate-x-0 ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex h-20 items-center justify-between border-b border-slate-800 px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Boxes size={23} />
          </div>

          <div>
            <h1 className="text-lg font-bold tracking-wider">KUBERA</h1>
            <p className="text-xs text-slate-400">Robotics Inventory</p>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Close navigation"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <div className="px-4 py-6">
        <p className="mb-3 px-3 text-xs font-semibold tracking-widest text-slate-500">
          WORKSPACE
        </p>

        <nav className="space-y-1">
          {navigationItems.map(({ label, path, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`
              }
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-slate-800 p-4">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium ${
              isActive
                ? "bg-blue-600 text-white"
                : "text-slate-400 hover:bg-slate-900 hover:text-white"
            }`
          }
        >
          <Settings size={19} />
          Settings
        </NavLink>
      </div>
    </aside>
  );
}

export default Sidebar;
