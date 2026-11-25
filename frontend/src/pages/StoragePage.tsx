import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router";
import {
  AlertCircle,
  Archive,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Warehouse,
} from "lucide-react";

import StatCard from "../components/common/StatCard";
import Modal from "../components/common/Modal";
import EmptyState from "../components/common/EmptyState";
import {
  LocationCodeBadge,
  TrackingTypeBadge,
} from "../components/common/Badge";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import {
  createRack,
  deleteRack,
  getAllRacks,
  getDrawerById,
  restoreRack,
  retireRack,
} from "../services/storage.api";
import {
  ALLOWED_DRAWERS,
  type RackStatusFilter,
  type StorageColor,
  type StorageDrawerDetail,
  type StorageRack,
} from "../types/storage";

const STORAGE_COLORS: StorageColor[] = ["GREEN", "BLACK", "ORANGE"];

const colorConfig: Record<
  StorageColor,
  {
    label: string;
    description: string;
    badge: string;
    dot: string;
    borderAccent: string;
  }
> = {
  GREEN: {
    label: "Green Storage",
    description: "3-drawer modular racks",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    borderAccent: "border-l-emerald-500",
  },
  BLACK: {
    label: "Black Storage",
    description: "2, 3, or 4-drawer heavy racks",
    badge: "border-slate-300 bg-slate-100 text-slate-800",
    dot: "bg-slate-800",
    borderAccent: "border-l-slate-800",
  },
  ORANGE: {
    label: "Orange Storage",
    description: "2-drawer high-visibility racks",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
    borderAccent: "border-l-orange-500",
  },
};

