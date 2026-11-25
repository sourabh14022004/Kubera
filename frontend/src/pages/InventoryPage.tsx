import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  CheckCircle2,
  Edit3,
  Layers,
  Package,
  Plus,
  Power,
  RefreshCw,
  Search,
  SlidersHorizontal,
} from "lucide-react";

import EmptyState from "../components/common/EmptyState";
import MemberPicker from "../components/common/MemberPicker";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import {
  LocationCodeBadge,
  TrackingTypeBadge,
} from "../components/common/Badge";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import { registerAsset } from "../services/assets.api";
import {
  adjustBulkInventory,
  checkoutBulkInventory,
  stockInBulkInventory,
  writeOffBulkInventory,
} from "../services/bulk.api";
import { getAllCategories } from "../services/categories.api";
import {
  activateComponent,
  createComponent,
  deactivateComponent,
  getAllComponents,
  updateComponent,
} from "../services/components.api";
import { getAllRacks } from "../services/storage.api";
import type { Pagination as PaginationType } from "../types/api";
import type {
  ActiveStatusFilter,
  ComponentCategory,
  ComponentItem,
  StockStatusFilter,
} from "../types/inventory";
import type { StorageRack, TrackingType } from "../types/storage";
import { toLocalDateTimeInputDefault, UUID_REGEX } from "../utils/format";

type BulkActionTab = "STOCK_IN" | "CHECKOUT" | "ADJUST" | "WRITE_OFF";

function getBulkStockBadge(item: ComponentItem) {
  if (item.trackingType !== "BULK") return null;
  const qty = item.quantityAvailable ?? 0;
  if (qty === 0) {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">
        Out of stock
      </span>
    );
  }
  if (qty <= item.minimumStock) {
    return (
      <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
      In stock
    </span>
  );
}

