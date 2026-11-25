import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  accent?: "default" | "warning" | "danger" | "success";
  onClick?: () => void;
}

const valueColorClasses: Record<NonNullable<StatCardProps["accent"]>, string> = {
  default: "text-slate-900",
  warning: "text-amber-600",
  danger: "text-red-600",
  success: "text-emerald-600",
};

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClassName,
  accent = "default",
  onClick,
}: StatCardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`group w-full rounded-2xl border border-slate-200/80 bg-white p-5 text-left shadow-xs transition-all ${
        onClick
          ? "cursor-pointer hover:border-blue-300 hover:shadow-md"
          : "hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
            {title}
          </p>
          <h3
            className={`mt-2.5 text-3xl font-bold tracking-tight tabular-nums ${valueColorClasses[accent]}`}
          >
            {value}
          </h3>
          <p className="mt-1.5 truncate text-xs text-slate-500">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${iconClassName}`}
        >
          <Icon size={21} />
        </div>
      </div>
    </Component>
  );
}

export default StatCard;
