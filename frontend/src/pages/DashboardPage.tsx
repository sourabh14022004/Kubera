import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Boxes,
  Clock,
  History,
  MapPin,
  Package,
  RefreshCw,
} from "lucide-react";

import StatCard from "../components/common/StatCard";
import {
  LocationCodeBadge,
  MovementTypeBadge,
} from "../components/common/Badge";
import { useAuth } from "../context/auth-context";
import { getLoanSummary, getMyLoanSummary } from "../services/loans.api";
import {
  getInventoryOverview,
  getMovementHistory,
  getStockAlerts,
} from "../services/reports.api";
import type {
  InventoryMovement,
  InventoryOverview,
  StockAlertItem,
} from "../types/inventory";
import { formatRelativeTime } from "../utils/format";

interface LoanCardMetric {
  outstandingLoans: number;
  overdueLoans: number;
  totalOutstandingQuantity: number;
}

function DashboardPage() {
  const { user, isManagement } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<InventoryOverview | null>(null);
  const [alerts, setAlerts] = useState<StockAlertItem[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [loanMetrics, setLoanMetrics] = useState<LoanCardMetric | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);

  const loadDashboard = useCallback(() => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        const [overviewRes, alertsRes, movementsRes, loansRes] =
          await Promise.all([
            getInventoryOverview(),
            getStockAlerts(),
            getMovementHistory({ page: 1, limit: 6 }),
            isManagement ? getLoanSummary() : getMyLoanSummary(),
          ]);

        if (!active) return;
        setOverview(overviewRes);
        setAlerts(alertsRes);
        setMovements(movementsRes.movements);
        setError(null);

        if ("summary" in loansRes) {
          setLoanMetrics({
            outstandingLoans: loansRes.summary.outstandingLoans,
            overdueLoans: loansRes.summary.overdueLoans,
            totalOutstandingQuantity: loansRes.summary.totalOutstandingQuantity,
          });
        } else {
          setLoanMetrics({
            outstandingLoans: loansRes.outstandingLoans,
            overdueLoans: loansRes.overdueLoans,
            totalOutstandingQuantity: loansRes.totalOutstandingQuantity,
          });
        }
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchDashboard();
    return () => {
      active = false;
    };
  }, [isManagement, reloadTick]);

  const alertTotal =
    (overview?.bulkInventory.lowStockComponents ?? 0) +
    (overview?.bulkInventory.outOfStockComponents ?? 0);

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {user?.name?.split(" ")[0] ?? "Engineer"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live snapshot of your robotics lab inventory, loans, and storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadDashboard()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <Link
            to="/inventory"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
          >
            Browse Inventory
            <ArrowUpRight size={15} />
          </Link>
        </div>
      </section>

      {error && (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Active Components"
          value={overview?.components.active ?? "—"}
          description={
            overview
              ? `${overview.components.bulk} bulk · ${overview.components.individual} individual`
              : "Loading catalog..."
          }
          icon={Package}
          iconClassName="bg-blue-50 text-blue-600"
          onClick={() => navigate("/inventory")}
        />

        <StatCard
          title="Bulk Units Available"
          value={overview?.bulkInventory.totalAvailableUnits ?? "—"}
          description={
            overview
              ? `Across ${overview.categories.active} active categories`
              : "Loading stock..."
          }
          icon={Boxes}
          iconClassName="bg-emerald-50 text-emerald-600"
          accent="success"
          onClick={() => navigate("/inventory?trackingType=BULK")}
        />

        <StatCard
          title={isManagement ? "Outstanding Loans" : "My Active Loans"}
          value={loanMetrics?.outstandingLoans ?? "—"}
          description={
            loanMetrics
              ? `${loanMetrics.overdueLoans} overdue · ${loanMetrics.totalOutstandingQuantity} units out`
              : "Loading loans..."
          }
          icon={ArrowLeftRight}
          iconClassName="bg-violet-50 text-violet-600"
          accent={
            loanMetrics && loanMetrics.overdueLoans > 0 ? "danger" : "default"
          }
          onClick={() => navigate("/loans")}
        />

        <StatCard
          title="Stock Alerts"
          value={overview ? alertTotal : "—"}
          description={
            overview
              ? `${overview.bulkInventory.outOfStockComponents} out of stock · ${overview.bulkInventory.lowStockComponents} low`
              : "Checking thresholds..."
          }
          icon={AlertTriangle}
          iconClassName="bg-amber-50 text-amber-600"
          accent={alertTotal > 0 ? "warning" : "default"}
          onClick={() => navigate("/inventory?stockStatus=LOW_STOCK")}
        />
      </section>

      {/* Quick Navigation Strip */}
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          to="/storage"
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <MapPin size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Storage Map
              </p>
              <p className="text-xs text-slate-500">
                Inspect racks &amp; drawer bins
              </p>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-slate-400" />
        </Link>

        <Link
          to="/loans"
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <ArrowLeftRight size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Loans &amp; Serialized Assets
              </p>
              <p className="text-xs text-slate-500">
                Track checkouts, returns &amp; due dates
              </p>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-slate-400" />
        </Link>

        <Link
          to="/activity"
          className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition hover:border-blue-300 hover:shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <History size={19} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Audit Trail
              </p>
              <p className="text-xs text-slate-500">
                Full inventory movement history
              </p>
            </div>
          </div>
          <ArrowUpRight size={16} className="text-slate-400" />
        </Link>
      </section>

      {/* Live Feed & Stock Alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Movements */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Recent Inventory Movements
              </h2>
              <p className="text-xs text-slate-500">
                Latest checkouts, returns, stock-ins, and adjustments
              </p>
            </div>
            <Link
              to="/activity"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all
            </Link>
          </div>

          {loading && movements.length === 0 ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : movements.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No inventory movements recorded yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {movements.map((mov) => (
                <div
                  key={mov.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-slate-50/60"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <MovementTypeBadge type={mov.movementType} />
                      <span className="truncate text-sm font-semibold text-slate-900">
                        {mov.component.name}
                      </span>
                      {mov.asset && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-600">
                          {mov.asset.assetTag}
                        </span>
                      )}
                    </div>

                    <p className="mt-1 truncate text-xs text-slate-500">
                      By <span className="font-medium">{mov.performedBy.name}</span>
                      {mov.member && (
                        <>
                          {" "}
                          · Member:{" "}
                          <span className="font-medium">{mov.member.name}</span>
                        </>
                      )}
                      {mov.note ? ` · ${mov.note}` : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono text-sm font-bold tabular-nums ${
                        mov.quantityChange > 0
                          ? "text-emerald-600"
                          : mov.quantityChange < 0
                            ? "text-red-600"
                            : "text-slate-600"
                      }`}
                    >
                      {mov.quantityChange > 0
                        ? `+${mov.quantityChange}`
                        : mov.quantityChange}
                    </span>
                    <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-slate-400">
                      <Clock size={11} />
                      {formatRelativeTime(mov.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Stock Alerts
              </h2>
              <p className="text-xs text-slate-500">
                Bulk items at or below minimum
              </p>
            </div>
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 tabular-nums">
              {alerts.length}
            </span>
          </div>

          {loading && alerts.length === 0 ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              All bulk components are stocked above minimum thresholds.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {alerts.slice(0, 6).map((alert) => {
                const isOut = alert.stockStatus === "OUT_OF_STOCK";
                return (
                  <div key={alert.id} className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {alert.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {alert.code} · {alert.category.name}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                          isOut
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {isOut ? "Out" : "Low"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <LocationCodeBadge
                        code={alert.locationCode}
                        color={alert.storageDrawer?.rack.color}
                      />
                      <span className="text-xs font-semibold text-slate-700 tabular-nums">
                        {alert.quantityAvailable ?? 0} / {alert.minimumStock}{" "}
                        {alert.unit}
                      </span>
                    </div>
                  </div>
                );
              })}

              {alerts.length > 6 && (
                <div className="bg-slate-50 px-4 py-3 text-center">
                  <Link
                    to="/inventory?stockStatus=LOW_STOCK"
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View all {alerts.length} alerted items →
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default DashboardPage;
