import { authenticatedRequest, buildQueryString } from "./api-client";
import type { ApiResponse, Pagination } from "../types/api";
import type { AssetItem, AssetStatusFilter } from "../types/inventory";

export interface GetAssetsParams {
  search?: string;
  componentId?: string;
  status?: AssetStatusFilter;
  page?: number;
  limit?: number;
}

export interface AssetsListResult {
  data: AssetItem[];
  pagination: Pagination;
}

export async function getAllAssets(
  params: GetAssetsParams = {},
): Promise<AssetsListResult> {
  const query = buildQueryString({
    search: params.search,
    componentId: params.componentId,
    status: params.status ?? "ALL",
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });

  const response = await authenticatedRequest<ApiResponse<AssetItem[]>>(
    `/assets${query}`,
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

export async function registerAsset(payload: {
  componentId: string;
  assetTag: string;
  serialNumber?: string;
  acquiredAt?: string;
  notes?: string;
}): Promise<ApiResponse<AssetItem>> {
  return authenticatedRequest<ApiResponse<AssetItem>>("/assets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkoutAsset(
  assetId: string,
  payload: {
    memberId: string;
    dueAt?: string;
    note?: string;
  },
): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    `/assets/${encodeURIComponent(assetId)}/checkout`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function returnAsset(
  assetId: string,
  payload: { note?: string } = {},
): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    `/assets/${encodeURIComponent(assetId)}/return`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}
