import { useEffect, useState } from "react";
import { AlertCircle, History, RefreshCw } from "lucide-react";

import EmptyState from "../components/common/EmptyState";
import Pagination from "../components/common/Pagination";
import { MovementTypeBadge } from "../components/common/Badge";
import { getAllComponents } from "../services/components.api";
import { getMovementHistory } from "../services/reports.api";
import type { Pagination as PaginationType } from "../types/api";
import type {
  ComponentItem,
  InventoryMovement,
  InventoryMovementType,
} from "../types/inventory";
import { formatDateTime } from "../utils/format";

const MOVEMENT_TYPES: InventoryMovementType[] = [
  "STOCK_IN",
  "CHECKOUT",
  "RETURN",
  "ADJUSTMENT",
  "MARK_DAMAGED",
  "MARK_LOST",
  "RETIRE",
];

function ActivityPage() {
  const [movementType, setMovementType] = useState<
    InventoryMovementType | ""
  >("");
  const [componentId, setComponentId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadComponents() {
      try {
        const res = await getAllComponents({
          status: "ALL",
          page: 1,
          limit: 100,
        });
        if (active) setComponents(res.data);
      } catch {
        // Non-blocking
      }
    }
    void loadComponents();
    return () => {
      active = false;
    };
  }, []);

  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let active = true;

    async function fetchMovements() {
      if (fromDate && toDate && new Date(fromDate) > new Date(toDate)) {
        setError("From date cannot be later than To date.");
        setLoading(false);
        return;
      }

      setError(null);
      try {
        const res = await getMovementHistory({
          movementType: movementType || undefined,
          componentId: componentId || undefined,
          from: fromDate
            ? new Date(`${fromDate}T00:00:00`).toISOString()
            : undefined,
          to: toDate
            ? new Date(`${toDate}T23:59:59`).toISOString()
            : undefined,
          page,
          limit: 20,
        });
        if (!active) return;
        setMovements(res.movements);
        setPagination(res.pagination);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load movement history.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchMovements();
    return () => {
      active = false;
    };
  }, [movementType, componentId, fromDate, toDate, page, reloadTick]);

  function triggerRefresh() {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }

  function resetFilters() {
    setMovementType("");
    setComponentId("");
    setFromDate("");
    setToDate("");
    setPage(1);
    setLoading(true);
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Activity Audit Log
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Complete history of stock-ins, checkouts, returns, adjustments, and
            write-offs.
          </p>
        </div>

        <button
          type="button"
          onClick={triggerRefresh}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <select
            value={movementType}
            onChange={(e) => {
              setMovementType(e.target.value as InventoryMovementType | "");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Movement Types</option>
            {MOVEMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replaceAll("_", " ")}
              </option>
            ))}
          </select>

          <select
            value={componentId}
            onChange={(e) => {
              setComponentId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">All Components</option>
            {components.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setPage(1);
            }}
            aria-label="From date"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <input
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setPage(1);
            }}
            aria-label="To date"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Reset Filters
          </button>
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-slate-100"
            />
          ))}
        </div>
      ) : movements.length === 0 ? (
        <EmptyState
          icon={History}
          title="No inventory movements"
          description="No stock movements match the selected filters."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-3.5">Timestamp</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Component / Asset</th>
                  <th className="px-4 py-3.5">Delta</th>
                  <th className="px-4 py-3.5">Performed By</th>
                  <th className="px-4 py-3.5">Member</th>
                  <th className="px-5 py-3.5">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {movements.map((mov) => (
                  <tr
                    key={mov.id}
                    className="transition-colors hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4 text-xs whitespace-nowrap text-slate-500 tabular-nums">
                      {formatDateTime(mov.createdAt)}
                    </td>

                    <td className="px-4 py-4">
                      <MovementTypeBadge type={mov.movementType} />
                    </td>

                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">
                        {mov.component.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 font-mono text-xs text-slate-400">
                        <span>{mov.component.code}</span>
                        {mov.asset && (
                          <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
                            {mov.asset.assetTag}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-4 font-mono text-sm font-bold tabular-nums">
                      <span
                        className={
                          mov.quantityChange > 0
                            ? "text-emerald-600"
                            : mov.quantityChange < 0
                              ? "text-red-600"
                              : "text-slate-600"
                        }
                      >
                        {mov.quantityChange > 0
                          ? `+${mov.quantityChange}`
                          : mov.quantityChange}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-xs">
                      <p className="font-medium text-slate-800">
                        {mov.performedBy.name}
                      </p>
                      <p className="text-slate-400">{mov.performedBy.email}</p>
                    </td>

                    <td className="px-4 py-4 text-xs">
                      {mov.member ? (
                        <>
                          <p className="font-medium text-slate-800">
                            {mov.member.name}
                          </p>
                          <p className="text-slate-400">{mov.member.email}</p>
                        </>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="max-w-xs truncate px-5 py-4 text-xs text-slate-600">
                      {mov.note || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination pagination={pagination} onPageChange={setPage} />
        </section>
      )}
    </div>
  );
}

export default ActivityPage;
