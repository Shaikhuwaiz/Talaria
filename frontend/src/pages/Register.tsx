import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

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
      {/* ── LEFT · Video panel ─────────────────────────────────────────── */}
      <div className="relative hidden lg:flex w-[55%] flex-col justify-between overflow-hidden p-12">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src="/videos/video.mp4" type="video/mp4" />
        </video>
      </div>

      {/* ── RIGHT · Create account form ────────────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">
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