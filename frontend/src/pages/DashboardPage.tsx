
import {
  Package,
  ArrowLeftRight,
  Users,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
} from "lucide-react";

import StatCard from "../components/common/StartCard";

const statistics = [
  {
    title: "Total Components",
    value: "1,284",
    description: "Registered inventory items",
    icon: Package,
    iconClassName: "bg-blue-50 text-blue-600",
  },
  {
    title: "Checked Out",
    value: "46",
    description: "Currently with members",
    icon: ArrowLeftRight,
    iconClassName: "bg-purple-50 text-purple-600",
  },
  {
    title: "Active Members",
    value: "38",
    description: "Registered club members",
    icon: Users,
    iconClassName: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "Low Stock",
    value: "8",
    description: "Items needing attention",
    icon: AlertTriangle,
    iconClassName: "bg-amber-50 text-amber-600",
  },
];

const activities = [
  {
    title: "ESP32 Development Board",
    member: "Alex Morgan",
    action: "Checked out",
    time: "10 minutes ago",
    icon: ArrowUpRight,
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "Digital Multimeter",
    member: "Jordan Lee",
    action: "Returned",
    time: "35 minutes ago",
    icon: ArrowDownLeft,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    title: "Jumper Wires",
    member: "Taylor Smith",
    action: "Checked out",
    time: "1 hour ago",
    icon: ArrowUpRight,
    color: "text-blue-600 bg-blue-50",
  },
];

const lowStockItems = [
  { name: "DRV8833 Motor Driver", quantity: 4, minimum: 10 },
  { name: "Ultrasonic Sensor", quantity: 3, minimum: 8 },
  { name: "Jumper Wire Set", quantity: 6, minimum: 15 },
];

function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back!
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening in your robotics lab.
          </p>
        </div>

        <span className="w-fit rounded-full bg-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600">
          Demo data
        </span>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold text-slate-800">
            Overview
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statistics.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </div>
      </section>

      {/* Activity and stock alerts */}
      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Recent activity */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm xl:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-semibold text-slate-900">
                Recent Activity
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Latest inventory movements
              </p>
            </div>

            <Clock size={19} className="text-slate-400" />
          </div>

          <div className="divide-y divide-slate-100">
            {activities.map((activity, index) => {
              const Icon = activity.icon;

              return (
                <div
                  key={`${activity.title}-${index}`}
                  className="flex items-center gap-4 p-5"
                >
                  <div className={`rounded-lg p-2.5 ${activity.color}`}>
                    <Icon size={19} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">
                      {activity.title}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {activity.action} by {activity.member}
                    </p>
                  </div>

                  <span className="whitespace-nowrap text-xs text-slate-400">
                    {activity.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low stock */}
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-center gap-2">
              <AlertTriangle size={19} className="text-amber-500" />
              <h2 className="font-semibold text-slate-900">
                Low Stock Alerts
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Components below minimum quantity
            </p>
          </div>

          <div className="space-y-5 p-5">
            {lowStockItems.map((item) => (
              <div key={item.name}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">
                    {item.name}
                  </p>
                  <span className="whitespace-nowrap text-xs font-semibold text-amber-600">
                    {item.quantity} left
                  </span>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-amber-500"
                    style={{
                      width: `${Math.min(
                        (item.quantity / item.minimum) * 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-1 text-xs text-slate-400">
                  Minimum stock: {item.minimum}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-center text-xs text-slate-400">
        Kubera Robotics Inventory Management System
      </p>
    </div>
  );
}

export default DashboardPage;