function StoragePage() {
  const { isManagement, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [statusFilter, setStatusFilter] = useState<RackStatusFilter>("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyRackId, setBusyRackId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedDrawer, setSelectedDrawer] =
    useState<StorageDrawerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Create Rack modal state
  const [createOpen, setCreateOpen] = useState(false);
  const [newColor, setNewColor] = useState<StorageColor>("GREEN");
  const [newDrawers, setNewDrawers] = useState<number>(3);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);

  const loadRacks = useCallback(() => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchRacks() {
      try {
        const data = await getAllRacks(statusFilter);
        if (!active) return;
        setRacks(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load storage locations.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchRacks();
    return () => {
      active = false;
    };
  }, [statusFilter, reloadTick]);

  async function selectDrawer(drawerId: string) {
    setSelectedDrawerId(drawerId);
    setDrawerLoading(true);
    setDrawerError(null);
    setSelectedDrawer(null);

    try {
      const data = await getDrawerById(drawerId);
      setSelectedDrawer(data);
    } catch (err) {
      setDrawerError(
        err instanceof Error ? err.message : "Unable to load drawer.",
      );
    } finally {
      setDrawerLoading(false);
    }
  }

  function handleColorChange(color: StorageColor) {
    setNewColor(color);
    const allowed = ALLOWED_DRAWERS[color];
    if (!allowed.includes(newDrawers)) {
      setNewDrawers(allowed[0]);
    }
  }

  async function handleCreateRack(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const res = await createRack({
        color: newColor,
        drawersPerRack: newDrawers,
      });
      showToast(
        res.message ?? `Created ${res.data.locationCode}.`,
        "success",
      );
      setCreateOpen(false);
      await loadRacks();
      setExpandedRackId(res.data.id);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create storage rack.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRetireRack(rack: StorageRack) {
    setBusyRackId(rack.id);
    try {
      const res = await retireRack(rack.id);
      showToast(res.message ?? "Rack retired.", "success");
      await loadRacks();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to retire rack.",
        "error",
      );
    } finally {
      setBusyRackId(null);
    }
  }

  async function handleRestoreRack(rack: StorageRack) {
    setBusyRackId(rack.id);
    try {
      const res = await restoreRack(rack.id);
      showToast(res.message ?? "Rack restored.", "success");
      await loadRacks();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to restore rack.",
        "error",
      );
    } finally {
      setBusyRackId(null);
    }
  }

  async function handleDeleteRack(rack: StorageRack) {
    const confirmed = window.confirm(
      `Permanently delete rack ${rack.locationCode} and its empty drawers?`,
    );
    if (!confirmed) return;

    setBusyRackId(rack.id);
    try {
      const res = await deleteRack(rack.id);
      showToast(res.message ?? "Rack deleted.", "success");
      if (expandedRackId === rack.id) setExpandedRackId(null);
      await loadRacks();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to delete rack.",
        "error",
      );
    } finally {
      setBusyRackId(null);
    }
  }

  const filteredRacks = useMemo(() => {
    const searchTerm = search.trim().toLowerCase();
    if (!searchTerm) return racks;

    return racks.filter((rack) => {
      const rackMatches =
        rack.locationCode.toLowerCase().includes(searchTerm) ||
        rack.color.toLowerCase().includes(searchTerm);

      const drawerMatches = rack.drawers.some((drawer) => {
        const locationMatches = drawer.locationCode
          .toLowerCase()
          .includes(searchTerm);

        const componentMatches = drawer.components.some(
          (component) =>
            component.name.toLowerCase().includes(searchTerm) ||
            component.code.toLowerCase().includes(searchTerm),
        );

        return locationMatches || componentMatches;
      });

      return rackMatches || drawerMatches;
    });
  }, [racks, search]);

  const groupedRacks = STORAGE_COLORS.map((color) => ({
    color,
    racks: filteredRacks.filter((rack) => rack.color === color),
  })).filter((group) => group.racks.length > 0);

  const totalRacks = racks.length;
  const allDrawers = racks.flatMap((rack) => rack.drawers);
  const totalDrawers = allDrawers.length;
  const occupiedDrawers = allDrawers.filter(
    (drawer) => drawer.components.length > 0,
  ).length;
  const totalComponentTypes = allDrawers.reduce(
    (total, drawer) => total + drawer.components.length,
    0,
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Storage Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Physical color-coded racks, drawers, and bin-level inventory
            mapping.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadRacks()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {isManagement && (
            <button
              type="button"
              onClick={() => {
                setCreateError(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Add Storage Rack
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Racks"
          value={totalRacks}
          description={`Filter: ${statusFilter.toLowerCase()} units`}
          icon={Warehouse}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Total Drawers"
          value={totalDrawers}
          description="Physical compartments"
          icon={Grid3X3}
          iconClassName="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Occupied Drawers"
          value={`${occupiedDrawers} / ${totalDrawers}`}
          description={`${totalComponentTypes} component types mapped`}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
          accent="success"
        />
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search rack code (GREEN-R03-C01), drawer, component name or SKU..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["ACTIVE", "RETIRED", "ALL"] as RackStatusFilter[]).map(
              (status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    statusFilter === status
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {status === "ALL"
                    ? "All"
                    : status === "ACTIVE"
                      ? "Active"
                      : "Retired"}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      {error && racks.length === 0 ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <AlertCircle className="mx-auto text-red-600" size={24} />
          <p className="mt-2 text-sm font-medium text-red-800">{error}</p>
          <button
            type="button"
            onClick={() => void loadRacks()}
            className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700"
          >
            Try again
          </button>
        </div>
      ) : loading && racks.length === 0 ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div
              key={idx}
              className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <div className="space-y-5 xl:col-span-2">
            {groupedRacks.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                title="No storage racks match"
                description="No racks matched your search or status filter."
              />
            ) : (
              groupedRacks.map((group) => {
                const cfg = colorConfig[group.color];
                return (
                  <section
                    key={group.color}
                    className={`overflow-hidden rounded-2xl border border-slate-200/80 border-l-4 ${cfg.borderAccent} bg-white shadow-xs`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-3 w-3 rounded-full ${cfg.dot}`}
                        />
                        <div>
                          <h2 className="text-sm font-semibold text-slate-900">
                            {cfg.label}
                          </h2>
                          <p className="text-xs text-slate-500">
                            {cfg.description}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cfg.badge}`}
                      >
                        {group.racks.length}{" "}
                        {group.racks.length === 1 ? "rack" : "racks"}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {group.racks.map((rack) => {
                        const isExpanded = expandedRackId === rack.id;
                        const rackComponentCount = rack.drawers.reduce(
                          (sum, d) => sum + d.components.length,
                          0,
                        );
                        const isBusy = busyRackId === rack.id;

                        return (
                          <div key={rack.id} className="p-4 sm:px-5">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedRackId((cur) =>
                                    cur === rack.id ? null : rack.id,
                                  )
                                }
                                className="flex flex-1 items-center gap-3 text-left"
                              >
                                <span className="rounded-lg bg-slate-100 p-1.5 text-slate-500">
                                  {isExpanded ? (
                                    <ChevronDown size={16} />
                                  ) : (
                                    <ChevronRight size={16} />
                                  )}
                                </span>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="font-mono text-sm font-semibold text-slate-900">
                                      {rack.locationCode}
                                    </span>
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                        rack.status === "ACTIVE"
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-slate-200 text-slate-600"
                                      }`}
                                    >
                                      {rack.status}
                                    </span>
                                  </div>
                                  <p className="mt-0.5 text-xs text-slate-500">
                                    {rack.drawers.length} drawers ·{" "}
                                    {rackComponentCount} active component types
                                  </p>
                                </div>
                              </button>

                              {isAdmin && (
                                <div className="flex items-center gap-1.5">
                                  {rack.status === "ACTIVE" ? (
                                    <button
                                      type="button"
                                      onClick={() => void handleRetireRack(rack)}
                                      disabled={
                                        isBusy || rackComponentCount > 0
                                      }
                                      title={
                                        rackComponentCount > 0
                                          ? "Remove components before retiring"
                                          : "Retire rack"
                                      }
                                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      <Archive size={13} />
                                      Retire
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        void handleRestoreRack(rack)
                                      }
                                      disabled={isBusy}
                                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40"
                                    >
                                      <RotateCcw size={13} />
                                      Restore
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => void handleDeleteRack(rack)}
                                    disabled={isBusy || rackComponentCount > 0}
                                    title={
                                      rackComponentCount > 0
                                        ? "Cannot delete rack containing components"
                                        : "Delete empty rack"
                                    }
                                    className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </div>
                              )}
                            </div>

                            {isExpanded && (
                              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                {rack.drawers.map((drawer) => {
                                  const isSelected =
                                    selectedDrawerId === drawer.id;
                                  return (
                                    <button
                                      key={drawer.id}
                                      type="button"
                                      onClick={() =>
                                        void selectDrawer(drawer.id)
                                      }
                                      className={`rounded-xl border p-3.5 text-left transition ${
                                        isSelected
                                          ? "border-blue-500 bg-blue-50/50 ring-2 ring-blue-100"
                                          : "border-slate-200 bg-slate-50/60 hover:border-slate-300 hover:bg-white"
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <span className="font-mono text-xs font-semibold text-slate-900">
                                          D
                                          {String(drawer.drawerNumber).padStart(
                                            2,
                                            "0",
                                          )}
                                        </span>
                                        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/70 tabular-nums">
                                          {drawer.components.length} items
                                        </span>
                                      </div>

                                      <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                                        {drawer.locationCode}
                                      </p>

                                      {drawer.components.length > 0 ? (
                                        <p className="mt-2 truncate text-xs font-medium text-slate-700">
                                          {drawer.components
                                            .slice(0, 2)
                                            .map((c) => c.name)
                                            .join(", ")}
                                          {drawer.components.length > 2
                                            ? ` +${drawer.components.length - 2}`
                                            : ""}
                                        </p>
                                      ) : (
                                        <p className="mt-2 text-xs text-slate-400">
                                          Empty drawer
                                        </p>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </div>

          {/* Drawer Inspector */}
          <aside className="xl:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      Drawer Inspector
                    </h2>
                    <p className="text-xs text-slate-500">
                      Click any drawer to inspect contents
                    </p>
                  </div>
                </div>
              </div>

              {!selectedDrawerId ? (
                <div className="py-12 text-center">
                  <Boxes
                    size={28}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-xs text-slate-500">
                    Expand a rack and select a drawer to see stored components
                    and categories.
                  </p>
                </div>
              ) : drawerLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw
                    size={22}
                    className="animate-spin text-blue-600"
                  />
                  <p className="mt-3 text-xs text-slate-500">
                    Loading drawer contents...
                  </p>
                </div>
              ) : drawerError ? (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
                  {drawerError}
                </div>
              ) : selectedDrawer ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[11px] font-medium text-slate-500 uppercase">
                      Location Code
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2">
                      <LocationCodeBadge
                        code={selectedDrawer.locationCode}
                        color={selectedDrawer.rack.color}
                      />
                      <Link
                        to={`/inventory?storageDrawerId=${selectedDrawer.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                      >
                        Open in Inventory
                        <ArrowUpRight size={13} />
                      </Link>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2.5 flex items-center justify-between">
                      <h3 className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                        Stored Components ({selectedDrawer.components.length})
                      </h3>
                    </div>

                    {selectedDrawer.components.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-400">
                        This drawer has no active components assigned.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {selectedDrawer.components.map((comp) => (
                          <div
                            key={comp.id}
                            className="rounded-xl border border-slate-200/80 p-3 transition hover:bg-slate-50/70"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">
                                  {comp.name}
                                </p>
                                <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                                  {comp.code} · {comp.category.name}
                                </p>
                              </div>
                              <TrackingTypeBadge type={comp.trackingType} />
                            </div>

                            <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600">
                              <span className="inline-flex items-center gap-1">
                                <Package size={13} className="text-slate-400" />
                                {comp.trackingType === "BULK" ? (
                                  <span className="font-semibold tabular-nums">
                                    {comp.quantityAvailable ?? 0} {comp.unit}
                                  </span>
                                ) : (
                                  <span>Serialized assets</span>
                                )}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                Min: {comp.minimumStock}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </aside>
        </div>
      )}

      {/* Create Rack Modal */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Storage Rack"
        subtitle="Automatically assigns the next rack number and creates all drawers."
        size="sm"
      >
        <form onSubmit={(e) => void handleCreateRack(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Rack Color Group
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              {STORAGE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => handleColorChange(color)}
                  className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 text-xs font-semibold transition ${
                    newColor === color
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-100"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`h-3 w-3 rounded-full ${colorConfig[color].dot}`}
                  />
                  {color}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Drawers Per Rack
            </label>
            <div className="flex gap-2">
              {ALLOWED_DRAWERS[newColor].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setNewDrawers(count)}
                  className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                    newDrawers === count
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {count} drawers
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Allowed drawer counts for {newColor}:{" "}
              {ALLOWED_DRAWERS[newColor].join(", ")}.
            </p>
          </div>

          {createError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {createError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Rack"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StoragePage;
