
import type {
  ApiResponse,
  StorageRack,
  StorageDrawerDetail,
} from "../types/storage";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api";

async function apiRequest<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  let result: Partial<ApiResponse<T>>;

  try {
    result = (await response.json()) as Partial<ApiResponse<T>>;
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok || result.success !== true) {
    throw new Error(
      result.message ?? `Request failed with status ${response.status}.`,
    );
  }

  if (result.data === undefined) {
    throw new Error("The server response did not contain data.");
  }

  return result.data;
}

// Fetch all racks and their drawers.
export function getAllRacks(): Promise<StorageRack[]> {
  return apiRequest<StorageRack[]>("/storage/racks");
}

// Fetch one rack and its drawers.
export function getRackById(rackId: string): Promise<StorageRack> {
  return apiRequest<StorageRack>(
    `/storage/racks/${encodeURIComponent(rackId)}`,
  );
}

// Fetch one drawer and its components.
export function getDrawerById(
  drawerId: string,
): Promise<StorageDrawerDetail> {
  return apiRequest<StorageDrawerDetail>(
    `/storage/drawers/${encodeURIComponent(drawerId)}`,
  );
}
