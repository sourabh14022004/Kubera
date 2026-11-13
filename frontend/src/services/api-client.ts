
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const NEON_AUTH_URL = import.meta.env.VITE_NEON_AUTH_URL;

interface TokenResponse {
  token?: string;
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
    throw new Error(
      `Unable to retrieve authentication token (${response.status}).`,
    );
  }

  const result = (await response.json()) as TokenResponse;

  if (!result.token) {
    throw new Error("Neon Auth did not return a JWT.");
  }

  return result.token;
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  let result: unknown;

  try {
    result = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const message =
      typeof result === "object" &&
      result !== null &&
      "message" in result &&
      typeof result.message === "string"
        ? result.message
        : `Request failed with status ${response.status}.`;

    throw new Error(message);
  }

  return result as T;
}
