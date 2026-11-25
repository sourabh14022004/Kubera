import { authenticatedRequest, buildQueryString } from "./api-client";
import type { ApiResponse, Pagination } from "../types/api";
import type {
  ActiveStatusFilter,
  ComponentItem,
  CreateComponentPayload,
  StockStatusFilter,
  UpdateComponentPayload,
} from "../types/inventory";
import type { TrackingType } from "../types/storage";

export interface GetComponentsParams {
  search?: string;
  categoryId?: string;
  trackingType?: TrackingType;
  storageDrawerId?: string;
  status?: ActiveStatusFilter;
  stockStatus?: StockStatusFilter;
  page?: number;
  limit?: number;
}

export interface ComponentsListResult {
  data: ComponentItem[];
  pagination: Pagination;
}

export async function getAllComponents(
  params: GetComponentsParams = {},
): Promise<ComponentsListResult> {
  const query = buildQueryString({
    search: params.search,
    categoryId: params.categoryId,
    trackingType: params.trackingType,
    storageDrawerId: params.storageDrawerId,
    status: params.status ?? "ACTIVE",
    stockStatus: params.stockStatus,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });

  const response = await authenticatedRequest<ApiResponse<ComponentItem[]>>(
    `/components${query}`,
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

export async function createComponent(
  payload: CreateComponentPayload,
): Promise<ApiResponse<ComponentItem>> {
  return authenticatedRequest<ApiResponse<ComponentItem>>("/components", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateComponent(
  componentId: string,
  payload: UpdateComponentPayload,
): Promise<ApiResponse<ComponentItem>> {
  return authenticatedRequest<ApiResponse<ComponentItem>>(
    `/components/${encodeURIComponent(componentId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deactivateComponent(
  componentId: string,
): Promise<ApiResponse<ComponentItem>> {
  return authenticatedRequest<ApiResponse<ComponentItem>>(
    `/components/${encodeURIComponent(componentId)}/deactivate`,
    { method: "PATCH" },
  );
}

export async function activateComponent(
  componentId: string,
): Promise<ApiResponse<ComponentItem>> {
  return authenticatedRequest<ApiResponse<ComponentItem>>(
    `/components/${encodeURIComponent(componentId)}/activate`,
    { method: "PATCH" },
  );
}
