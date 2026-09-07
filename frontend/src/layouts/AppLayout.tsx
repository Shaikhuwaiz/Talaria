import { useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
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

  const onCreateShipment = location.pathname.startsWith("/orders/create");

  return (
    <div
      className={`min-h-screen ${
        onCreateShipment ? "bg-white text-neutral-900" : "bg-black text-neutral-100"
      }`}
    >
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50">
        <div className="mx-auto max-w-7xl px-5 py-4">
          <div className="rounded-full border border-white/10 bg-neutral-950/70 py-2 pl-5 pr-2 backdrop-blur">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2.5">
                <img src={talariaLogo} alt="Talaria" className="h-7 w-7 invert" />
                <span className="flex flex-col leading-none">
                  <span className="text-lg font-semibold tracking-tight text-white">
                    Talaria
                  </span>
                  <span className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.32em] text-neutral-400">
                    Freight
                  </span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
                {APP_NAV.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`transition-colors ${
                      location.pathname === item.to ||
                      (item.to === "/orders" && location.pathname.startsWith("/orders"))
                        ? "text-white font-semibold"
                        : "hover:text-white"
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
                className="md:hidden p-2 rounded border border-neutral-700 text-white"
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Toggle menu"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden my-0 mx-auto max-w-7xl px-5">
            <div className="rounded-xl border border-white/10 bg-neutral-950/95 px-5 py-4 space-y-1 shadow-lg">
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