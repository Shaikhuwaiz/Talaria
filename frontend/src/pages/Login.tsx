import { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import talariaLogo from "../image/logo.svg";
import {
  ShieldCheck,
  ArrowLeft,
  KeyRound,
  ChevronDown,
  Check,
} from "lucide-react";
import { GoogleIcon, GitHubIcon } from "../components/OAuthIcons";

const API = import.meta.env.VITE_BACKEND_URL;
const GOOGLE_CLIENT_ID = (import.meta.env.VITE_GOOGLE_CLIENT_ID as
  | string
  | undefined);
const GITHUB_CLIENT_ID = (import.meta.env.VITE_GITHUB_CLIENT_ID as
  | string
  | undefined);

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState<"credentials" | "2fa">("credentials");
  const [pendingEmail, setPendingEmail] = useState("");
  const [twoFaMethod, setTwoFaMethod] = useState("");
  const [otp, setOtp] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [methodOpen, setMethodOpen] = useState(false);
  const [searchParams] = useSearchParams();
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

  // ✅ Handle the OAuth callback token bounced back to /login
  useEffect(() => {
    const oauthToken =
      searchParams.get("github_token") || searchParams.get("google_token");
    if (oauthToken) {
      const email = searchParams.get("email") || "";
      const name = searchParams.get("name") || "";
      localStorage.setItem("token", oauthToken);
      if (email) localStorage.setItem("email", email);
      if (name) localStorage.setItem("name", name);
      window.history.replaceState(null, "", window.location.pathname);
      navigate("/orders", { replace: true });
    }
    const authError = searchParams.get("error_description") || searchParams.get("error");
    if (authError) setError(authError);
  }, [searchParams, navigate]);

  const storeSession = (token: string, userEmail: string) => {
    localStorage.setItem("token", token);
    localStorage.setItem("email", userEmail);

    if (remember && userEmail) {
      localStorage.setItem("rememberedEmail", userEmail);
      localStorage.setItem("rememberedPassword", password);
    } else {
      localStorage.removeItem("rememberedEmail");
      localStorage.removeItem("rememberedPassword");
    }

    setTimeout(() => {
      navigate("/orders", { replace: true });
      window.history.pushState(null, "", window.location.href);
    }, 200);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Login failed");
        return;
      }

      // 2FA enabled → ask for the security code instead of a token
      if (data.twoFactorRequired) {
        setPendingEmail(email);
        setTwoFaMethod(data.twoFactorMethod || "email");
        setOtp("");
        setPassword("");
        setPhase("2fa");
        return;
      }

      storeSession(data.token, email);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  const handleSendEmailCode = async (emailTo: string) => {
    setError("");
    try {
      const res = await fetch(`${API}/auth/2fa/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTo }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Could not send email code");
        setEmailCodeSent(false);
        setTwoFaMethod("");
        return false;
      }
      setEmailCodeSent(true);
      return true;
    } catch {
      setError("Could not send email code");
      setEmailCodeSent(false);
      return false;
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch(`${API}/auth/login-2fa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          otp,
          method: twoFaMethod || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Invalid code");
        return;
      }

      storeSession(data.token, pendingEmail);
    } catch (err) {
      console.error(err);
      setError("Server error");
    }
  };

  return (
    <div className="flex min-h-screen bg-black text-white">
      {/* ── LEFT · Video panel ─────────────────────────────────────────── */}
      <div className="relative hidden lg:flex w-[55%] flex-col p-6">
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl shadow-black/40">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover opacity-75"
          >
            <source src="/videos/video1.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

          <Link to="/" className="absolute left-8 top-8 flex items-center gap-2.5">
            <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
            <span className="flex flex-col leading-none">
              <span className="text-lg font-semibold tracking-tight">
                Talaria
              </span>
              <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.32em] text-neutral-400">
                Freight
              </span>
            </span>
          </Link>

          <div className="absolute inset-x-0 bottom-0 p-9">
            <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              48-state live coverage
            </p>
            <h2 className="mt-3 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
              Watch every load roll, door to door.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-neutral-300">
              Flatbeds, dry vans, reefers and hot-shots tracked on real
              highways — from pickup dock to final drop.
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT · Sign-in form ───────────────────────────────────────── */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-500">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Talaria ops console
          </p>

          {phase === "credentials" ? (
            <>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Sign in</h2>
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

              {GOOGLE_CLIENT_ID && (
                <>
                  <div className="my-6 flex items-center gap-3">
                    <span className="h-px flex-1 bg-neutral-800" />
                    <span className="text-xs uppercase tracking-widest text-neutral-600">
                      or
                    </span>
                    <span className="h-px flex-1 bg-neutral-800" />
                  </div>

                  <a
                    href={`${API}/auth/google/redirect`}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-neutral-700 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
                  >
                    <GoogleIcon />
                    Continue with Google
                  </a>
                </>
              )}

              {GITHUB_CLIENT_ID && (
                <a
                  href={`${API}/auth/github`}
                  className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-neutral-700 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
                >
                  <GitHubIcon />
                  Continue with GitHub
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!email.trim()) {
                    setError("Enter your email above first");
                    return;
                  }
                  setPendingEmail(email);
                  setTwoFaMethod("");
                  setOtp("");
                  setError("");
                  setPhase("2fa");
                }}
                className="mt-3 flex w-full items-center justify-center gap-3 rounded-full border border-neutral-700 bg-white px-4 py-3 text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
              >
                <KeyRound size={18} />
                Use a one-time code
              </button>

              <p className="mt-5 text-sm text-neutral-400">
                New to the network?{" "}
                <Link
                  to="/register"
                  className="font-semibold text-white underline-offset-4 hover:underline"
                >
                  Create an account
                </Link>
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setPhase("credentials");
                  setOtp("");
                  setError("");
                }}
                className="mt-3 inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-white"
              >
                <ArrowLeft size={15} /> Use password instead
              </button>

              <div className="mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white">
                <ShieldCheck size={24} />
              </div>

              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                {twoFaMethod === "totp"
                  ? "Enter your code"
                  : twoFaMethod === "email"
                  ? "Check your email"
                  : "Choose your method"}
              </h2>
              <p className="mt-1.5 text-sm text-neutral-500">
                {twoFaMethod === "totp" ? (
                  <>
                    Open your authenticator app and enter the 6-digit code for{" "}
                    <span className="font-semibold text-neutral-200">
                      Talaria
                    </span>
                    .
                  </>
                ) : twoFaMethod === "email" ? (
                  emailCodeSent ? (
                    <>
                      We sent a 6-digit code to{" "}
                      <span className="font-semibold text-neutral-200">
                        {pendingEmail}
                      </span>
                      .{" "}
                      <button
                        type="button"
                        onClick={() => handleSendEmailCode(pendingEmail)}
                        className="text-white underline-offset-4 hover:underline"
                      >
                        Resend
                      </button>
                    </>
                  ) : (
                    <>Sending a 6-digit code to your inbox…</>
                  )
                ) : (
                  <>
                    Pick how you want to receive your 6-digit security code.
                  </>
                )}
              </p>

              {error && (
                <p className="mt-5 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}

              <form onSubmit={handleOtpVerify} className="mt-8 space-y-4">
                {!twoFaMethod && (
                  <div className="relative">
                    <label className="mb-1.5 block text-xs text-neutral-400">
                      Method
                    </label>
                    <button
                      type="button"
                      onClick={() => setMethodOpen((o) => !o)}
                      className="flex w-full items-center justify-between rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-2.5 text-white outline-none transition-colors focus:ring-2 focus:ring-white"
                    >
                      <span className="text-neutral-400">Choose…</span>
                      <ChevronDown
                        size={18}
                        className={`text-neutral-500 transition-transform duration-200 ${
                          methodOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {methodOpen && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-neutral-700 bg-neutral-900">
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFaMethod("email");
                            setMethodOpen(false);
                            setEmailCodeSent(false);
                            setError("");
                            handleSendEmailCode(pendingEmail);
                          }}
                          className="flex w-full items-center justify-between px-3.5 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        >
                          <span>Email code</span>
                          {twoFaMethod === "email" && (
                            <Check size={16} className="text-white" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setTwoFaMethod("totp");
                            setMethodOpen(false);
                            setEmailCodeSent(false);
                            setError("");
                          }}
                          className="flex w-full items-center justify-between border-t border-white/10 px-3.5 py-2.5 text-left text-sm text-white transition-colors hover:bg-white/10"
                        >
                          <span>Authenticator app</span>
                          {twoFaMethod === "totp" && (
                            <Check size={16} className="text-white" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  required
                  className="w-full rounded-lg border border-neutral-700 bg-neutral-900 px-3.5 py-3 text-center text-2xl tracking-[0.35em] text-white placeholder-neutral-600 outline-none transition-colors focus:ring-2 focus:ring-white"
                />

                <button
                  type="submit"
                  className="w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-neutral-200"
                >
                  Verify & Sign in
                </button>
              </form>
            </>
          )}

          <p className="mt-10 text-center text-[11px] uppercase tracking-widest text-neutral-600">
            Talaria Freight Lines · DOT #2849172 · Insured
          </p>
        </div>
      </div>
    </div>
  );
}