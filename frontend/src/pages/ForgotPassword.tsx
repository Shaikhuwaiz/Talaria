import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Something went wrong");
        setLoading(false);
        return;
      }

      navigate("/verify-otp", { state: { email } });
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-black text-white">
{/* ── LEFT · Image (pinned to viewport, cropped) ───────────── */}
      <div className="hidden lg:block w-[55%] relative overflow-hidden bg-black h-screen sticky top-0">
        <img
          src="/base.png"
          alt="Talaria"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* ── RIGHT · Forgot password form ──────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">
            Forgot password
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            Enter your registered email and we'll send you a one-time code.
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
            >
              {loading ? "Sending..." : "Send code"}
            </button>
          </form>

          <p className="mt-5 text-sm text-neutral-400">
            Remember your password?{" "}
            <Link
              to="/login"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}