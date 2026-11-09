import { Link } from "react-router";

function LoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-950 text-white">
      <h1 className="text-3xl font-bold">Welcome to Kubera</h1>

      <p className="text-slate-400">
        Sign in to access your robotics inventory.
      </p>

      <button className="rounded-lg bg-white px-6 py-3 font-medium text-black hover:bg-slate-200">
        Continue with Google
      </button>

      <Link to="/" className="text-sm text-blue-400">
        Back to Home
      </Link>
    </main>
  );
}

export default LoginPage;