function InventoryPage() {
  const { isManagement } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [categoryId, setCategoryId] = useState(
    searchParams.get("categoryId") ?? "",
  );
  const [trackingType, setTrackingType] = useState<TrackingType | "">(
    (searchParams.get("trackingType") as TrackingType) || "",
  );
  const [statusFilter, setStatusFilter] = useState<ActiveStatusFilter>("ACTIVE");
  const [stockStatus, setStockStatus] = useState<StockStatusFilter | "">(
    (searchParams.get("stockStatus") as StockStatusFilter) || "",
  );
  const [drawerFilter, setDrawerFilter] = useState(
    searchParams.get("storageDrawerId") ?? "",
  );
  const [page, setPage] = useState(1);

  const [components, setComponents] = useState<ComponentItem[]>([]);
  const [pagination, setPagination] = useState<PaginationType>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [racks, setRacks] = useState<StorageRack[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create / Edit component modal
  const [compModalOpen, setCompModalOpen] = useState(false);
  const [editingComp, setEditingComp] = useState<ComponentItem | null>(null);
  const [compCode, setCompCode] = useState("");
  const [compName, setCompName] = useState("");
  const [compDesc, setCompDesc] = useState("");
  const [compCategoryId, setCompCategoryId] = useState("");
  const [compTracking, setCompTracking] = useState<TrackingType>("BULK");
  const [compInitialQty, setCompInitialQty] = useState("0");
  const [compUnit, setCompUnit] = useState("pcs");
  const [compMinStock, setCompMinStock] = useState("0");
  const [compDrawerId, setCompDrawerId] = useState("");
  const [compSubmitting, setCompSubmitting] = useState(false);
  const [compFormError, setCompFormError] = useState<string | null>(null);

  // Bulk Action Modal
  const [bulkComp, setBulkComp] = useState<ComponentItem | null>(null);
  const [bulkTab, setBulkTab] = useState<BulkActionTab>("STOCK_IN");
  const [bulkQty, setBulkQty] = useState("1");
  const [bulkAdj, setBulkAdj] = useState("1");
  const [bulkMemberId, setBulkMemberId] = useState("");
  const [bulkDueAt, setBulkDueAt] = useState(() =>
    toLocalDateTimeInputDefault(7),
  );
  const [bulkIncludeDue, setBulkIncludeDue] = useState(true);
  const [bulkReason, setBulkReason] = useState<"DAMAGED" | "LOST">("DAMAGED");
  const [bulkNote, setBulkNote] = useState("");
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Register Asset Modal (for INDIVIDUAL components)
  const [assetComp, setAssetComp] = useState<ComponentItem | null>(null);
  const [assetTag, setAssetTag] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [acquiredAt, setAcquiredAt] = useState("");
  const [assetNotes, setAssetNotes] = useState("");
  const [assetSubmitting, setAssetSubmitting] = useState(false);
  const [assetError, setAssetError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    async function loadMeta() {
      try {
        const [cats, activeRacks] = await Promise.all([
          getAllCategories("ACTIVE"),
          getAllRacks("ACTIVE"),
        ]);
        if (active) {
          setCategories(cats);
          setRacks(activeRacks);
        }
      } catch {
        // Non-blocking for read list; modals will show empty selects if offline.
      }
    }
    void loadMeta();
    return () => {
      active = false;
    };
  }, []);

  const [reloadTick, setReloadTick] = useState(0);

  const loadComponents = useCallback(() => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchComponents() {
      try {
        const res = await getAllComponents({
          search: debouncedSearch || undefined,
          categoryId: categoryId || undefined,
          trackingType: trackingType || undefined,
          storageDrawerId: drawerFilter || undefined,
          status: statusFilter,
          stockStatus: stockStatus || undefined,
          page,
          limit: 20,
        });
        if (!active) return;
        setComponents(res.data);
        setPagination(res.pagination);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load components.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchComponents();
    return () => {
      active = false;
    };
  }, [
    debouncedSearch,
    categoryId,
    trackingType,
    drawerFilter,
    statusFilter,
    stockStatus,
    page,
    reloadTick,
  ]);

  const drawerOptions = useMemo(() => {
    return racks.flatMap((rack) =>
      rack.drawers.map((drawer) => ({
        id: drawer.id,
        label: drawer.locationCode,
      })),
    );
  }, [racks]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setCategoryId("");
    setTrackingType("");
    setStatusFilter("ACTIVE");
    setStockStatus("");
    setDrawerFilter("");
    setPage(1);
    setSearchParams({});
  }

  function openCreateComponent() {
    setEditingComp(null);
    setCompCode("");
    setCompName("");
    setCompDesc("");
    setCompCategoryId(categories[0]?.id ?? "");
    setCompTracking("BULK");
    setCompInitialQty("0");
    setCompUnit("pcs");
    setCompMinStock("0");
    setCompDrawerId("");
    setCompFormError(null);
    setCompModalOpen(true);
  }

  function openEditComponent(comp: ComponentItem) {
    setEditingComp(comp);
    setCompCode(comp.code);
    setCompName(comp.name);
    setCompDesc(comp.description ?? "");
    setCompCategoryId(comp.categoryId);
    setCompTracking(comp.trackingType);
    setCompUnit(comp.unit);
    setCompMinStock(String(comp.minimumStock));
    setCompDrawerId(comp.storageDrawerId ?? "");
    setCompFormError(null);
    setCompModalOpen(true);
  }

  async function handleSaveComponent(event: FormEvent) {
    event.preventDefault();
    if (!compCode.trim() || !compName.trim() || !compCategoryId) {
      setCompFormError("Code, name, and category are required.");
      return;
    }

    const minStockNum = Number(compMinStock);
    if (!Number.isInteger(minStockNum) || minStockNum < 0) {
      setCompFormError("Minimum stock must be a non-negative integer.");
      return;
    }

    setCompSubmitting(true);
    setCompFormError(null);
    try {
      if (editingComp) {
        const res = await updateComponent(editingComp.id, {
          code: compCode.trim(),
          name: compName.trim(),
          description: compDesc.trim() ? compDesc.trim() : null,
          categoryId: compCategoryId,
          unit: compUnit.trim() || "pcs",
          minimumStock: minStockNum,
          storageDrawerId: compDrawerId || null,
        });
        showToast(res.message ?? "Component updated.", "success");
      } else {
        const initQtyNum =
          compTracking === "BULK" ? Number(compInitialQty || "0") : undefined;
        if (
          initQtyNum !== undefined &&
          (!Number.isInteger(initQtyNum) || initQtyNum < 0)
        ) {
          setCompFormError("Initial quantity must be a non-negative integer.");
          setCompSubmitting(false);
          return;
        }

        const res = await createComponent({
          code: compCode.trim(),
          name: compName.trim(),
          description: compDesc.trim() || undefined,
          categoryId: compCategoryId,
          trackingType: compTracking,
          initialQuantity: compTracking === "BULK" ? initQtyNum : undefined,
          unit: compUnit.trim() || "pcs",
          minimumStock: minStockNum,
          storageDrawerId: compDrawerId || null,
        });
        showToast(res.message ?? "Component created.", "success");
      }

      setCompModalOpen(false);
      await loadComponents();
    } catch (err) {
      setCompFormError(
        err instanceof Error ? err.message : "Unable to save component.",
      );
    } finally {
      setCompSubmitting(false);
    }
  }

  async function handleToggleActive(comp: ComponentItem) {
    setBusyId(comp.id);
    try {
      const res = comp.isActive
        ? await deactivateComponent(comp.id)
        : await activateComponent(comp.id);
      showToast(res.message ?? "Component status updated.", "success");
      await loadComponents();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Action failed.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  function openBulkModal(comp: ComponentItem, tab: BulkActionTab = "STOCK_IN") {
    setBulkComp(comp);
    setBulkTab(tab);
    setBulkQty("1");
    setBulkAdj("1");
    setBulkMemberId("");
    setBulkDueAt(toLocalDateTimeInputDefault(7));
    setBulkIncludeDue(true);
    setBulkReason("DAMAGED");
    setBulkNote("");
    setBulkError(null);
  }

  async function handleBulkSubmit(event: FormEvent) {
    event.preventDefault();
    if (!bulkComp) return;

    setBulkSubmitting(true);
    setBulkError(null);

    try {
      if (bulkTab === "STOCK_IN") {
        const qty = Number(bulkQty);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Quantity must be a positive integer.");
        }
        const res = await stockInBulkInventory({
          componentId: bulkComp.id,
          quantity: qty,
          note: bulkNote.trim() || undefined,
        });
        showToast(res.message ?? "Stock added.", "success");
      } else if (bulkTab === "CHECKOUT") {
        const qty = Number(bulkQty);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Quantity must be a positive integer.");
        }
        if (!UUID_REGEX.test(bulkMemberId.trim())) {
          throw new Error("A valid member UUID is required.");
        }
        let dueIso: string | undefined;
        if (bulkIncludeDue && bulkDueAt) {
          const ms = Date.parse(bulkDueAt);
          if (Number.isNaN(ms) || ms <= Date.now()) {
            throw new Error("Due date must be a valid future date.");
          }
          dueIso = new Date(ms).toISOString();
        }
        const res = await checkoutBulkInventory({
          componentId: bulkComp.id,
          memberId: bulkMemberId.trim(),
          quantity: qty,
          dueAt: dueIso,
          note: bulkNote.trim() || undefined,
        });
        showToast(res.message ?? "Checked out successfully.", "success");
      } else if (bulkTab === "ADJUST") {
        const adj = Number(bulkAdj);
        if (!Number.isSafeInteger(adj) || adj === 0) {
          throw new Error("Adjustment must be a non-zero integer.");
        }
        if (!bulkNote.trim()) {
          throw new Error("A reason note is required for stock adjustments.");
        }
        const res = await adjustBulkInventory({
          componentId: bulkComp.id,
          adjustment: adj,
          note: bulkNote.trim(),
        });
        showToast(res.message ?? "Stock adjusted.", "success");
      } else {
        const qty = Number(bulkQty);
        if (!Number.isInteger(qty) || qty <= 0) {
          throw new Error("Quantity must be a positive integer.");
        }
        if (!bulkNote.trim()) {
          throw new Error("A description note is required for write-offs.");
        }
        const res = await writeOffBulkInventory({
          componentId: bulkComp.id,
          quantity: qty,
          reason: bulkReason,
          note: bulkNote.trim(),
        });
        showToast(res.message ?? "Inventory written off.", "success");
      }

      setBulkComp(null);
      await loadComponents();
    } catch (err) {
      setBulkError(
        err instanceof Error ? err.message : "Bulk operation failed.",
      );
    } finally {
      setBulkSubmitting(false);
    }
  }

  function openRegisterAsset(comp: ComponentItem) {
    setAssetComp(comp);
    setAssetTag("");
    setSerialNumber("");
    setAcquiredAt("");
    setAssetNotes("");
    setAssetError(null);
  }

  async function handleRegisterAsset(event: FormEvent) {
    event.preventDefault();
    if (!assetComp) return;
    if (!assetTag.trim()) {
      setAssetError("Asset tag is required.");
      return;
    }

    setAssetSubmitting(true);
    setAssetError(null);
    try {
      const res = await registerAsset({
        componentId: assetComp.id,
        assetTag: assetTag.trim(),
        serialNumber: serialNumber.trim() || undefined,
        acquiredAt: acquiredAt
          ? new Date(acquiredAt).toISOString()
          : undefined,
        notes: assetNotes.trim() || undefined,
      });
      showToast(res.message ?? "Asset registered.", "success");
      setAssetComp(null);
      await loadComponents();
    } catch (err) {
      setAssetError(
        err instanceof Error ? err.message : "Failed to register asset.",
      );
    } finally {
      setAssetSubmitting(false);
    }
  }

  const hasActiveFilters = Boolean(
    search ||
      categoryId ||
      trackingType ||
      stockStatus ||
      drawerFilter ||
      statusFilter !== "ACTIVE",
  );

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search bulk quantities, serialized component definitions, and bin
            locations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadComponents()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {isManagement && (
            <button
              type="button"
              onClick={openCreateComponent}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus size={16} />
              New Component
            </button>
          )}
        </div>
      </section>

      {/* Filters */}
      <section className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search
              size={16}
              className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or code (e.g. ARD-UNO)..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-3"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>

          <select
            value={trackingType}
            onChange={(e) => {
              const val = e.target.value as TrackingType | "";
              setTrackingType(val);
              if (val === "INDIVIDUAL") setStockStatus("");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-2"
          >
            <option value="">All Tracking</option>
            <option value="BULK">Bulk</option>
            <option value="INDIVIDUAL">Individual</option>
          </select>

          <select
            value={stockStatus}
            onChange={(e) => {
              setStockStatus(e.target.value as StockStatusFilter | "");
              setPage(1);
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-3"
          >
            <option value="">All Stock Levels</option>
            <option value="IN_STOCK">Bulk: In Stock</option>
            <option value="LOW_STOCK">Bulk: Low Stock</option>
            <option value="OUT_OF_STOCK">Bulk: Out of Stock</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <SlidersHorizontal size={13} />
              Status:
            </span>
            {(["ACTIVE", "INACTIVE", "ALL"] as ActiveStatusFilter[]).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    statusFilter === st
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {st === "ALL"
                    ? "All"
                    : st === "ACTIVE"
                      ? "Active"
                      : "Inactive"}
                </button>
              ),
            )}

            {drawerFilter && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                Filtered by drawer
                <button
                  type="button"
                  onClick={() => setDrawerFilter("")}
                  className="font-bold hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            )}
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset filters
            </button>
          )}
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white p-6">
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-12 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
          </div>
        </div>
      ) : components.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No components found"
          description="Adjust your search filters or create a new component to populate your lab inventory."
        />
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                  <th className="px-5 py-3.5">Component</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Tracking</th>
                  <th className="px-4 py-3.5">Stock / Assets</th>
                  <th className="px-4 py-3.5">Location</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {components.map((item) => {
                  const isBusy = busyId === item.id;
                  const assetCount = item._count?.assets ?? 0;

                  return (
                    <tr
                      key={item.id}
                      className="transition-colors hover:bg-slate-50/70"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                            {item.trackingType === "BULK" ? (
                              <Boxes size={17} />
                            ) : (
                              <Layers size={17} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900">
                              {item.name}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-slate-500">
                              {item.code}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-xs font-medium text-slate-700">
                        {item.category.name}
                      </td>

                      <td className="px-4 py-4">
                        <TrackingTypeBadge type={item.trackingType} />
                      </td>

                      <td className="px-4 py-4">
                        {item.trackingType === "BULK" ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 tabular-nums">
                                {item.quantityAvailable ?? 0} {item.unit}
                              </span>
                              {getBulkStockBadge(item)}
                            </div>
                            <p className="text-[11px] text-slate-400 tabular-nums">
                              Min stock: {item.minimumStock} {item.unit}
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <Link
                              to={`/loans?tab=assets&componentId=${item.id}`}
                              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700 tabular-nums"
                            >
                              {assetCount}{" "}
                              {assetCount === 1 ? "asset" : "assets"}
                              <ArrowUpRight size={13} />
                            </Link>
                            <p className="text-[11px] text-slate-400">
                              Min threshold: {item.minimumStock}
                            </p>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-4">
                        <LocationCodeBadge
                          code={item.locationCode}
                          color={item.storageDrawer?.rack.color}
                        />
                      </td>

                      <td className="px-4 py-4">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 size={14} />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                            <AlertTriangle size={14} />
                            Inactive
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManagement && item.isActive && (
                            <>
                              {item.trackingType === "BULK" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openBulkModal(item, "STOCK_IN")
                                  }
                                  className="rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                >
                                  Stock / Loan
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => openRegisterAsset(item)}
                                  className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                                >
                                  + Asset
                                </button>
                              )}
                            </>
                          )}

                          {isManagement && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditComponent(item)}
                                disabled={isBusy}
                                title="Edit component"
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                              >
                                <Edit3 size={15} />
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleToggleActive(item)}
                                disabled={isBusy}
                                title={
                                  item.isActive ? "Deactivate" : "Activate"
                                }
                                className={`rounded-lg p-1.5 transition disabled:opacity-40 ${
                                  item.isActive
                                    ? "text-amber-600 hover:bg-amber-50"
                                    : "text-emerald-600 hover:bg-emerald-50"
                                }`}
                              >
                                <Power size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </section>
      )}

      {/* Create / Edit Component Modal */}
      <Modal
        open={compModalOpen}
        onClose={() => setCompModalOpen(false)}
        title={editingComp ? "Edit Component" : "Create Component"}
        subtitle={
          editingComp
            ? `Updating ${editingComp.code}`
            : "Register a new bulk or individual component definition."
        }
        size="lg"
      >
        <form
          onSubmit={(e) => void handleSaveComponent(e)}
          className="space-y-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Component Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={compCode}
                onChange={(e) => setCompCode(e.target.value)}
                placeholder="e.g., ARD-UNO-R3"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={compName}
                onChange={(e) => setCompName(e.target.value)}
                placeholder="e.g., Arduino Uno R3"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={compCategoryId}
                onChange={(e) => setCompCategoryId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              >
                <option value="">Select category...</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Storage Drawer
              </label>
              <select
                value={compDrawerId}
                onChange={(e) => setCompDrawerId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 font-mono text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="">Unassigned</option>
                {drawerOptions.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!editingComp && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Tracking Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["BULK", "INDIVIDUAL"] as TrackingType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setCompTracking(type)}
                    className={`rounded-xl border p-3 text-left transition ${
                      compTracking === type
                        ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900">
                      {type === "BULK" ? "Bulk Quantity" : "Individual Assets"}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {type === "BULK"
                        ? "Track total count (resistors, wires, sensors)"
                        : "Track each physical unit with an asset tag"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-3">
            {!editingComp && compTracking === "BULK" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Initial Quantity
                </label>
                <input
                  type="number"
                  min={0}
                  value={compInitialQty}
                  onChange={(e) => setCompInitialQty(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Unit
              </label>
              <input
                type="text"
                value={compUnit}
                onChange={(e) => setCompUnit(e.target.value)}
                placeholder="pcs"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Minimum Stock Alert
              </label>
              <input
                type="number"
                min={0}
                value={compMinStock}
                onChange={(e) => setCompMinStock(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={2}
              value={compDesc}
              onChange={(e) => setCompDesc(e.target.value)}
              placeholder="Specs, voltage rating, or notes..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {compFormError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {compFormError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setCompModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={compSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {compSubmitting
                ? "Saving..."
                : editingComp
                  ? "Save Changes"
                  : "Create Component"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Stock Operations Modal */}
      <Modal
        open={Boolean(bulkComp)}
        onClose={() => setBulkComp(null)}
        title={bulkComp ? `Bulk Operations — ${bulkComp.name}` : ""}
        subtitle={
          bulkComp
            ? `Available: ${bulkComp.quantityAvailable ?? 0} ${bulkComp.unit} (${bulkComp.code})`
            : undefined
        }
        size="md"
      >
        {bulkComp && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-slate-100 p-1">
              {(
                [
                  { key: "STOCK_IN", label: "Stock In" },
                  { key: "CHECKOUT", label: "Checkout" },
                  { key: "ADJUST", label: "Adjust" },
                  { key: "WRITE_OFF", label: "Write Off" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setBulkTab(tab.key);
                    setBulkError(null);
                  }}
                  className={`rounded-lg py-2 text-xs font-semibold transition ${
                    bulkTab === tab.key
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => void handleBulkSubmit(e)}
              className="space-y-4"
            >
              {bulkTab === "CHECKOUT" && (
                <MemberPicker
                  value={bulkMemberId}
                  onChange={setBulkMemberId}
                />
              )}

              {bulkTab === "ADJUST" ? (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Quantity Delta (positive or negative non-zero integer){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={bulkAdj}
                    onChange={(e) => setBulkAdj(e.target.value)}
                    placeholder="e.g. -5 or 10"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Quantity ({bulkComp.unit}){" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={bulkQty}
                    onChange={(e) => setBulkQty(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    required
                  />
                </div>
              )}

              {bulkTab === "CHECKOUT" && (
                <div className="space-y-2">
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={bulkIncludeDue}
                      onChange={(e) => setBulkIncludeDue(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Set expected return date
                  </label>
                  {bulkIncludeDue && (
                    <input
                      type="datetime-local"
                      value={bulkDueAt}
                      onChange={(e) => setBulkDueAt(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  )}
                </div>
              )}

              {bulkTab === "WRITE_OFF" && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Write-Off Reason <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    {(["DAMAGED", "LOST"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setBulkReason(r)}
                        className={`rounded-xl border py-2.5 text-xs font-semibold transition ${
                          bulkReason === r
                            ? "border-red-500 bg-red-50 text-red-700"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Note / Reason{" "}
                  {(bulkTab === "ADJUST" || bulkTab === "WRITE_OFF") && (
                    <span className="text-red-500">*</span>
                  )}
                </label>
                <textarea
                  rows={2}
                  value={bulkNote}
                  onChange={(e) => setBulkNote(e.target.value)}
                  required={bulkTab === "ADJUST" || bulkTab === "WRITE_OFF"}
                  placeholder={
                    bulkTab === "ADJUST"
                      ? "Required: e.g., Cycle count correction"
                      : bulkTab === "WRITE_OFF"
                        ? "Required: explain damage or loss"
                        : "Optional note..."
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              {bulkError && (
                <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                  {bulkError}
                </p>
              )}

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setBulkComp(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bulkSubmitting}
                  className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {bulkSubmitting ? "Processing..." : "Confirm"}
                </button>
              </div>
            </form>
          </div>
        )}
      </Modal>

      {/* Register Physical Asset Modal */}
      <Modal
        open={Boolean(assetComp)}
        onClose={() => setAssetComp(null)}
        title={assetComp ? `Register Asset — ${assetComp.name}` : ""}
        subtitle="Create a serialized unit tracked by unique asset tag."
        size="md"
      >
        <form
          onSubmit={(e) => void handleRegisterAsset(e)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Asset Tag <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={assetTag}
              onChange={(e) => setAssetTag(e.target.value)}
              placeholder="e.g., AST-ARD-001"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Serial Number
              </label>
              <input
                type="text"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
                placeholder="Optional manufacturer S/N"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Acquired Date
              </label>
              <input
                type="date"
                value={acquiredAt}
                onChange={(e) => setAcquiredAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              rows={2}
              value={assetNotes}
              onChange={(e) => setAssetNotes(e.target.value)}
              placeholder="Condition or kit notes..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {assetError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {assetError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setAssetComp(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={assetSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {assetSubmitting ? "Registering..." : "Register Asset"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default InventoryPage;
