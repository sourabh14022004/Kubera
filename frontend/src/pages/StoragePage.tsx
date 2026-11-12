
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Boxes,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Grid3X3,
  MapPin,
  Package,
  RefreshCw,
  Search,
  Warehouse,
  AlertCircle,
} from "lucide-react";

import StatCard from "../components/common/StatCard";
import { getAllRacks, getDrawerById } from "../services/storage.api";

import type {
  StorageColor,
  StorageRack,
  StorageDrawerDetail,
} from "../types/storage";

const STORAGE_COLORS: StorageColor[] = ["GREEN", "BLACK", "ORANGE"];

const colorConfig: Record<
  StorageColor,
  { label: string; description: string; styles: string; dot: string }
> = {
  GREEN: {
    label: "Green Storage",
    description: "Green storage units",
    styles: "border-emerald-200 bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  BLACK: {
    label: "Black Storage",
    description: "Black storage units",
    styles: "border-slate-300 bg-slate-100 text-slate-700",
    dot: "bg-slate-700",
  },
  ORANGE: {
    label: "Orange Storage",
    description: "Orange storage units",
    styles: "border-orange-200 bg-orange-50 text-orange-700",
    dot: "bg-orange-500",
  },
};

function StoragePage() {
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [expandedRackId, setExpandedRackId] = useState<string | null>(null);

  const [selectedDrawerId, setSelectedDrawerId] = useState<string | null>(null);
  const [selectedDrawer, setSelectedDrawer] =
    useState<StorageDrawerDetail | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  // Fetch all storage racks.
  const loadRacks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAllRacks();
      setRacks(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load storage locations.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRacks();
  }, [loadRacks]);

  // Fetch the selected drawer's detailed information.
  useEffect(() => {
    if (!selectedDrawerId) {
      setSelectedDrawer(null);
      setDrawerError(null);
      return;
    }

    let isActive = true;

    async function loadDrawer() {
      setDrawerLoading(true);
      setDrawerError(null);
      setSelectedDrawer(null);

      try {
        const data = await getDrawerById(selectedDrawerId!);

        if (isActive) {
          setSelectedDrawer(data);
        }
      } catch (err) {
        if (isActive) {
          setDrawerError(
            err instanceof Error ? err.message : "Unable to load drawer.",
          );
        }
      } finally {
        if (isActive) {
          setDrawerLoading(false);
        }
      }
    }

    void loadDrawer();

    return () => {
      isActive = false;
    };
  }, [selectedDrawerId]);

  // Search across racks, drawers and component names.
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

  // Calculate summary values from the API data.
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

  function toggleRack(rackId: string) {
    setExpandedRackId((current) => (current === rackId ? null : rackId));
  }

  function handleDrawerSelect(drawerId: string) {
    setSelectedDrawerId(drawerId);
  }

  if (loading && racks.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center">
        <RefreshCw className="animate-spin text-blue-600" size={28} />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Loading storage locations...
        </p>
      </div>
    );
  }

  if (error && racks.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
        <div className="rounded-xl bg-red-50 p-4 text-red-600">
          <AlertCircle size={28} />
        </div>

        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          Unable to load storage
        </h2>

        <p className="mt-2 max-w-md text-sm text-slate-500">{error}</p>

        <button
          onClick={() => void loadRacks()}
          className="mt-5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Storage Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Explore storage racks, drawers and component locations.
          </p>
        </div>

        <button
          onClick={() => void loadRacks()}
          disabled={loading}
          className="inline-flex w-fit items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </section>

      {/* Summary cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Racks"
          value={String(totalRacks)}
          description="Registered storage racks"
          icon={Warehouse}
          iconClassName="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Total Drawers"
          value={String(totalDrawers)}
          description="Registered storage drawers"
          icon={Grid3X3}
          iconClassName="bg-violet-50 text-violet-600"
        />

        <StatCard
          title="Occupied Drawers"
          value={`${occupiedDrawers} / ${totalDrawers}`}
          description={`${totalComponentTypes} component types stored`}
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
        />
      </section>

      {/* Search */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search racks, drawer codes or components..."
            className="w-full rounded-lg border border-slate-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </section>

      {/* Storage rack groups */}
      <section className="space-y-6">
        {groupedRacks.map((group) => {
          const config = colorConfig[group.color];

          const groupDrawers = group.racks.reduce(
            (total, rack) => total + rack.drawers.length,
            0,
          );

          return (
            <div
              key={group.color}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Storage group heading */}
              <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3">
                  <span className={`h-3.5 w-3.5 rounded-full ${config.dot}`} />

                  <div>
                    <h2 className="font-semibold text-slate-900">
                      {config.label}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {group.racks.length} racks · {groupDrawers} drawers
                    </p>
                  </div>
                </div>

                <span
                  className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${config.styles}`}
                >
                  {group.color}
                </span>
              </div>

              {/* Rack list */}
              <div className="divide-y divide-slate-100">
                {group.racks.map((rack) => {
                  const isExpanded = expandedRackId === rack.id;

                  const occupiedCount = rack.drawers.filter(
                    (drawer) => drawer.components.length > 0,
                  ).length;

                  return (
                    <div key={rack.id}>
                      <button
                        onClick={() => toggleRack(rack.id)}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="rounded-lg bg-slate-100 p-2.5 text-slate-600">
                            <Archive size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              Rack C{String(rack.rackNumber).padStart(2, "0")}
                            </p>

                            <p className="mt-1 truncate text-xs text-slate-500">
                              {rack.locationCode} · {rack.drawersPerRack}{" "}
                              drawers
                            </p>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <span className="hidden text-xs text-slate-500 sm:inline">
                            {occupiedCount} / {rack.drawers.length} occupied
                          </span>

                          {isExpanded ? (
                            <ChevronDown size={19} className="text-slate-400" />
                          ) : (
                            <ChevronRight size={19} className="text-slate-400" />
                          )}
                        </div>
                      </button>

                      {/* Expanded drawer grid */}
                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50/70 p-5">
                          <div className="mb-3 flex items-center justify-between">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                              Drawers in {rack.locationCode}
                            </p>

                            <span className="text-xs text-slate-400">
                              Select a drawer to view details
                            </span>
                          </div>

                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                            {rack.drawers.map((drawer) => {
                              const isSelected =
                                selectedDrawerId === drawer.id;

                              const hasComponents =
                                drawer.components.length > 0;

                              return (
                                <button
                                  key={drawer.id}
                                  onClick={() =>
                                    handleDrawerSelect(drawer.id)
                                  }
                                  className={`rounded-xl border p-4 text-left transition ${
                                    isSelected
                                      ? "border-blue-500 bg-blue-50 ring-2 ring-blue-100"
                                      : "border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`rounded-lg p-2 ${
                                          isSelected
                                            ? "bg-blue-100 text-blue-700"
                                            : "bg-slate-100 text-slate-600"
                                        }`}
                                      >
                                        <Grid3X3 size={17} />
                                      </div>

                                      <div>
                                        <p className="text-sm font-semibold text-slate-800">
                                          Drawer D
                                          {String(drawer.drawerNumber).padStart(
                                            2,
                                            "0",
                                          )}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-slate-400">
                                          {drawer.locationCode}
                                        </p>
                                      </div>
                                    </div>

                                    <ChevronRight
                                      size={17}
                                      className="text-slate-400"
                                    />
                                  </div>

                                  <div className="mt-4 flex items-center justify-between">
                                    <span className="text-xs text-slate-500">
                                      {drawer.components.length} component
                                      {drawer.components.length === 1
                                        ? ""
                                        : " types"}
                                    </span>

                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                        hasComponents
                                          ? "bg-emerald-50 text-emerald-700"
                                          : "bg-slate-100 text-slate-500"
                                      }`}
                                    >
                                      {hasComponents ? "Occupied" : "Empty"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {groupedRacks.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-16 text-center">
            <Package size={32} className="mx-auto text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              No storage locations found
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Try searching with a different rack, drawer or component name.
            </p>
          </div>
        )}
      </section>

      {/* Selected drawer details */}
      {selectedDrawerId && (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <div className="flex items-center gap-2">
                <MapPin size={17} className="text-blue-600" />
                <h2 className="font-semibold text-slate-900">
                  Drawer Details
                </h2>
              </div>

              {selectedDrawer && (
                <p className="mt-1 text-xs text-slate-500">
                  {selectedDrawer.locationCode}
                </p>
              )}
            </div>

            <button
              onClick={() => setSelectedDrawerId(null)}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close drawer details"
            >
              <span className="text-sm font-medium">Close</span>
            </button>
          </div>

          {drawerLoading && (
            <div className="flex items-center justify-center gap-3 p-10 text-sm text-slate-500">
              <RefreshCw size={18} className="animate-spin text-blue-600" />
              Loading drawer details...
            </div>
          )}

          {drawerError && (
            <div className="flex items-center gap-3 p-5 text-sm text-red-600">
              <AlertCircle size={18} />
              {drawerError}
            </div>
          )}

          {selectedDrawer && !drawerLoading && (
            <div className="p-5">
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Storage colour</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedDrawer.rack.color}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Rack</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    C{String(selectedDrawer.rack.rackNumber).padStart(2, "0")}
                  </p>
                </div>

                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-xs text-slate-500">Drawer</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    D{String(selectedDrawer.drawerNumber).padStart(2, "0")}
                  </p>
                </div>
              </div>

              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-800">
                  Stored Components
                </h3>
                <span className="text-xs text-slate-500">
                  {selectedDrawer.components.length} component types
                </span>
              </div>

              {selectedDrawer.components.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
                  <Boxes
                    size={28}
                    className="mx-auto text-slate-300"
                  />
                  <p className="mt-3 text-sm font-medium text-slate-700">
                    This drawer is currently empty
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Components assigned to this drawer will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[650px] text-left">
                    <thead className="bg-slate-50">
                      <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <th className="px-4 py-3">Component</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Tracking</th>
                        <th className="px-4 py-3">Available</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {selectedDrawer.components.map((component) => (
                        <tr key={component.id}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">
                              {component.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-400">
                              {component.code}
                            </p>
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-600">
                            {component.category.name}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-600">
                            {component.trackingType}
                          </td>

                          <td className="px-4 py-3 text-sm font-semibold text-slate-800">
                            {component.quantityAvailable === null
                              ? "Individual assets"
                              : `${component.quantityAvailable} ${component.unit}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default StoragePage;
