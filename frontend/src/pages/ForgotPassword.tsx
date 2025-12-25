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
  <AuthLayout
    title="Reset Talaria Password"
    description="Enter your registered email. We’ll send you a one-time password to securely reset your account."
  >
    <div className="relative bg-white/15 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-2xl 
                    p-10 w-80 sm:w-96 text-white text-center">
      <h2 className="text-3xl font-bold mb-6 drop-shadow-sm">
        Forgot Password
      </h2>

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full p-3 rounded-lg bg-white/20 border border-white/40 text-white
                     placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-yellow-400/90 hover:bg-yellow-500 disabled:opacity-60
                     text-black font-semibold rounded-lg transition-all shadow-lg"
        >
          {loading ? "Sending OTP..." : "Send OTP"}
        </button>
      </form>

      <p className="text-sm mt-4 text-gray-200">
        Remember your password?{" "}
        <Link to="/" className="text-yellow-300 hover:underline">
          Back to login
        </Link>
      </p>
    </div>
  </AuthLayout>
);
}
