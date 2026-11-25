const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL;

interface TokenResponse {
  token?: string;
}

export class ApiError extends Error {
  status: number;
  details?: Record<string, unknown>;

  constructor(
    message: string,
    status: number,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function buildQueryString(
  params: Record<string, string | number | undefined | null>,
): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}

async function getNeonJWT(): Promise<string> {
  if (!NEON_AUTH_URL) {
    throw new Error("Neon Auth URL is not configured.");
  }

  const response = await fetch(
    `${NEON_AUTH_URL.replace(/\/$/, "")}/token`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new ApiError(
      `Unable to retrieve authentication token (${response.status}).`,
      response.status,
    );
  }

  const result = (await response.json()) as TokenResponse;

  if (!result.token) {
    throw new ApiError("Neon Auth did not return a JWT.", 401);
  }

  return result.token;
}

export async function publicRequest<T>(endpoint: string): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      Accept: "application/json",
    },
  });

  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new ApiError("The server returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const record =
      typeof result === "object" && result !== null
        ? (result as Record<string, unknown>)
        : undefined;
    const message =
      record && typeof record.message === "string"
        ? record.message
        : `Request failed with status ${response.status}.`;
    throw new ApiError(message, response.status, record);
  }

  return result as T;
}

export async function authenticatedRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("VITE_API_BASE_URL is not configured.");
  }

  const token = await getNeonJWT();

  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${token}`);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new ApiError("The server returned an invalid response.", response.status);
  }

  if (!response.ok) {
    const record =
      typeof result === "object" && result !== null
        ? (result as Record<string, unknown>)
        : undefined;

    const message =
      record && typeof record.message === "string"
        ? record.message
        : `Request failed with status ${response.status}.`;

    throw new ApiError(message, response.status, record);
  }

  return result as T;
}
