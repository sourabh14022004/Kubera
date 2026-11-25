import { authenticatedRequest, buildQueryString } from "./api-client";
import type { ApiResponse, Pagination } from "../types/api";
import type {
  LoanDetail,
  LoanItem,
  LoanListStatusFilter,
  LoanSummary,
  MemberLoanSummary,
} from "../types/inventory";

export interface GetLoansParams {
  search?: string;
  memberId?: string;
  componentId?: string;
  assetId?: string;
  status?: LoanListStatusFilter;
  page?: number;
  limit?: number;
}

export interface LoansListResult {
  data: LoanItem[];
  pagination: Pagination;
}

export async function getAllLoans(
  params: GetLoansParams = {},
): Promise<LoansListResult> {
  const query = buildQueryString({
    search: params.search,
    memberId: params.memberId,
    componentId: params.componentId,
    assetId: params.assetId,
    status: params.status ?? "ALL",
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });

  const response = await authenticatedRequest<ApiResponse<LoanItem[]>>(
    `/loans${query}`,
  );

  return {
    data: response.data,
    pagination: response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: response.data.length,
      totalPages: 1,
    },
  };
}

export async function getMyLoans(
  params: Pick<GetLoansParams, "search" | "status" | "page" | "limit"> = {},
): Promise<LoansListResult> {
  const query = buildQueryString({
    search: params.search,
    status: params.status ?? "ALL",
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });

  const response = await authenticatedRequest<ApiResponse<LoanItem[]>>(
    `/loans/me${query}`,
  );

  return {
    data: response.data,
    pagination: response.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: response.data.length,
      totalPages: 1,
    },
  };
}

export async function getLoanSummary(): Promise<LoanSummary> {
  const response = await authenticatedRequest<ApiResponse<LoanSummary>>(
    "/loans/summary",
  );
  return response.data;
}

export async function getMyLoanSummary(): Promise<MemberLoanSummary> {
  const response = await authenticatedRequest<ApiResponse<MemberLoanSummary>>(
    "/loans/me/summary",
  );
  return response.data;
}

export async function getLoanById(loanId: string): Promise<LoanDetail> {
  const response = await authenticatedRequest<ApiResponse<LoanDetail>>(
    `/loans/${encodeURIComponent(loanId)}`,
  );
  return response.data;
}

export async function updateLoanDueDate(
  loanId: string,
  dueAt: string,
): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    `/loans/${encodeURIComponent(loanId)}/due-date`,
    {
      method: "PATCH",
      body: JSON.stringify({ dueAt }),
    },
  );
}
