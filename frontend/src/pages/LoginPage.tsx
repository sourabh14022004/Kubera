import { useState } from "react";
import { Link } from "react-router";
import { authClient } from "../auth/auth.client";

function LoginPage() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });

      if (result.error) {
        throw new Error(result.error.message);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to sign in. Please try again.",
      );
      setIsSigningIn(false);
    }

  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <div className=" rounded-2xl bg-blue-600 p-4 text-3xl font-bold">
        k
      </div>

      <h1 className="text-3xl font-bold">Welcome to Kubera</h1>

      <p className="text-slate-400">
        Sign in to access your robotics inventory.
      </p>

      <button
        onClick={handleGoogleSignIn}
        disabled={isSigningIn}
        className="mt-3 flex w-full max-w-xs items-center justify-center gap-3 rounded-lg bg-white px-6 py-3 font-medium text-black transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSigningIn ? (
          "Redirecting to Google..."
        ) : (
          <>
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.93c-.58 2.96-2.26 5.48-4.72 7.17l7.54 5.85c4.42-4.08 7.23-10.08 7.23-17.49Z"
              />
              <path
                fill="#FBBC05"
                d="M10.54 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.98-6.19Z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.14 15.91-5.81l-7.54-5.85c-2.1 1.41-4.79 2.25-8.37 2.25-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 43.62 14.62 48 24 48Z"
              />
            </svg>
            Continue with Google
          </>
        )}
      </button>

      {error && (
        <p role="alert" className="max-w-xs text-center text-sm text-red-400">
          {error}
        </p>
      )}

      <Link to="/" className="text-sm text-blue-400">
        Back to Home
      </Link>
    </main>
  );
}

export default LoginPage;