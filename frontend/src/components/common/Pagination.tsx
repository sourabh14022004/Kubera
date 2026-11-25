import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Pagination as PaginationType } from "../../types/api";

interface PaginationProps {
  pagination: PaginationType;
  onPageChange: (page: number) => void;
}

function Pagination({ pagination, onPageChange }: PaginationProps) {
  const { page, limit, total, totalPages } = pagination;

  if (total === 0) return null;

  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5 sm:flex-row">
      <p className="text-xs text-slate-500 tabular-nums">
        Showing <span className="font-semibold text-slate-700">{start}</span>–
        <span className="font-semibold text-slate-700">{end}</span> of{" "}
        <span className="font-semibold text-slate-700">{total}</span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <ChevronLeft size={14} />
          Prev
        </button>

        <span className="px-2 text-xs font-medium text-slate-600 tabular-nums">
          Page {page} of {Math.max(1, totalPages)}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
        >
          Next
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}

export default Pagination;
