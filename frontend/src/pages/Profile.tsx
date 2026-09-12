import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, Mail, Lock, Settings, Edit2, Loader2, Camera } from "lucide-react";

const API = import.meta.env.VITE_BACKEND_URL;

const nameFromEmail = (email?: string): string =>
  email?.includes("@")
    ? email
        .split("@")[0]
        .replace(/[^a-zA-Z]/g, "")
        .replace(/^./, (c) => c.toUpperCase())
    : "User";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    name: "",
    email: "",
    avatarUrl: "",
    role: "Logistics Manager",
    joined: "",
  });

  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error">("success");
  const [twoFaEnabled, setTwoFaEnabled] = useState(false);
  const [twoFaMethod, setTwoFaMethod] = useState("");
  const [twoFaPhase, setTwoFaPhase] = useState<"idle" | "requested">("idle");
  const [twoFaOtp, setTwoFaOtp] = useState("");
  const [totpSetup, setTotpSetup] = useState<{
    qrCodeUrl: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");

  /* ---------------------------------------------
     LOAD REAL USER FROM BACKEND (JWT)
  --------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;

    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (res.status === 401) throw new Error("UNAUTHORIZED");
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        const name = data.name?.trim() || nameFromEmail(data.email);
        const joined = data.joined || new Date().toISOString();

        localStorage.setItem("name", name);
        localStorage.setItem("email", data.email || "");
        localStorage.setItem("joined", joined);

        setUser({
          name,
          email: data.email || "",
          avatarUrl: data.avatarUrl || "",
          role: "Logistics Manager",
          joined,
        });
        setTwoFaEnabled(data.twoFactorEnabled === true);
        setTwoFaMethod(data.twoFactorMethod || "");
        setLoading(false);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setLoading(false);
        if (err.message === "UNAUTHORIZED") {
          localStorage.removeItem("token");
          navigate("/", { replace: true });
        } else {
          setStatusTone("error");
          setStatusMsg("Unable to load profile — please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  /* ---------------------------------------------
     SAVE PROFILE UPDATES TO BACKEND
  --------------------------------------------- */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusTone("success");

    if (newPassword && newPassword !== confirmPassword) {
      setStatusTone("error");
      setStatusMsg("Passwords do not match");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setStatusTone("error");
      setStatusMsg("Password must be at least 6 characters");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: user.name,
          email: user.email,
          currentPassword: currentPassword || undefined,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error(data.message || "Failed to save profile");

      localStorage.setItem("name", data.name);
      localStorage.setItem("email", data.email);

      setUser((u) => ({
        ...u,
        name: data.name,
        email: data.email,
      }));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEditing(false);
      setStatusMsg("Profile updated successfully");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Failed to save profile");
    }
  };

  /* ---------------------------------------------
     TWO-FACTOR AUTH
  --------------------------------------------- */
  const authHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("token") || "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Email OTP: request a code
  const handleTwoFaEnable = async () => {
    setStatusMsg("");
    setStatusTone("success");
    setTotpSetup(null);
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/2fa/request`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("Could not start 2FA setup");
      setTwoFaOtp("");
      setTwoFaPhase("requested");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Could not start 2FA setup");
    }
  };

  // Email OTP: confirm the code
  const handleTwoFaConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusTone("success");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/2fa/enable`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ otp: twoFaOtp }),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("Invalid or expired code");
      setTwoFaEnabled(true);
      setTwoFaMethod("email");
      setTwoFaPhase("idle");
      setTwoFaOtp("");
      setStatusMsg("Two-factor authentication enabled");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Invalid or expired code");
    }
  };

  // TOTP: start setup → get QR + secret
  const handleTotpSetup = async () => {
    setStatusMsg("");
    setStatusTone("success");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/2fa/totp/setup`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Could not start setup");
      }
      const data = await res.json();
      setTotpSetup({ qrCodeUrl: data.qrCodeUrl, secret: data.secret });
      setTotpCode("");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Could not start setup");
    }
  };

  // TOTP: verify the 6-digit code and enable
  const handleTotpEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("");
    setStatusTone("success");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/2fa/totp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify({ code: totpCode }),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Invalid code");
      }
      setTwoFaEnabled(true);
      setTwoFaMethod("totp");
      setTotpSetup(null);
      setTotpCode("");
      setStatusMsg("Authenticator app enabled");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Invalid code");
    }
  };

  // Disable 2FA (any method)
  const handleTwoFaDisable = async () => {
    setStatusMsg("");
    setStatusTone("success");
    const token = localStorage.getItem("token");
    if (!token) return;
    try {
      const res = await fetch(`${API}/auth/2fa/disable`, {
        method: "POST",
        headers: authHeaders(),
      });
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (!res.ok) throw new Error("Could not disable 2FA");
      setTwoFaEnabled(false);
      setTwoFaMethod("");
      setTotpSetup(null);
      setTotpCode("");
      setTwoFaPhase("idle");
      setTwoFaOtp("");
      setStatusMsg("Two-factor authentication disabled");
    } catch (err: any) {
      if (err.message === "UNAUTHORIZED") {
        localStorage.removeItem("token");
        navigate("/", { replace: true });
        return;
      }
      setStatusTone("error");
      setStatusMsg(err.message || "Could not disable 2FA");
    }
  };

  /* ---------------------------------------------
     UI OUTPUT
  --------------------------------------------- */
  return (
    <div className="flex-1 min-h-screen flex justify-center items-center overflow-hidden p-6">
      <div className="relative bg-neutral-950/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 w-full max-w-md text-white">

        {/* HEADER */}
        <div className="flex items-center justify-between pb-5 border-b border-white/10">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <User size={24} /> Profile
          </h2>
          {!loading && (
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 text-white hover:text-neutral-300 transition-all"
            >
              <Edit2 size={18} /> {editing ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-neutral-400">
            <Loader2 size={22} className="animate-spin" />
            <span className="text-sm">Loading profile…</span>
          </div>
        ) : (
          <>
            {/* ICON AVATAR — TOP CENTER */}
            <div className="flex flex-col items-center mt-8 mb-6">
              <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 shadow-lg flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={52} className="text-white" strokeWidth={2.2} />
                )}
                {!user.avatarUrl && (
                  <span className="absolute bottom-0 right-0 w-8 h-8 bg-white rounded-full border-4 border-neutral-950 flex items-center justify-center">
                    <Camera size={14} className="text-neutral-950" />
                  </span>
                )}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-center">{user.name}</h3>
              <p className="text-neutral-400 text-sm text-center">{user.role}</p>
              <p className="text-neutral-500 text-xs mt-1 text-center">
                Joined {new Date(user.joined).toLocaleDateString()}
              </p>
            </div>

            {/* FORM FIELDS */}
            <form
              onSubmit={handleSave}
              className="space-y-5 w-full"
            >
                {/* EMAIL */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                    <Mail size={16} /> Email
                  </label>
                  <input
                    type="email"
                    value={user.email}
                    disabled={!editing}
                    onChange={(e) =>
                      setUser((u) => ({ ...u, email: e.target.value }))
                    }
                    className={`w-full p-3 rounded-lg border ${
                      editing
                        ? "border-white/30 bg-white/10 focus:ring-2 focus:ring-white"
                        : "border-white/10 bg-white/5"
                    } text-white outline-none disabled:opacity-80`}
                  />
                </div>

                {/* FULL NAME */}
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                    <User size={16} /> Full Name
                  </label>
                  <input
                    type="text"
                    value={user.name}
                    disabled={!editing}
                    onChange={(e) =>
                      setUser((u) => ({ ...u, name: e.target.value }))
                    }
                    className={`w-full p-3 rounded-lg border ${
                      editing
                        ? "border-white/30 bg-white/10 focus:ring-2 focus:ring-white"
                        : "border-white/10 bg-white/5"
                    } text-white outline-none disabled:opacity-80`}
                  />
                </div>

                {/* PASSWORD FIELDS */}
                {editing && (
                  <>
                    <div>
                      <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                        <Lock size={16} /> Current Password
                      </label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Required to change password"
                        className="w-full p-3 rounded-lg border border-white/30 bg-white/10 focus:ring-2 focus:ring-white text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                        <Lock size={16} /> New Password
                      </label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="w-full p-3 rounded-lg border border-white/30 bg-white/10 focus:ring-2 focus:ring-white text-white outline-none"
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                        <Lock size={16} /> Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full p-3 rounded-lg border border-white/30 bg-white/10 focus:ring-2 focus:ring-white text-white outline-none"
                      />
                    </div>
                  </>
                )}

                {/* STATUS MESSAGE */}
                {statusMsg && (
                  <p
                    className={`text-sm font-medium ${
                      statusTone === "error" ? "text-red-400" : "text-green-400"
                    }`}
                  >
                    {statusMsg}
                  </p>
                )}

                {/* SAVE BUTTON */}
                {editing && (
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg font-semibold transition-all"
                    >
                      Save Changes
                    </button>
                  </div>
                )}
              </form>

            {/* SECURITY · TWO-FACTOR AUTH */}
            <div className="w-full mt-8 bg-white/5 p-6 rounded-xl border border-white/10">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lock size={15} /> Two-Factor Authentication
                  </h4>
                  <p className="text-xs text-neutral-500 mt-1">
                    {twoFaEnabled
                      ? twoFaMethod === "totp"
                        ? "Enabled — a code from your authenticator app is required at sign-in."
                        : "Enabled — a 6-digit email code is required at sign-in."
                      : "Off — add an extra security step to your sign-in."}
                  </p>
                </div>
                {twoFaEnabled && (
                  <button
                    type="button"
                    onClick={handleTwoFaDisable}
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all bg-red-500/15 text-red-400 hover:bg-red-500/25"
                  >
                    Disable
                  </button>
                )}
              </div>

              {!twoFaEnabled && (
                <div className="mt-4 space-y-4">
                  {/* METHOD: AUTHENTICATOR APP */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-[13px] font-semibold text-white">
                          Authenticator app
                        </h5>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Google Authenticator, Authy, 1Password — codes work
                          offline.
                        </p>
                      </div>
                      {!totpSetup && (
                        <button
                          type="button"
                          onClick={handleTotpSetup}
                          disabled={twoFaPhase === "requested"}
                          className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold bg-white hover:bg-neutral-200 text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Set up
                        </button>
                      )}
                    </div>

                    {totpSetup && (
                      <div className="mt-4 space-y-3">
                        <div className="flex flex-col items-center gap-3">
                          <img
                            src={totpSetup.qrCodeUrl}
                            alt="Authenticator QR code"
                            className="w-44 h-44 rounded-lg bg-white p-2"
                          />
                          <div className="text-center">
                            <p className="text-xs text-neutral-400">
                              Scan this QR in your authenticator app, then enter
                              the 6-digit code below.
                            </p>
                            <p className="mt-2 text-[11px] text-neutral-500">
                              Scratch code:
                            </p>
                            <p className="font-mono text-xs text-white break-all">
                              {totpSetup.secret}
                            </p>
                          </div>
                        </div>
                        <form
                          onSubmit={handleTotpEnable}
                          className="flex items-center gap-3"
                        >
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="Enter 6-digit code"
                            value={totpCode}
                            onChange={(e) =>
                              setTotpCode(e.target.value.replace(/\D/g, ""))
                            }
                            required
                            className="flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-white"
                          />
                          <button
                            type="submit"
                            className="px-5 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-semibold transition-all"
                          >
                            Enable
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setTotpSetup(null)}
                          className="text-xs text-neutral-500 hover:text-neutral-300 transition-all"
                        >
                          Cancel setup
                        </button>
                      </div>
                    )}
                  </div>

                  {/* METHOD: EMAIL CODE */}
                  <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h5 className="text-[13px] font-semibold text-white">
                          Email code
                        </h5>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          A 6-digit code sent to your inbox each sign-in.
                        </p>
                      </div>
                      {twoFaPhase !== "requested" && (
                        <button
                          type="button"
                          onClick={handleTwoFaEnable}
                          disabled={!!totpSetup}
                          className="shrink-0 px-4 py-1.5 rounded-lg text-sm font-semibold bg-white hover:bg-neutral-200 text-black transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Set up
                        </button>
                      )}
                    </div>

                    {twoFaPhase === "requested" && (
                      <form
                        onSubmit={handleTwoFaConfirm}
                        className="mt-3 flex items-center gap-3"
                      >
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          placeholder="Enter code"
                          value={twoFaOtp}
                          onChange={(e) =>
                            setTwoFaOtp(e.target.value.replace(/\D/g, ""))
                          }
                          required
                          className="flex-1 rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-white placeholder-neutral-500 outline-none focus:ring-2 focus:ring-white"
                        />
                        <button
                          type="submit"
                          className="px-5 py-2 bg-white hover:bg-neutral-200 text-black rounded-lg text-sm font-semibold transition-all"
                        >
                          Verify
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="mt-10 pt-4 border-t border-white/10 text-neutral-400 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings size={18} />
                <span className="text-sm">Account Settings</span>
              </div>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = "/";
                }}
                className="text-red-400 hover:text-red-500 text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}