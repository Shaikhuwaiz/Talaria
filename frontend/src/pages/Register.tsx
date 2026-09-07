import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import talariaLogo from "../image/logo.svg";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  // ✅ Redirect if already logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/orders", { replace: true });
    }
  }, [navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || "Registration failed");
        return;
      }

      setSuccess("Registration successful! Redirecting...");

      // ✅ Replace history so back button won't return here
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1200);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* ── LEFT · Video panel  */}
      <div className="relative hidden lg:flex w-[55%] flex-col p-6">
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/40">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          >
            <source src="/videos/video.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <Link to="/" className="absolute left-8 top-8 flex items-center gap-2.5">
            <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-semibold tracking-tight">
                Talaria
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.32em] text-neutral-400">
                Freight
              </span>
            </span>
          </Link>

          <div className="absolute inset-x-0 bottom-0 p-9">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              48-state live coverage
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              One account for the whole network.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
              Dispatch, track and report from a single console — with a live
              ETA on every load from dock to dock.
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT · Create account form*/}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Talaria ops console
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Create account
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            One account for dispatching, tracking and reporting.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}
          {success && (
            <p className="mt-5 rounded-lg border border-green-500/40 bg-green-500/10 px-3.5 py-2.5 text-sm text-green-400">
              {success}
            </p>
          )}

          <form onSubmit={handleRegister} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-neutral-400">
                Email
              </label>
              <input
                type="email"
                placeholder="you@carrier.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs text-neutral-400">
                Password
              </label>
              <input
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Create account
            </button>
          </form>

          <p className="mt-5 text-sm text-neutral-400">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>

          <p className="mt-10 text-center text-[11px] uppercase tracking-widest text-neutral-600">
            Talaria Freight Lines · DOT #2849172 · Insured
          </p>
        </div>
      </div>
    </div>
  );
}