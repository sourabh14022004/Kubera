import { createAuthClient } from "@neondatabase/auth";
import { BetterAuthReactAdapter } from "@neondatabase/auth/react";

const authUrl = import.meta.env.VITE_NEON_AUTH_URL;

if (!authUrl) {
    throw new Error(
        "VITE_NEON_AUTH_URL is missing from frontend environment variables.",
    );
}


export const authClient = createAuthClient(authUrl, {
    adapter: BetterAuthReactAdapter(),
})