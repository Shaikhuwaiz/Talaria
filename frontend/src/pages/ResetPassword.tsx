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

      setSuccess(true);

      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch {
      setError("Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="w-80 sm:w-96 rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center text-white">
        {success ? (
          <>
            <h2 className="mb-4 text-2xl font-semibold text-white">
              Password updated
            </h2>
            <p className="text-sm text-neutral-400">
              Your password has been reset successfully.
            </p>
            <p className="mt-4 text-xs text-neutral-500">
              Redirecting to login…
            </p>
          </>
        ) : (
          <>
            <h2 className="mb-1.5 text-2xl font-semibold tracking-tight">
              New password
            </h2>
            <p className="mb-6 text-sm text-neutral-400">
              Choose a strong password for your account.
            </p>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <form onSubmit={handleReset} className="space-y-4">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-700 bg-black px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
              />

              <input
                type="password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-neutral-700 bg-black px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-white py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200 disabled:opacity-60"
              >
                {loading ? "Updating..." : "Update password"}
              </button>
            </form>

            <p className="mt-5 text-sm text-neutral-400">
              Back to{" "}
              <Link
                to="/login"
                className="font-semibold text-white underline-offset-4 hover:underline"
              >
                login
              </Link>
            </p>
          </>
        )}
      </div>
    </AuthLayout>
  );
}