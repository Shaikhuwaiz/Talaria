import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout";

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
    <AuthLayout>
      <div className="w-80 sm:w-96 rounded-2xl border border-neutral-800 bg-neutral-900 p-10 text-center text-white">
        <h2 className="mb-1.5 text-2xl font-semibold tracking-tight">
          Forgot password
        </h2>
        <p className="mb-6 text-sm text-neutral-400">
          Enter your registered email and we'll send you a one-time code.
        </p>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-neutral-700 bg-black px-3.5 py-2.5 text-white placeholder-neutral-500 outline-none transition-colors focus:border-white"
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
    </AuthLayout>
  );
}