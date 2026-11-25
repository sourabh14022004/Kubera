import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import {
  AlertCircle,
  ArrowLeftRight,
  CalendarClock,
  CheckCircle2,
  Cpu,
  Eye,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";

import EmptyState from "../components/common/EmptyState";
import MemberPicker from "../components/common/MemberPicker";
import Modal from "../components/common/Modal";
import Pagination from "../components/common/Pagination";
import StatCard from "../components/common/StatCard";
import {
  AssetStatusBadge,
  LoanStatusBadge,
  LocationCodeBadge,
  MovementTypeBadge,
} from "../components/common/Badge";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import {
  checkoutAsset,
  getAllAssets,
  registerAsset,
  returnAsset,
} from "../services/assets.api";
import { returnBulkInventory, writeOffBulkLoan } from "../services/bulk.api";
import { getAllComponents } from "../services/components.api";
import {
  getAllLoans,
  getLoanById,
  getLoanSummary,
  getMyLoans,
  getMyLoanSummary,
  updateLoanDueDate,
} from "../services/loans.api";
import type { Pagination as PaginationType } from "../types/api";
import type {
  AssetItem,
  AssetStatusFilter,
  ComponentItem,
  LoanDetail,
  LoanItem,
  LoanListStatusFilter,
  LoanSummary,
  MemberLoanSummary,
} from "../types/inventory";
import {
  formatDate,
  formatDateTime,
  toLocalDateTimeInputDefault,
  UUID_REGEX,
} from "../utils/format";

type WorkspaceTab = "my-loans" | "all-loans" | "assets";

function AssetsAndLoansPage() {
  const { isManagement } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get("tab") as WorkspaceTab) || "my-loans";
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(
    initialTab === "all-loans" && !isManagement ? "my-loans" : initialTab,
  );

  // Loans state
  const [loanSearch, setLoanSearch] = useState("");
  const [debouncedLoanSearch, setDebouncedLoanSearch] = useState("");
  const [loanStatus, setLoanStatus] = useState<LoanListStatusFilter>("ALL");
  const [loanPage, setLoanPage] = useState(1);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loanPagination, setLoanPagination] = useState<PaginationType>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [mySummary, setMySummary] = useState<MemberLoanSummary | null>(null);
  const [clubSummary, setClubSummary] = useState<LoanSummary | null>(null);
  const [loansLoading, setLoansLoading] = useState(true);
  const [loansError, setLoansError] = useState<string | null>(null);

  // Assets state
  const [assetSearch, setAssetSearch] = useState("");
  const [debouncedAssetSearch, setDebouncedAssetSearch] = useState("");
  const [assetStatus, setAssetStatus] = useState<AssetStatusFilter>("ALL");
  const [assetComponentFilter, setAssetComponentFilter] = useState(
    searchParams.get("componentId") ?? "",
  );
  const [assetPage, setAssetPage] = useState(1);
  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [assetPagination, setAssetPagination] = useState<PaginationType>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [individualComponents, setIndividualComponents] = useState<
    ComponentItem[]
  >([]);
  const [assetsLoading, setAssetsLoading] = useState(true);
  const [assetsError, setAssetsError] = useState<string | null>(null);

  // Loan Detail Modal
  const [detailLoan, setDetailLoan] = useState<LoanDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Extend Due Date Modal
  const [dueModalLoan, setDueModalLoan] = useState<LoanItem | null>(null);
  const [dueDateInput, setDueDateInput] = useState("");
  const [dueSubmitting, setDueSubmitting] = useState(false);
  const [dueError, setDueError] = useState<string | null>(null);

  // Bulk Return / Write-off Modal
  const [bulkLoanAction, setBulkLoanAction] = useState<{
    loan: LoanItem;
    mode: "RETURN" | "WRITE_OFF";
  } | null>(null);
  const [bulkLoanQty, setBulkLoanQty] = useState("1");
  const [bulkLoanReason, setBulkLoanReason] = useState<"DAMAGED" | "LOST">(
    "DAMAGED",
  );
  const [bulkLoanNote, setBulkLoanNote] = useState("");
  const [bulkLoanSubmitting, setBulkLoanSubmitting] = useState(false);
  const [bulkLoanError, setBulkLoanError] = useState<string | null>(null);

  // Asset Checkout / Return / Register Modals
  const [checkoutTarget, setCheckoutTarget] = useState<AssetItem | null>(null);
  const [checkoutMemberId, setCheckoutMemberId] = useState("");
  const [checkoutDueAt, setCheckoutDueAt] = useState(() =>
    toLocalDateTimeInputDefault(7),
  );
  const [checkoutIncludeDue, setCheckoutIncludeDue] = useState(true);
  const [checkoutNote, setCheckoutNote] = useState("");
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const [returnTarget, setReturnTarget] = useState<{
    assetId: string;
    assetTag: string;
  } | null>(null);
  const [returnNote, setReturnNote] = useState("");
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  const [regOpen, setRegOpen] = useState(false);
  const [regCompId, setRegCompId] = useState("");
  const [regTag, setRegTag] = useState("");
  const [regSerial, setRegSerial] = useState("");
  const [regAcquiredAt, setRegAcquiredAt] = useState("");
  const [regNotes, setRegNotes] = useState("");
  const [regSubmitting, setRegSubmitting] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedLoanSearch(loanSearch.trim());
      setLoanPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [loanSearch]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedAssetSearch(assetSearch.trim());
      setAssetPage(1);
    }, 300);
    return () => window.clearTimeout(t);
  }, [assetSearch]);

  const [loansReloadTick, setLoansReloadTick] = useState(0);
  const [assetsReloadTick, setAssetsReloadTick] = useState(0);

  const loadLoans = useCallback(() => {
    setLoansLoading(true);
    setLoansReloadTick((t) => t + 1);
  }, []);

  const loadAssets = useCallback(() => {
    setAssetsLoading(true);
    setAssetsReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (activeTab === "assets") return;
    let active = true;

    async function fetchLoans() {
      try {
        if (activeTab === "all-loans" && isManagement) {
          const [listRes, summaryRes] = await Promise.all([
            getAllLoans({
              search: debouncedLoanSearch || undefined,
              status: loanStatus,
              page: loanPage,
              limit: 20,
            }),
            getLoanSummary(),
          ]);
          if (!active) return;
          setLoans(listRes.data);
          setLoanPagination(listRes.pagination);
          setClubSummary(summaryRes);
        } else {
          const [listRes, summaryRes] = await Promise.all([
            getMyLoans({
              search: debouncedLoanSearch || undefined,
              status: loanStatus,
              page: loanPage,
              limit: 20,
            }),
            getMyLoanSummary(),
          ]);
          if (!active) return;
          setLoans(listRes.data);
          setLoanPagination(listRes.pagination);
          setMySummary(summaryRes);
        }
        setLoansError(null);
      } catch (err) {
        if (!active) return;
        setLoansError(
          err instanceof Error ? err.message : "Unable to load loans.",
        );
      } finally {
        if (active) setLoansLoading(false);
      }
    }

    void fetchLoans();
    return () => {
      active = false;
    };
  }, [
    activeTab,
    isManagement,
    debouncedLoanSearch,
    loanStatus,
    loanPage,
    loansReloadTick,
  ]);

  useEffect(() => {
    if (activeTab !== "assets") return;
    let active = true;

    async function fetchAssets() {
      try {
        const [assetsRes, compsRes] = await Promise.all([
          getAllAssets({
            search: debouncedAssetSearch || undefined,
            componentId: assetComponentFilter || undefined,
            status: assetStatus,
            page: assetPage,
            limit: 20,
          }),
          getAllComponents({
            trackingType: "INDIVIDUAL",
            status: "ACTIVE",
            page: 1,
            limit: 100,
          }),
        ]);
        if (!active) return;
        setAssets(assetsRes.data);
        setAssetPagination(assetsRes.pagination);
        setIndividualComponents(compsRes.data);
        setAssetsError(null);
      } catch (err) {
        if (!active) return;
        setAssetsError(
          err instanceof Error ? err.message : "Unable to load assets.",
        );
      } finally {
        if (active) setAssetsLoading(false);
      }
    }

    void fetchAssets();
    return () => {
      active = false;
    };
  }, [
    activeTab,
    debouncedAssetSearch,
    assetComponentFilter,
    assetStatus,
    assetPage,
    assetsReloadTick,
  ]);

  function switchTab(tab: WorkspaceTab) {
    setActiveTab(tab);
    setSearchParams({ tab });
  }

  async function openLoanDetail(loanId: string) {
    setDetailLoading(true);
    setDetailLoan(null);
    try {
      const detail = await getLoanById(loanId);
      setDetailLoan(detail);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load loan details.",
        "error",
      );
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleUpdateDueDate(event: FormEvent) {
    event.preventDefault();
    if (!dueModalLoan) return;
    const ms = Date.parse(dueDateInput);
    if (Number.isNaN(ms) || ms <= Date.now()) {
      setDueError("Due date must be a valid future date.");
      return;
    }

    setDueSubmitting(true);
    setDueError(null);
    try {
      const res = await updateLoanDueDate(
        dueModalLoan.id,
        new Date(ms).toISOString(),
      );
      showToast(res.message ?? "Due date updated.", "success");
      setDueModalLoan(null);
      await loadLoans();
    } catch (err) {
      setDueError(
        err instanceof Error ? err.message : "Unable to update due date.",
      );
    } finally {
      setDueSubmitting(false);
    }
  }

  async function handleBulkLoanSubmit(event: FormEvent) {
    event.preventDefault();
    if (!bulkLoanAction) return;
    const qty = Number(bulkLoanQty);
    if (!Number.isInteger(qty) || qty <= 0) {
      setBulkLoanError("Quantity must be a positive integer.");
      return;
    }

    setBulkLoanSubmitting(true);
    setBulkLoanError(null);
    try {
      if (bulkLoanAction.mode === "RETURN") {
        const res = await returnBulkInventory({
          loanId: bulkLoanAction.loan.id,
          quantity: qty,
          note: bulkLoanNote.trim() || undefined,
        });
        showToast(res.message ?? "Bulk inventory returned.", "success");
      } else {
        if (!bulkLoanNote.trim()) {
          throw new Error("A reason description is required for write-offs.");
        }
        const res = await writeOffBulkLoan({
          loanId: bulkLoanAction.loan.id,
          quantity: qty,
          reason: bulkLoanReason,
          note: bulkLoanNote.trim(),
        });
        showToast(res.message ?? "Loan quantity written off.", "success");
      }
      setBulkLoanAction(null);
      await loadLoans();
    } catch (err) {
      setBulkLoanError(
        err instanceof Error ? err.message : "Operation failed.",
      );
    } finally {
      setBulkLoanSubmitting(false);
    }
  }

  async function handleCheckoutAsset(event: FormEvent) {
    event.preventDefault();
    if (!checkoutTarget) return;
    if (!UUID_REGEX.test(checkoutMemberId.trim())) {
      setCheckoutError("A valid member UUID is required.");
      return;
    }

    let dueIso: string | undefined;
    if (checkoutIncludeDue && checkoutDueAt) {
      const ms = Date.parse(checkoutDueAt);
      if (Number.isNaN(ms) || ms <= Date.now()) {
        setCheckoutError("Due date must be a valid future date.");
        return;
      }
      dueIso = new Date(ms).toISOString();
    }

    setCheckoutSubmitting(true);
    setCheckoutError(null);
    try {
      const res = await checkoutAsset(checkoutTarget.id, {
        memberId: checkoutMemberId.trim(),
        dueAt: dueIso,
        note: checkoutNote.trim() || undefined,
      });
      showToast(res.message ?? "Asset checked out.", "success");
      setCheckoutTarget(null);
      await loadAssets();
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout failed.",
      );
    } finally {
      setCheckoutSubmitting(false);
    }
  }

  async function handleReturnAsset(event: FormEvent) {
    event.preventDefault();
    if (!returnTarget) return;

    setReturnSubmitting(true);
    setReturnError(null);
    try {
      const res = await returnAsset(returnTarget.assetId, {
        note: returnNote.trim() || undefined,
      });
      showToast(res.message ?? "Asset returned.", "success");
      setReturnTarget(null);
      if (activeTab === "assets") {
        await loadAssets();
      } else {
        await loadLoans();
      }
    } catch (err) {
      setReturnError(err instanceof Error ? err.message : "Return failed.");
    } finally {
      setReturnSubmitting(false);
    }
  }

  async function handleRegisterAsset(event: FormEvent) {
    event.preventDefault();
    if (!regCompId || !regTag.trim()) {
      setRegError("Component and asset tag are required.");
      return;
    }

    setRegSubmitting(true);
    setRegError(null);
    try {
      const res = await registerAsset({
        componentId: regCompId,
        assetTag: regTag.trim(),
        serialNumber: regSerial.trim() || undefined,
        acquiredAt: regAcquiredAt
          ? new Date(regAcquiredAt).toISOString()
          : undefined,
        notes: regNotes.trim() || undefined,
      });
      showToast(res.message ?? "Asset registered.", "success");
      setRegOpen(false);
      await loadAssets();
    } catch (err) {
      setRegError(
        err instanceof Error ? err.message : "Failed to register asset.",
      );
    } finally {
      setRegSubmitting(false);
    }
  }

  const activeSummary =
    activeTab === "all-loans" && clubSummary
      ? clubSummary
      : mySummary?.summary ?? null;

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Assets &amp; Loans
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage serialized equipment units and member borrowing records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() =>
              void (activeTab === "assets" ? loadAssets() : loadLoans())
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <RefreshCw
              size={15}
              className={
                (activeTab === "assets" ? assetsLoading : loansLoading)
                  ? "animate-spin"
                  : ""
              }
            />
            Refresh
          </button>

          {activeTab === "assets" && isManagement && (
            <button
              type="button"
              onClick={() => {
                setRegCompId(
                  assetComponentFilter || individualComponents[0]?.id || "",
                );
                setRegTag("");
                setRegSerial("");
                setRegAcquiredAt("");
                setRegNotes("");
                setRegError(null);
                setRegOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus size={16} />
              Register Asset
            </button>
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-xs">
        <button
          type="button"
          onClick={() => switchTab("my-loans")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "my-loans"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          My Loans
        </button>
        {isManagement && (
          <button
            type="button"
            onClick={() => switchTab("all-loans")}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              activeTab === "all-loans"
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Club Loans
          </button>
        )}
        <button
          type="button"
          onClick={() => switchTab("assets")}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === "assets"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Serialized Assets
        </button>
      </div>

      {activeTab !== "assets" ? (
        <>
          {/* Summary */}
          {activeSummary && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Loans"
                value={activeSummary.totalLoans}
                description="All recorded checkouts"
                icon={ArrowLeftRight}
                iconClassName="bg-blue-50 text-blue-600"
              />
              <StatCard
                title="Outstanding"
                value={activeSummary.outstandingLoans}
                description={`${activeSummary.totalOutstandingQuantity} units currently out`}
                icon={CalendarClock}
                iconClassName="bg-indigo-50 text-indigo-600"
              />
              <StatCard
                title="Overdue"
                value={activeSummary.overdueLoans}
                description="Past expected return date"
                icon={AlertCircle}
                iconClassName="bg-red-50 text-red-600"
                accent={activeSummary.overdueLoans > 0 ? "danger" : "default"}
              />
              <StatCard
                title="Closed"
                value={activeSummary.closedLoans}
                description="Returned or settled"
                icon={CheckCircle2}
                iconClassName="bg-emerald-50 text-emerald-600"
                accent="success"
              />
            </section>
          )}

          {/* Loan filters */}
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={loanSearch}
                  onChange={(e) => setLoanSearch(e.target.value)}
                  placeholder="Search member, component code/name, or asset tag..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    "ALL",
                    "OUTSTANDING",
                    "OVERDUE",
                    "CLOSED",
                  ] as LoanListStatusFilter[]
                ).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setLoanStatus(st);
                      setLoanPage(1);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                      loanStatus === st
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {st === "ALL"
                      ? "All"
                      : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {loansError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {loansError}
            </div>
          ) : loansLoading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : loans.length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="No loans found"
              description="No borrowing records match your current filter."
            />
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="px-5 py-3.5">Item</th>
                      <th className="px-4 py-3.5">Borrower</th>
                      <th className="px-4 py-3.5">Quantity</th>
                      <th className="px-4 py-3.5">Checked Out / Due</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {loans.map((loan) => {
                      const isOpen = loan.outstandingQuantity > 0;
                      const isBulkLoan = !loan.assetId;

                      return (
                        <tr
                          key={loan.id}
                          className="transition-colors hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <p className="font-semibold text-slate-900">
                              {loan.component.name}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-mono text-xs text-slate-500">
                              <span>{loan.component.code}</span>
                              {loan.asset && (
                                <span className="rounded bg-sky-50 px-1.5 py-0.5 text-[11px] font-semibold text-sky-700">
                                  {loan.asset.assetTag}
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-800">
                              {loan.member.name}
                            </p>
                            <p className="text-xs text-slate-400">
                              {loan.member.email}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-xs tabular-nums">
                            <p className="font-semibold text-slate-900">
                              {loan.outstandingQuantity} outstanding
                            </p>
                            <p className="text-slate-400">
                              {loan.quantityBorrowed} borrowed ·{" "}
                              {loan.quantityReturned} ret
                              {loan.quantityWrittenOff > 0
                                ? ` · ${loan.quantityWrittenOff} w/o`
                                : ""}
                            </p>
                          </td>

                          <td className="px-4 py-4 text-xs">
                            <p className="text-slate-700">
                              Out: {formatDate(loan.checkedOutAt)}
                            </p>
                            <p
                              className={
                                loan.loanStatus === "OVERDUE"
                                  ? "font-semibold text-red-600"
                                  : "text-slate-400"
                              }
                            >
                              Due: {formatDate(loan.dueAt)}
                            </p>
                          </td>

                          <td className="px-4 py-4">
                            <LoanStatusBadge status={loan.loanStatus} />
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => void openLoanDetail(loan.id)}
                                title="View loan timeline"
                                className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                              >
                                <Eye size={15} />
                              </button>

                              {isManagement && isOpen && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setDueModalLoan(loan);
                                      setDueDateInput(
                                        toLocalDateTimeInputDefault(7),
                                      );
                                      setDueError(null);
                                    }}
                                    title="Update due date"
                                    className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                                  >
                                    <CalendarClock size={15} />
                                  </button>

                                  {isBulkLoan ? (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBulkLoanAction({
                                            loan,
                                            mode: "RETURN",
                                          });
                                          setBulkLoanQty(
                                            String(loan.outstandingQuantity),
                                          );
                                          setBulkLoanNote("");
                                          setBulkLoanError(null);
                                        }}
                                        className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        Return
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setBulkLoanAction({
                                            loan,
                                            mode: "WRITE_OFF",
                                          });
                                          setBulkLoanQty("1");
                                          setBulkLoanReason("DAMAGED");
                                          setBulkLoanNote("");
                                          setBulkLoanError(null);
                                        }}
                                        className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                                      >
                                        Write Off
                                      </button>
                                    </>
                                  ) : (
                                    loan.asset && (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReturnTarget({
                                            assetId: loan.asset!.id,
                                            assetTag: loan.asset!.assetTag,
                                          });
                                          setReturnNote("");
                                          setReturnError(null);
                                        }}
                                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                      >
                                        <RotateCcw size={12} />
                                        Return
                                      </button>
                                    )
                                  )}
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
              <Pagination
                pagination={loanPagination}
                onPageChange={setLoanPage}
              />
            </section>
          )}
        </>
      ) : (
        /* Serialized Assets Tab */
        <>
          <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
              <div className="relative md:col-span-5">
                <Search
                  size={16}
                  className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="text"
                  value={assetSearch}
                  onChange={(e) => setAssetSearch(e.target.value)}
                  placeholder="Search asset tag (AST-ARD-001) or serial number..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <select
                value={assetComponentFilter}
                onChange={(e) => {
                  setAssetComponentFilter(e.target.value);
                  setAssetPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-4"
              >
                <option value="">All Individual Components</option>
                {individualComponents.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>

              <select
                value={assetStatus}
                onChange={(e) => {
                  setAssetStatus(e.target.value as AssetStatusFilter);
                  setAssetPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:col-span-3"
              >
                <option value="ALL">All Statuses</option>
                <option value="AVAILABLE">Available</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DAMAGED">Damaged</option>
                <option value="LOST">Lost</option>
                <option value="RETIRED">Retired</option>
              </select>
            </div>
          </section>

          {assetsError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
              {assetsError}
            </div>
          ) : assetsLoading ? (
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <EmptyState
              icon={Cpu}
              title="No assets found"
              description="Register serialized units under any INDIVIDUAL component to track them here."
            />
          ) : (
            <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
                      <th className="px-5 py-3.5">Asset Tag / S/N</th>
                      <th className="px-4 py-3.5">Component</th>
                      <th className="px-4 py-3.5">Location</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Notes</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {assets.map((asset) => (
                      <tr
                        key={asset.id}
                        className="transition-colors hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <p className="font-mono font-semibold text-slate-900">
                            {asset.assetTag}
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-slate-400">
                            {asset.serialNumber || "No S/N"}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <p className="font-medium text-slate-800">
                            {asset.component.name}
                          </p>
                          <p className="font-mono text-xs text-slate-400">
                            {asset.component.code}
                          </p>
                        </td>

                        <td className="px-4 py-4">
                          <LocationCodeBadge
                            code={asset.locationCode}
                            color={asset.component.storageDrawer?.rack.color}
                          />
                        </td>

                        <td className="px-4 py-4">
                          <AssetStatusBadge status={asset.status} />
                        </td>

                        <td className="max-w-xs truncate px-4 py-4 text-xs text-slate-500">
                          {asset.notes || "—"}
                        </td>

                        <td className="px-5 py-4 text-right">
                          {isManagement && asset.status === "AVAILABLE" && (
                            <button
                              type="button"
                              onClick={() => {
                                setCheckoutTarget(asset);
                                setCheckoutMemberId("");
                                setCheckoutDueAt(
                                  toLocalDateTimeInputDefault(7),
                                );
                                setCheckoutIncludeDue(true);
                                setCheckoutNote("");
                                setCheckoutError(null);
                              }}
                              className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                            >
                              Check Out
                            </button>
                          )}

                          {isManagement && asset.status === "CHECKED_OUT" && (
                            <button
                              type="button"
                              onClick={() => {
                                setReturnTarget({
                                  assetId: asset.id,
                                  assetTag: asset.assetTag,
                                });
                                setReturnNote("");
                                setReturnError(null);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <RotateCcw size={12} />
                              Return
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                pagination={assetPagination}
                onPageChange={setAssetPage}
              />
            </section>
          )}
        </>
      )}

      {/* Loan Detail Modal */}
      <Modal
        open={detailLoading || Boolean(detailLoan)}
        onClose={() => {
          setDetailLoan(null);
          setDetailLoading(false);
        }}
        title={
          detailLoan ? `Loan — ${detailLoan.component.name}` : "Loading Loan..."
        }
        subtitle={
          detailLoan
            ? `Borrower: ${detailLoan.member.name} (${detailLoan.member.email})`
            : undefined
        }
        size="lg"
      >
        {detailLoading ? (
          <div className="py-8 text-center text-sm text-slate-500">
            Loading loan timeline...
          </div>
        ) : detailLoan ? (
          <div className="space-y-5">
            <div className="grid gap-3 rounded-xl bg-slate-50 p-4 text-xs sm:grid-cols-3">
              <div>
                <p className="text-slate-400">Status</p>
                <div className="mt-1">
                  <LoanStatusBadge status={detailLoan.loanStatus} />
                </div>
              </div>
              <div>
                <p className="text-slate-400">Issued By</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {detailLoan.issuedBy.name}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Due Date</p>
                <p className="mt-1 font-semibold text-slate-800">
                  {formatDateTime(detailLoan.dueAt)}
                </p>
              </div>
            </div>

            <div>
              <h3 className="mb-2.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                Movement History
              </h3>
              <div className="space-y-2">
                {detailLoan.movements.map((mov) => (
                  <div
                    key={mov.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <MovementTypeBadge type={mov.movementType} />
                        <span className="font-medium text-slate-800">
                          {mov.performedBy.name}
                        </span>
                      </div>
                      {mov.note && (
                        <p className="mt-1 text-slate-500">{mov.note}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-800">
                        {mov.quantityChange > 0
                          ? `+${mov.quantityChange}`
                          : mov.quantityChange}
                      </span>
                      <p className="text-[11px] text-slate-400">
                        {formatDateTime(mov.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Update Due Date Modal */}
      <Modal
        open={Boolean(dueModalLoan)}
        onClose={() => setDueModalLoan(null)}
        title="Extend Loan Due Date"
        subtitle={
          dueModalLoan
            ? `${dueModalLoan.component.name} — ${dueModalLoan.member.name}`
            : undefined
        }
        size="sm"
      >
        <form
          onSubmit={(e) => void handleUpdateDueDate(e)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              New Due Date <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={dueDateInput}
              onChange={(e) => setDueDateInput(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          {dueError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {dueError}
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setDueModalLoan(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={dueSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {dueSubmitting ? "Updating..." : "Update Due Date"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Loan Return / Write-off Modal */}
      <Modal
        open={Boolean(bulkLoanAction)}
        onClose={() => setBulkLoanAction(null)}
        title={
          bulkLoanAction?.mode === "RETURN"
            ? "Return Bulk Loan"
            : "Write Off Borrowed Bulk Inventory"
        }
        subtitle={
          bulkLoanAction
            ? `${bulkLoanAction.loan.component.name} · Outstanding: ${bulkLoanAction.loan.outstandingQuantity}`
            : undefined
        }
        size="sm"
      >
        {bulkLoanAction && (
          <form
            onSubmit={(e) => void handleBulkLoanSubmit(e)}
            className="space-y-4"
          >
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Quantity (max {bulkLoanAction.loan.outstandingQuantity}){" "}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                max={bulkLoanAction.loan.outstandingQuantity}
                value={bulkLoanQty}
                onChange={(e) => setBulkLoanQty(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                required
              />
            </div>

            {bulkLoanAction.mode === "WRITE_OFF" && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Reason <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["DAMAGED", "LOST"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setBulkLoanReason(r)}
                      className={`rounded-xl border py-2 text-xs font-semibold ${
                        bulkLoanReason === r
                          ? "border-red-500 bg-red-50 text-red-700"
                          : "border-slate-200 text-slate-600"
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
                Note{" "}
                {bulkLoanAction.mode === "WRITE_OFF" && (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <textarea
                rows={2}
                value={bulkLoanNote}
                onChange={(e) => setBulkLoanNote(e.target.value)}
                required={bulkLoanAction.mode === "WRITE_OFF"}
                placeholder={
                  bulkLoanAction.mode === "WRITE_OFF"
                    ? "Required: describe what happened"
                    : "Optional condition note..."
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {bulkLoanError && (
              <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
                {bulkLoanError}
              </p>
            )}

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setBulkLoanAction(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={bulkLoanSubmitting}
                className={`rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 ${
                  bulkLoanAction.mode === "WRITE_OFF"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {bulkLoanSubmitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Checkout Asset Modal */}
      <Modal
        open={Boolean(checkoutTarget)}
        onClose={() => setCheckoutTarget(null)}
        title={
          checkoutTarget
            ? `Check Out Asset — ${checkoutTarget.assetTag}`
            : ""
        }
        subtitle={checkoutTarget?.component.name}
        size="md"
      >
        <form
          onSubmit={(e) => void handleCheckoutAsset(e)}
          className="space-y-4"
        >
          <MemberPicker
            value={checkoutMemberId}
            onChange={setCheckoutMemberId}
          />

          <div className="space-y-2">
            <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={checkoutIncludeDue}
                onChange={(e) => setCheckoutIncludeDue(e.target.checked)}
                className="rounded border-slate-300 text-blue-600"
              />
              Set expected return date
            </label>
            {checkoutIncludeDue && (
              <input
                type="datetime-local"
                value={checkoutDueAt}
                onChange={(e) => setCheckoutDueAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Note
            </label>
            <textarea
              rows={2}
              value={checkoutNote}
              onChange={(e) => setCheckoutNote(e.target.value)}
              placeholder="e.g., Robotics competition build"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {checkoutError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {checkoutError}
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setCheckoutTarget(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={checkoutSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {checkoutSubmitting ? "Issuing..." : "Check Out Asset"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Return Asset Modal */}
      <Modal
        open={Boolean(returnTarget)}
        onClose={() => setReturnTarget(null)}
        title={
          returnTarget ? `Return Asset — ${returnTarget.assetTag}` : ""
        }
        size="sm"
      >
        <form
          onSubmit={(e) => void handleReturnAsset(e)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Return Note
            </label>
            <textarea
              rows={2}
              value={returnNote}
              onChange={(e) => setReturnNote(e.target.value)}
              placeholder="Condition upon return (optional)..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {returnError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {returnError}
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setReturnTarget(null)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={returnSubmitting}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {returnSubmitting ? "Returning..." : "Confirm Return"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Register Asset Modal */}
      <Modal
        open={regOpen}
        onClose={() => setRegOpen(false)}
        title="Register Serialized Asset"
        subtitle="Attach a physical unit to an active INDIVIDUAL component."
        size="md"
      >
        <form
          onSubmit={(e) => void handleRegisterAsset(e)}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Component <span className="text-red-500">*</span>
            </label>
            <select
              value={regCompId}
              onChange={(e) => setRegCompId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            >
              <option value="">Select individual component...</option>
              {individualComponents.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Asset Tag <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={regTag}
              onChange={(e) => setRegTag(e.target.value)}
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
                value={regSerial}
                onChange={(e) => setRegSerial(e.target.value)}
                placeholder="Optional S/N"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Acquired Date
              </label>
              <input
                type="date"
                value={regAcquiredAt}
                onChange={(e) => setRegAcquiredAt(e.target.value)}
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
              value={regNotes}
              onChange={(e) => setRegNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {regError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {regError}
            </p>
          )}

          <div className="flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setRegOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regSubmitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {regSubmitting ? "Registering..." : "Register Asset"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default AssetsAndLoansPage;
