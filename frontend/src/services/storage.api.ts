import { authenticatedRequest, buildQueryString } from "./api-client";
import type {
  ApiResponse,
  RackStatusFilter,
  StorageColor,
  StorageDrawerDetail,
  StorageRack,
} from "../types/storage";

export async function getAllRacks(
  status: RackStatusFilter = "ACTIVE",
): Promise<StorageRack[]> {
  const query = buildQueryString({ status });
  const response = await authenticatedRequest<ApiResponse<StorageRack[]>>(
    `/storage/racks${query}`,
  );
  return response.data;
}

export async function getRackById(rackId: string): Promise<StorageRack> {
  const response = await authenticatedRequest<ApiResponse<StorageRack>>(
    `/storage/racks/${encodeURIComponent(rackId)}`,
  );
  return response.data;
}

export async function getDrawerById(
  drawerId: string,
): Promise<StorageDrawerDetail> {
  const response = await authenticatedRequest<ApiResponse<StorageDrawerDetail>>(
    `/storage/drawers/${encodeURIComponent(drawerId)}`,
  );
  return response.data;
}

export async function createRack(payload: {
  color: StorageColor;
  drawersPerRack: number;
}): Promise<ApiResponse<StorageRack>> {
  return authenticatedRequest<ApiResponse<StorageRack>>("/storage/racks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function retireRack(
  rackId: string,
): Promise<ApiResponse<StorageRack>> {
  return authenticatedRequest<ApiResponse<StorageRack>>(
    `/storage/racks/${encodeURIComponent(rackId)}/retire`,
    { method: "PATCH" },
  );
}

export async function restoreRack(
  rackId: string,
): Promise<ApiResponse<StorageRack>> {
  return authenticatedRequest<ApiResponse<StorageRack>>(
    `/storage/racks/${encodeURIComponent(rackId)}/restore`,
    { method: "PATCH" },
  );
}

export async function deleteRack(
  rackId: string,
): Promise<{ success: boolean; message: string }> {
  return authenticatedRequest<{ success: boolean; message: string }>(
    `/storage/racks/${encodeURIComponent(rackId)}`,
    { method: "DELETE" },
  );
}
