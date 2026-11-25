import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  Package,
  Plus,
  Power,
  RefreshCw,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { useAuth } from "../context/auth-context";
import { useToast } from "../context/toast-context";
import {
  activateCategory,
  createCategory,
  deactivateCategory,
  deleteCategory,
  getAllCategories,
  updateCategory,
} from "../services/categories.api";
import type {
  ActiveStatusFilter,
  ComponentCategory,
} from "../types/inventory";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import StatCard from "../components/common/StatCard";
import { formatDate } from "../utils/format";

function CategoriesPage() {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [categories, setCategories] = useState<ComponentCategory[]>([]);
  const [statusFilter, setStatusFilter] =
    useState<ActiveStatusFilter>("ACTIVE");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] =
    useState<ComponentCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [reloadTick, setReloadTick] = useState(0);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    setReloadTick((t) => t + 1);
  }, []);

  useEffect(() => {
    let active = true;

    async function fetchCategories() {
      try {
        const data = await getAllCategories(statusFilter);
        if (!active) return;
        setCategories(data);
        setError(null);
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error ? err.message : "Failed to load categories.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    void fetchCategories();
    return () => {
      active = false;
    };
  }, [statusFilter, reloadTick]);

  const filteredCategories = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        (cat.description ?? "").toLowerCase().includes(q),
    );
  }, [categories, search]);

  const activeCount = categories.filter((c) => c.isActive).length;
  const totalLinkedComponents = categories.reduce(
    (sum, c) => sum + (c._count?.components ?? 0),
    0,
  );

  function openCreateModal() {
    setEditingCategory(null);
    setName("");
    setDescription("");
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(category: ComponentCategory) {
    setEditingCategory(category);
    setName(category.name);
    setDescription(category.description ?? "");
    setFormError(null);
    setModalOpen(true);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: trimmedName,
          description: description.trim() ? description.trim() : null,
        });
        showToast(res.message ?? "Category updated.", "success");
      } else {
        const res = await createCategory({
          name: trimmedName,
          description: description.trim() || undefined,
        });
        showToast(res.message ?? "Category created.", "success");
      }
      setModalOpen(false);
      await loadCategories();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Unable to save category.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(category: ComponentCategory) {
    setBusyId(category.id);
    try {
      const res = category.isActive
        ? await deactivateCategory(category.id)
        : await activateCategory(category.id);
      showToast(res.message ?? "Category status updated.", "success");
      await loadCategories();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Action failed.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(category: ComponentCategory) {
    const confirmed = window.confirm(
      `Permanently delete category "${category.name}"? Only empty categories can be deleted.`,
    );
    if (!confirmed) return;

    setBusyId(category.id);
    try {
      const res = await deleteCategory(category.id);
      showToast(res.message ?? "Category deleted.", "success");
      await loadCategories();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Cannot delete category.",
        "error",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Component Categories
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Organize electronics and mechanical parts by classification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => void loadCategories()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700"
            >
              <Plus size={16} />
              New Category
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Shown Categories"
          value={categories.length}
          description={`Filter: ${statusFilter.toLowerCase()}`}
          icon={Tags}
          iconClassName="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Active Categories"
          value={activeCount}
          description="Available for new components"
          icon={CheckCircle2}
          iconClassName="bg-emerald-50 text-emerald-600"
          accent="success"
        />
        <StatCard
          title="Linked Components"
          value={totalLinkedComponents}
          description="Across listed categories"
          icon={Package}
          iconClassName="bg-violet-50 text-violet-600"
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
              placeholder="Search category name or description..."
              className="w-full rounded-xl border border-slate-200 py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(["ACTIVE", "INACTIVE", "ALL"] as ActiveStatusFilter[]).map(
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
                      : "Inactive"}
                </button>
              ),
            )}
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <AlertCircle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      ) : loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
            />
          ))}
        </div>
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={Tags}
          title="No categories found"
          description="Try switching the status filter or create a new component category."
        />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((cat) => {
            const isBusy = busyId === cat.id;
            const compCount = cat._count?.components ?? 0;

            return (
              <div
                key={cat.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {cat.name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        cat.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-100 text-slate-500"
                      }`}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">
                    {cat.description || "No description provided."}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3.5">
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 tabular-nums">
                      {compCount}
                    </span>{" "}
                    {compCount === 1 ? "component" : "components"} ·{" "}
                    <span>{formatDate(cat.updatedAt)}</span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditModal(cat)}
                        disabled={isBusy}
                        title="Edit category"
                        className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleToggleActive(cat)}
                        disabled={isBusy}
                        title={
                          cat.isActive
                            ? "Deactivate category"
                            : "Activate category"
                        }
                        className={`rounded-lg p-1.5 transition disabled:opacity-40 ${
                          cat.isActive
                            ? "text-amber-600 hover:bg-amber-50"
                            : "text-emerald-600 hover:bg-emerald-50"
                        }`}
                      >
                        <Power size={15} />
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleDelete(cat)}
                        disabled={isBusy || compCount > 0}
                        title={
                          compCount > 0
                            ? "Cannot delete category with components"
                            : "Delete category"
                        }
                        className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCategory ? "Edit Category" : "Create Category"}
        subtitle="Categories classify components across your robotics lab inventory."
        size="sm"
      >
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Microcontrollers"
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional summary of items in this category..."
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {formError && (
            <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-700">
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting
                ? "Saving..."
                : editingCategory
                  ? "Save Changes"
                  : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default CategoriesPage;
