import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

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
    <AuthLayout
      title="Verify OTP"
      description="Enter the 6-digit code sent to your registered email address."
    >
      <div
        className="relative bg-white/15 backdrop-blur-2xl border border-white/25
                   rounded-2xl shadow-2xl p-10 w-80 sm:w-96 text-white text-center"
      >
        <h2 className="text-3xl font-bold mb-6 drop-shadow-sm">
          Verify OTP
        </h2>

        <p className="text-sm text-gray-300 mb-4">
          OTP sent to <span className="text-yellow-400">{email}</span>
        </p>

        {error && (
          <p className="text-red-400 text-sm mb-3">{error}</p>
        )}

        <form onSubmit={handleVerify} className="space-y-4">
          <input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            required
            className="w-full p-3 text-center tracking-widest text-lg
                       rounded-lg bg-white/20 border border-white/40 text-white
                       placeholder-gray-200 focus:outline-none focus:ring-2
                       focus:ring-yellow-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-yellow-400/90 hover:bg-yellow-500
                       disabled:opacity-60 text-black font-semibold rounded-lg
                       transition-all shadow-lg"
          >
            {loading ? "Verifying..." : "Verify OTP"}
          </button>
        </form>

        <p className="text-sm mt-4 text-gray-200">
          Didn’t receive OTP?{" "}
          <Link
            to="/forgot-password"
            className="text-yellow-300 hover:underline"
          >
            Try again
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
