import { authenticatedRequest, buildQueryString } from "./api-client";
import type { ApiResponse } from "../types/api";
import type {
  InventoryMovementType,
  InventoryOverview,
  MovementHistoryResponse,
  StockAlertItem,
} from "../types/inventory";

export async function getInventoryOverview(): Promise<InventoryOverview> {
  const response = await authenticatedRequest<ApiResponse<InventoryOverview>>(
    "/inventory/reports/overview",
  );
  return response.data;
}

export async function getStockAlerts(): Promise<StockAlertItem[]> {
  const response = await authenticatedRequest<ApiResponse<StockAlertItem[]>>(
    "/inventory/reports/stock-alerts",
  );
  return response.data;
}

export interface GetMovementsParams {
  componentId?: string;
  movementType?: InventoryMovementType;
  memberId?: string;
  performedById?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export async function getMovementHistory(
  params: GetMovementsParams = {},
): Promise<MovementHistoryResponse> {
  const query = buildQueryString({
    componentId: params.componentId,
    movementType: params.movementType,
    memberId: params.memberId,
    performedById: params.performedById,
    from: params.from,
    to: params.to,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  });

  const response = await authenticatedRequest<
    ApiResponse<MovementHistoryResponse>
  >(`/inventory/reports/movements${query}`);

  return response.data;
}
