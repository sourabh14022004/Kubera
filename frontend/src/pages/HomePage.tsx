import { Link } from "react-router";

function HomePage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-950 text-white">
      <h1 className="text-5xl font-bold text-blue-400">
        Kubera
      </h1>

      <p className="text-slate-400">
        Robotics Lab Inventory Management System
      </p>

      <Link
        to="/login"
        className="rounded-lg bg-blue-600 px-6 py-3 font-medium hover:bg-blue-700"
      >
        Get Started
      </Link>
    </main>
  );
}

export default HomePage;