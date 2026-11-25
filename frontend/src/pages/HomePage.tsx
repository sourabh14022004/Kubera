import { useEffect, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  Cpu,
  History,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { authClient } from "../auth/auth.client";
import { checkApiHealth } from "../services/auth.api";

function HomePage() {
  const { data: session } = authClient.useSession();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;

    async function ping() {
      try {
        const res = await checkApiHealth();
        if (active) setApiOnline(res.success);
      } catch {
        if (active) setApiOnline(false);
      }
    }

    void ping();
    return () => {
      active = false;
    };
  }, []);

  const features = [
    {
      icon: MapPin,
      title: "Precision Bin Mapping",
      description:
        "Color-coded racks and numbered drawers with deterministic codes like GREEN-R03-C01-D02.",
      color: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20",
    },
    {
      icon: Cpu,
      title: "Dual Tracking Modes",
      description:
        "Manage bulk passives by quantity alongside serialized boards and tools by asset tag.",
      color: "bg-blue-500/10 text-blue-400 ring-blue-500/20",
    },
    {
      icon: History,
      title: "Full Loan & Audit Trail",
      description:
        "Every stock-in, checkout, return, adjustment, and write-off is logged with who & when.",
      color: "bg-violet-500/10 text-violet-400 ring-violet-500/20",
    },
    {
      icon: ShieldCheck,
      title: "Role-Based Governance",
      description:
        "Protected via Neon Auth JWT verification and club role permissions on every mutation.",
      color: "bg-amber-500/10 text-amber-400 ring-amber-500/20",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#070B14] text-white">
      <div className="bg-blueprint-grid pointer-events-none absolute inset-0 opacity-60" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[44rem] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-600/25">
            <Boxes size={21} />
          </div>
          <div>
            <span className="text-base font-bold tracking-wider">KUBERA</span>
            <span className="ml-2 hidden rounded-md border border-slate-800 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 sm:inline-block">
              v1.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-300 sm:inline-flex">
            <span
              className={`h-2 w-2 rounded-full ${
                apiOnline === true
                  ? "bg-emerald-400"
                  : apiOnline === false
                    ? "bg-amber-400"
                    : "animate-pulse bg-slate-500"
              }`}
            />
            {apiOnline === true
              ? "Backend API Online"
              : apiOnline === false
                ? "Backend Offline"
                : "Checking API..."}
          </span>

          <Link
            to={session?.user ? "/dashboard" : "/login"}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-blue-600/30 transition hover:bg-blue-500"
          >
            {session?.user ? "Open Workspace" : "Sign In"}
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-20 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3.5 py-1 text-xs font-medium text-blue-300">
            <CheckCircle2 size={14} />
            University Robotics Club Inventory OS
          </div>

          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-6xl">
            Every sensor, board, and drawer{" "}
            <span className="bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              accounted for.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
            Kubera tracks your robotics lab components across physical storage
            racks, manages bulk and serialized asset checkouts, and alerts you
            before critical stock runs dry.
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={session?.user ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition hover:bg-blue-500"
            >
              {session?.user ? "Go to Dashboard" : "Get Started"}
              <ArrowRight size={16} />
            </Link>

            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3.5 font-mono text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              GREEN-R03-C01-D02
            </div>
          </div>
        </div>

        <section className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(({ icon: Icon, title, description, color }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm transition hover:border-slate-700"
            >
              <div
                className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ring-1 ${color}`}
              >
                <Icon size={20} />
              </div>
              <h2 className="mt-4 text-base font-semibold text-white">
                {title}
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

export default HomePage;
