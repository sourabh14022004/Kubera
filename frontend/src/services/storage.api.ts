
import { authenticatedRequest } from "./api-client";

import type {
  ApiResponse,
  StorageRack,
  StorageDrawerDetail,
} from "../types/storage";

export async function getAllRacks(): Promise<StorageRack[]> {
  const response =
    await authenticatedRequest<ApiResponse<StorageRack[]>>(
      "/storage/racks",
    );

  return response.data;
}

export async function getRackById(
  rackId: string,
): Promise<StorageRack> {
  const response =
    await authenticatedRequest<ApiResponse<StorageRack>>(
      `/storage/racks/${encodeURIComponent(rackId)}`,
    );

  return response.data;
}

export async function getDrawerById(
  drawerId: string,
): Promise<StorageDrawerDetail> {
  const response =
    await authenticatedRequest<ApiResponse<StorageDrawerDetail>>(
      `/storage/drawers/${encodeURIComponent(drawerId)}`,
    );

  return response.data;
}
