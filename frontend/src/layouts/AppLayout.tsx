import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Phone, ShieldCheck, Mail } from "lucide-react";
import talariaLogo from "../image/logo.svg";

const APP_NAV = [
  { to: "/orders", label: "Orders" },
  { to: "/orders/create", label: "Create Shipment" },
  { to: "/tracking", label: "Tracking" },
  { to: "/profile", label: "Profile" },
];

export default function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ── Dispatch strip ─────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 bg-neutral-950 text-[11px] font-semibold uppercase tracking-widest text-neutral-500">
        <div className="mx-auto max-w-7xl px-5 py-2 flex flex-wrap items-center gap-x-6 gap-y-1">
          <span className="flex items-center gap-1.5 text-white">
            <Phone size={12} /> 24/7 Dispatch · 1-800-555-LOAD
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={12} /> DOT #2849172 · Insured & Bonded
          </span>
          <span className="ml-auto hidden sm:flex items-center gap-1.5">
            <Mail size={12} /> dispatch@talaria.freight
          </span>
        </div>
      </div>

      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-black/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
            <span className="text-lg font-semibold tracking-tight">
              Talaria <span className="text-neutral-400">Freight</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {APP_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`px-4 py-2 text-sm transition-colors ${
                  location.pathname === item.to ||
                  (item.to === "/orders" && location.pathname.startsWith("/orders"))
                    ? "bg-white text-black font-semibold rounded-full"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="hidden md:inline-block rounded-full border border-neutral-700 px-5 py-2 text-sm font-medium text-white hover:border-white transition-colors"
          >
            Sign out
          </button>

          <button
            className="md:hidden p-2 rounded border border-neutral-700"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-neutral-800 bg-black/95 px-5 py-4 space-y-1">
            {APP_NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className="block py-2 font-medium text-sm text-neutral-400 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <button
              onClick={handleLogout}
              className="mt-3 w-full text-center rounded-full border border-neutral-700 px-4 py-2 text-sm font-medium text-white"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      {/* ── Page content ───────────────────────────────────────────────── */}
      <main className="min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}