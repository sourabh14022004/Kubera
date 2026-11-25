import { authenticatedRequest, buildQueryString } from "./api-client";
import type { ApiResponse } from "../types/api";
import type {
  ActiveStatusFilter,
  ComponentCategory,
} from "../types/inventory";

export async function getAllCategories(
  status: ActiveStatusFilter = "ACTIVE",
): Promise<ComponentCategory[]> {
  const query = buildQueryString({ status });
  const response = await authenticatedRequest<ApiResponse<ComponentCategory[]>>(
    `/components/categories${query}`,
  );
  return response.data;
}

export async function createCategory(payload: {
  name: string;
  description?: string | null;
}): Promise<ApiResponse<ComponentCategory>> {
  return authenticatedRequest<ApiResponse<ComponentCategory>>(
    "/components/categories",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function updateCategory(
  categoryId: string,
  payload: { name?: string; description?: string | null },
): Promise<ApiResponse<ComponentCategory>> {
  return authenticatedRequest<ApiResponse<ComponentCategory>>(
    `/components/categories/${encodeURIComponent(categoryId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}

export async function deactivateCategory(
  categoryId: string,
): Promise<ApiResponse<ComponentCategory>> {
  return authenticatedRequest<ApiResponse<ComponentCategory>>(
    `/components/categories/${encodeURIComponent(categoryId)}/deactivate`,
    { method: "PATCH" },
  );
}

export async function activateCategory(
  categoryId: string,
): Promise<ApiResponse<ComponentCategory>> {
  return authenticatedRequest<ApiResponse<ComponentCategory>>(
    `/components/categories/${encodeURIComponent(categoryId)}/activate`,
    { method: "PATCH" },
  );
}

export async function deleteCategory(
  categoryId: string,
): Promise<{ success: boolean; message: string }> {
  return authenticatedRequest<{ success: boolean; message: string }>(
    `/components/categories/${encodeURIComponent(categoryId)}`,
    { method: "DELETE" },
  );
}
