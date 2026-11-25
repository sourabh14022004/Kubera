import { authenticatedRequest } from "./api-client";
import type { ApiResponse } from "../types/api";

export async function checkoutBulkInventory(payload: {
  componentId: string;
  memberId: string;
  quantity: number;
  dueAt?: string;
  note?: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/checkout",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function returnBulkInventory(payload: {
  loanId: string;
  quantity: number;
  note?: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/return",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function stockInBulkInventory(payload: {
  componentId: string;
  quantity: number;
  note?: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/stock-in",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function adjustBulkInventory(payload: {
  componentId: string;
  adjustment: number;
  note: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/adjust",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function writeOffBulkInventory(payload: {
  componentId: string;
  quantity: number;
  reason: "DAMAGED" | "LOST";
  note: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/write-off",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function writeOffBulkLoan(payload: {
  loanId: string;
  quantity: number;
  reason: "DAMAGED" | "LOST";
  note: string;
}): Promise<ApiResponse<unknown>> {
  return authenticatedRequest<ApiResponse<unknown>>(
    "/inventory/bulk/loan-write-off",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}
