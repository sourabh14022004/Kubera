
import { useState } from "react";
import { Outlet } from "react-router";

import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function DashboardLayout() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const closeSidebar = () => setIsSidebarOpen(false);

    return (
        <div className="min-h-screen bg-slate-50 lg:flex">
            {isSidebarOpen && (
                <button
                    className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden"
                    onClick={closeSidebar}
                    aria-label="Close navigation overlay"
                />
            )}

            <Sidebar
                isOpen={isSidebarOpen}
                onClose={closeSidebar}
            />

            <div className="flex min-w-0 flex-1 flex-col">
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />

                <main className="flex-1 p-4 sm:p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}

export default DashboardLayout;
