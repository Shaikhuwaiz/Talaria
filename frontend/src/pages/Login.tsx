import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ✅ Load saved credentials if "Remember Me" was checked before
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    const savedPassword = localStorage.getItem("rememberedPassword");
    if (savedEmail && savedPassword) {
      setEmail(savedEmail);
      setPassword(savedPassword);
      setRemember(true);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/orders", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // Save token + email
      localStorage.setItem("token", data.token);
      localStorage.setItem("email", email);

      if (remember) {
        localStorage.setItem("rememberedEmail", email);
        localStorage.setItem("rememberedPassword", password);
      } else {
        localStorage.removeItem("rememberedEmail");
        localStorage.removeItem("rememberedPassword");
      }

      // Redirect and prevent back navigation
      setTimeout(() => {
        navigate("/orders", { replace: true });
        window.history.pushState(null, "", window.location.href);
      }, 200);
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
          <source src="/videos/video1.mp4" type="video/mp4" />
        </video>"absolute 
      </div>

      {/* ── RIGHT · Sign-in form ───────────────────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            Access the ops console to manage loads and track trucks live.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <form onSubmit={handleLogin} className="mt-8 space-y-4">
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
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-xs text-neutral-400">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-neutral-300 underline-offset-4 hover:underline"
                >
                  Forgot?
                </Link>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-400">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="accent-white"
              />
              Remember me
            </label>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
            >
              Sign in
            </button>
          </form>

          <p className="mt-5 text-sm text-neutral-400">
            New to the network?{" "}
            <Link
              to="/register"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Create an account
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