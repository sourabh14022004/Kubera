import type {
  AssetStatus,
  InventoryMovementType,
  LoanStatus,
} from "../../types/inventory";
import type { StorageColor, TrackingType } from "../../types/storage";

export function LocationCodeBadge({
  code,
  color,
}: {
  code: string | null | undefined;
  color?: StorageColor;
}) {
  if (!code) {
    return (
      <span className="inline-flex items-center rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-0.5 text-xs text-slate-400">
        Unassigned
      </span>
    );
  }

  const resolvedColor: StorageColor | undefined =
    color ??
    (code.startsWith("GREEN-")
      ? "GREEN"
      : code.startsWith("ORANGE-")
        ? "ORANGE"
        : code.startsWith("BLACK-")
          ? "BLACK"
          : undefined);

  const colorClasses =
    resolvedColor === "GREEN"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : resolvedColor === "ORANGE"
        ? "border-orange-200 bg-orange-50 text-orange-700"
        : "border-slate-300 bg-slate-100 text-slate-800";

  const dotClass =
    resolvedColor === "GREEN"
      ? "bg-emerald-500"
      : resolvedColor === "ORANGE"
        ? "bg-orange-500"
        : "bg-slate-700";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-xs font-medium ${colorClasses}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
      {code}
    </span>
  );
}

export function TrackingTypeBadge({ type }: { type: TrackingType }) {
  return type === "BULK" ? (
    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
      Bulk
    </span>
  ) : (
    <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
      Individual
    </span>
  );
}

export function AssetStatusBadge({ status }: { status: AssetStatus }) {
  const styles: Record<AssetStatus, string> = {
    AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CHECKED_OUT: "border-blue-200 bg-blue-50 text-blue-700",
    UNDER_MAINTENANCE: "border-amber-200 bg-amber-50 text-amber-700",
    DAMAGED: "border-red-200 bg-red-50 text-red-700",
    LOST: "border-rose-200 bg-rose-50 text-rose-700",
    RETIRED: "border-slate-200 bg-slate-100 text-slate-600",
  };

  const labels: Record<AssetStatus, string> = {
    AVAILABLE: "Available",
    CHECKED_OUT: "Checked Out",
    UNDER_MAINTENANCE: "Maintenance",
    DAMAGED: "Damaged",
    LOST: "Lost",
    RETIRED: "Retired",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function LoanStatusBadge({ status }: { status: LoanStatus }) {
  const styles: Record<LoanStatus, string> = {
    OUTSTANDING: "border-blue-200 bg-blue-50 text-blue-700",
    OVERDUE: "border-red-200 bg-red-50 text-red-700",
    CLOSED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  const labels: Record<LoanStatus, string> = {
    OUTSTANDING: "Outstanding",
    OVERDUE: "Overdue",
    CLOSED: "Closed",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

export function MovementTypeBadge({
  type,
}: {
  type: InventoryMovementType;
}) {
  const config: Record<
    InventoryMovementType,
    { label: string; className: string }
  > = {
    STOCK_IN: {
      label: "Stock In",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    },
    CHECKOUT: {
      label: "Checkout",
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    RETURN: {
      label: "Return",
      className: "border-teal-200 bg-teal-50 text-teal-700",
    },
    ADJUSTMENT: {
      label: "Adjustment",
      className: "border-violet-200 bg-violet-50 text-violet-700",
    },
    MARK_DAMAGED: {
      label: "Damaged",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    MARK_LOST: {
      label: "Lost",
      className: "border-red-200 bg-red-50 text-red-700",
    },
    RETIRE: {
      label: "Retire",
      className: "border-slate-200 bg-slate-100 text-slate-600",
    },
  };

  const { label, className } = config[type];
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
