
import { Menu, Bell } from "lucide-react";
import { useLocation } from "react-router";

interface TopbarProps {
    onMenuClick: () => void;
}

const pageTitles: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/inventory": "Inventory",
    "/members": "Members",
    "/storage": "Storage Locations",
    "/activity": "Activity Log",
    "/settings": "Settings",
};

function Topbar({ onMenuClick }: TopbarProps) {
    const { pathname } = useLocation();
    const pageTitle = pageTitles[pathname] ?? "Kubera";

    return (
        <header className="flex h-20 items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-8">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    aria-label="Open navigation"
                    className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
                >
                    <Menu size={22} />
                </button>

                <div>
                    <h2 className="text-lg font-semibold text-slate-900">
                        {pageTitle}
                    </h2>
                    <p className="hidden text-xs text-slate-500 sm:block">
                        Robotics Lab Management
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="hidden h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 sm:flex">
                    <Bell size={19} />
                </div>

                <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">
                        SA
                    </div>

                    <div className="hidden sm:block">
                        <p className="text-sm font-semibold text-slate-800">
                            Administrator
                        </p>
                        <p className="text-xs text-slate-500">Super Admin</p>
                    </div>
                </div>
            </div>
        </header>
    );
}

export default Topbar;
