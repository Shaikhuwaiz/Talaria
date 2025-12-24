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
    navigate("/dashboard", { replace: true });
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
    navigate("/dashboard", { replace: true });
    window.history.pushState(null, "", window.location.href);
  }, 200);

} catch (err) {
  console.error(err);
  setError("Server error");
}
  };

  return (
    <div className="flex min-h-screen">
      {/* ✅ Left Section with video + tagline */}
      <div className="relative w-3/5 hidden lg:flex flex-col justify-center items-start p-16 text-white">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/videos/video.mp4" type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-tr from-black/80 via-black/50 to-transparent" />

        <div className="relative z-10 max-w-lg translate-y-8">
          <h1 className="text-5xl font-extrabold mb-4 drop-shadow-lg">
            Welcome to <span className="text-yellow-400">Talaria</span>
          </h1>
          <p className="text-lg text-gray-200 leading-relaxed">
            Delivering excellence with speed. Log in to manage your shipments,
            track deliveries, and power your logistics journey.
          </p>
        </div>
      </div>

      {/* ✅ Right Section — Glassmorphic Login Card */}
      <div className="flex w-full lg:w-2/5 items-center justify-center bg-gradient-to-br from-[#1a1c2c] via-[#222b3a] to-[#1a1f2f]">
        <div className="relative bg-white/15 backdrop-blur-2xl border border-white/25 rounded-2xl shadow-2xl 
                        p-10 w-80 sm:w-96 text-white text-center">
          <h2 className="text-3xl font-bold mb-6 text-white drop-shadow-sm">
            User Login
          </h2>

          {error && <p className="text-red-400 text-sm mb-3">{error}</p>}

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/20 border border-white/40 text-white 
                         placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-3 rounded-lg bg-white/20 border border-white/40 text-white 
                         placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
<div className="flex items-center justify-between text-sm text-gray-300">
  <label className="flex items-center space-x-2">
    <input
      type="checkbox"
      checked={remember}
      onChange={(e) => setRemember(e.target.checked)}
      className="accent-yellow-400"
    />
    <span>Remember Me</span>
  </label>

  <Link
    to="/forgot-password"
    className="text-yellow-300 hover:underline"
  >
    Forgot password?
  </Link>
</div>

            <button
              type="submit"
              className="w-full py-3 bg-yellow-400/90 hover:bg-yellow-500 text-black font-semibold rounded-lg 
                         transition-all shadow-lg"
            >
              Login
            </button>
          </form>

          <p className="text-sm mt-4 text-gray-200">
            Don’t have an account?{" "}
            <Link to="/register" className="text-yellow-300 hover:underline">
              Register here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
