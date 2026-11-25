import { useState } from "react";
import { Link, Navigate } from "react-router";
import { ArrowLeft, Boxes, ShieldCheck } from "lucide-react";
import { authClient } from "../auth/auth.client";

function LoginPage() {
  const { data: session, isPending } = authClient.useSession();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isPending && session?.user) {
    return <Navigate to="/dashboard" replace />;
  }

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
        err instanceof Error
          ? err.message
          : "Unable to sign in. Please try again.",
      );
      setIsSigningIn(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070B14] px-4 py-12 text-white">
      <div className="bg-blueprint-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute top-1/3 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl" />

      <div className="relative z-10 w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/30">
            <Boxes size={28} />
          </div>

          <h1 className="mt-5 text-2xl font-bold tracking-tight">
            Sign in to Kubera
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Access your robotics lab inventory, storage racks, and loans.
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <button
            type="button"
            onClick={() => void handleGoogleSignIn()}
            disabled={isSigningIn}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSigningIn ? (
              "Redirecting to Google..."
            ) : (
              <>
                <svg
                  width="18"
                  height="18"
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
            <p
              role="alert"
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-center text-xs text-red-300"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-800/80 bg-slate-950/60 px-3 py-2.5 text-xs text-slate-400">
          <ShieldCheck size={15} className="shrink-0 text-emerald-400" />
          Protected by Neon Auth &amp; Kubera RBAC
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition hover:text-white"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;
