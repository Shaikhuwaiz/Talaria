import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
const [success, setSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  // Safety: prevent direct access / refresh issues
  if (!email) {
    navigate("/forgot-password", { replace: true });
    return null;
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, newPassword: password }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed");
        setLoading(false);
        return;
      }

      // Redirect to login (your login is at "/")
  setSuccess(true);

setTimeout(() => {
  navigate("/", { replace: true });
}, 2500);

    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
  <AuthLayout
    title="Create New Password"
    description="Choose a strong password to secure your Talaria account."
  >
    <div
      className="relative bg-white/15 backdrop-blur-2xl border border-white/25
                 rounded-2xl shadow-2xl p-10 w-80 sm:w-96 text-white text-center"
    >
      {success ? (
        <>
          <h2 className="text-3xl font-bold mb-4 text-green-400">
            Password Updated
          </h2>

          <p className="text-gray-200 text-sm mb-4">
            Your password has been reset successfully.
          </p>

          <p className="text-gray-400 text-xs">
            Redirecting to login…
          </p>
        </>
      ) : (
        <>
          <h2 className="text-3xl font-bold mb-6 drop-shadow-sm">
            Reset Password
          </h2>

          {error && (
            <p className="text-red-400 text-sm mb-3">{error}</p>
          )}

          <form onSubmit={handleReset} className="space-y-4">
            <input
              type="password"
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/20 border border-white/40 text-white
                         placeholder-gray-200 focus:outline-none focus:ring-2
                         focus:ring-yellow-400"
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/20 border border-white/40 text-white
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
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>

          <p className="text-sm mt-4 text-gray-200">
            Back to{" "}
            <Link to="/" className="text-yellow-300 hover:underline">
              Login
            </Link>
          </p>
        </>
      )}
    </div>
  </AuthLayout>
);
}