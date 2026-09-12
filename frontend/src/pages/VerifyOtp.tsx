import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";

export default function VerifyOtp() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Safety: if user refreshes or opens directly
  if (!email) {
    navigate("/forgot-password", { replace: true });
    return null;
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/verify-otp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, otp }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      navigate("/reset-password", { state: { email } });
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
          src="/dispatch.png"
          alt="Talaria"
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* ── RIGHT · Verify code form ─────────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-semibold tracking-tight">
            Verify code
          </h2>
          <p className="mt-1.5 text-sm text-neutral-500">
            Code sent to{" "}
            <span className="font-semibold text-white">{email}</span>
          </p>

          {error && (
            <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <form onSubmit={handleVerify} className="mt-8 space-y-4">
            <input
              type="text"
              placeholder="6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              maxLength={6}
              required
              className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-center text-lg tracking-[0.4em] text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
            >
              {loading ? "Verifying..." : "Verify code"}
            </button>
          </form>

          <p className="mt-5 text-sm text-neutral-400">
            Didn't receive it?{" "}
            <Link
              to="/forgot-password"
              className="font-semibold text-white underline-offset-4 hover:underline"
            >
              Try again
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}