export type RoleName =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "CLUB_PRESIDENT"
  | "VICE_PRESIDENT"
  | "MEMBER"
  | string;

export const MANAGEMENT_ROLES: readonly string[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CLUB_PRESIDENT",
  "VICE_PRESIDENT",
];

export const ADMIN_ROLES: readonly string[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "CLUB_PRESIDENT",
];

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  total?: number;
  pagination?: Pagination;
  data: T;
}

export interface KuberaUser {
  id: string;
  name: string;
  email: string;
  roles: RoleName[];
}

export interface HealthResponse {
  success: boolean;
  message: string;
}
