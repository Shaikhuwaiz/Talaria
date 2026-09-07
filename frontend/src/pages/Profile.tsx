
import { useState, useEffect } from "react";
import { User, Mail, Lock, Settings, Edit2 } from "lucide-react";
import { getAvatarFromEmail } from "../utils/avatarFromEmail"; // ✅ Correct import

export default function Profile() {
  const [user, setUser] = useState({
    name: "",
    email: "",
    role: "Logistics Manager",
    joined: "",
    avatar: ""
  });

  const [editing, setEditing] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState("");

  /* ---------------------------------------------
     LOAD USER FROM LOCAL STORAGE
  --------------------------------------------- */
  useEffect(() => {
    const storedName = localStorage.getItem("name");
    const storedEmail = localStorage.getItem("email");
    const storedJoined = localStorage.getItem("joined");

    const extractedName =
      storedEmail && storedEmail.includes("@")
        ? storedEmail
            .split("@")[0]
            .replace(/[^a-zA-Z]/g, "")
            .replace(/^./, (c) => c.toUpperCase())
        : "User";

    if (!storedJoined) {
      localStorage.setItem("joined", new Date().toISOString());
    }

    const avatar = getAvatarFromEmail(storedEmail || "");

    setUser({
      name: storedName || extractedName,
      email: storedEmail || "user@example.com",
      role: "Logistics Manager",
      joined: storedJoined || new Date().toISOString(),
      avatar
    });
  }, []);

  /* ---------------------------------------------
     SAVE PROFILE UPDATES
  --------------------------------------------- */
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg("");

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg("❌ Passwords do not match");
      return;
    }

    try {
      localStorage.setItem("name", user.name);
      localStorage.setItem("email", user.email);

      setUser((u) => ({
        ...u,
        avatar: getAvatarFromEmail(user.email) // ✅ Update avatar when email changes
      }));

      setEditing(false);
      setStatusMsg("✅ Profile updated successfully");
    } catch {
      setStatusMsg("❌ Failed to update profile");
    }
  };

  /* ---------------------------------------------
     UI OUTPUT
  --------------------------------------------- */
  return (
    <div className="flex-1 min-h-screen flex justify-center items-center overflow-hidden p-6">
      <div className="relative bg-neutral-950/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-10 w-full max-w-3xl text-white">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <User size={26} /> Profile
          </h2>
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 text-yellow-400 hover:text-yellow-300 transition-all"
          >
            <Edit2 size={18} /> {editing ? "Cancel" : "Edit"}
          </button>
        </div>

        {/* AVATAR + DETAILS */}
        <div className="flex flex-col md:flex-row items-center gap-8">

          {/* AVATAR DISPLAY */}
          <div className="flex flex-col items-center text-center">
            <img
              src={user.avatar}
              alt="avatar"
              className="w-28 h-28 rounded-full shadow-lg border border-white/20 object-cover mb-3"
            />
            <h3 className="text-xl font-semibold">{user.name}</h3>
            <p className="text-neutral-400 text-sm">{user.role}</p>
            <p className="text-neutral-500 text-xs mt-1">
              Joined {new Date(user.joined).toLocaleDateString()}
            </p>
          </div>

          {/* FORM FIELDS */}
          <form
            onSubmit={handleSave}
            className="flex-1 space-y-5 bg-white/5 p-6 rounded-xl border border-white/10"
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
                    ? "border-yellow-400 bg-white/10 focus:ring-2 focus:ring-yellow-400"
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
                    ? "border-yellow-400 bg-white/10 focus:ring-2 focus:ring-yellow-400"
                    : "border-white/10 bg-white/5"
                } text-white outline-none disabled:opacity-80`}
              />
            </div>

            {/* PASSWORD FIELDS */}
            {editing && (
              <>
                <div>
                  <label className="flex items-center gap-2 text-sm text-neutral-400 mb-1">
                    <Lock size={16} /> New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full p-3 rounded-lg border border-yellow-400 bg-white/10 focus:ring-2 focus:ring-yellow-400 text-white outline-none"
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
                    placeholder="Confirm password"
                    className="w-full p-3 rounded-lg border border-yellow-400 bg-white/10 focus:ring-2 focus:ring-yellow-400 text-white outline-none"
                  />
                </div>
              </>
            )}

            {/* STATUS MESSAGE */}
            {statusMsg && (
              <p
                className={`text-sm font-medium ${
                  statusMsg.startsWith("✅")
                    ? "text-green-400"
                    : "text-red-400"
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
                  className="px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-black rounded-lg font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            )}
          </form>
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
      </div>
    </div>
  );
}
