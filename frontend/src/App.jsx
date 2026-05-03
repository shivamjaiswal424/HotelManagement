import React, { useState, useEffect, useCallback } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import { api } from "./api";
import AIChatWidget      from "./pages/AIChatWidget";
import Dashboard         from "./pages/Dashboard";
import RoomsView         from "./pages/RoomsView";
import ReservationList   from "./pages/ReservationList";
import CreateReservation from "./pages/CreateReservation";
import GuestsPage        from "./pages/GuestsPage";
import CompaniesPage     from "./pages/CompaniesPage";
import ReportsPage       from "./pages/ReportsPage";
import StayViewPage      from "./pages/StayViewPage";
import AnalyticsPage     from "./pages/AnalyticsPage";
import LoginPage         from "./pages/LoginPage";

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const navItems = [
  { to: "/",                    icon: "⊞",  label: "Dashboard"       },
  { to: "/stay-view",           icon: "📅",  label: "Stay View"       },
  { to: "/rooms",               icon: "🛏",  label: "Rooms View"      },
  { to: "/reservations",        icon: "📋",  label: "Reservations"    },
  { to: "/create",              icon: "＋",  label: "New Reservation" },
];
const navItems2 = [
  { to: "/guests",              icon: "👤",  label: "Guests"          },
  { to: "/companies",           icon: "🏢",  label: "Companies"       },
];
const navItems3 = [
  { to: "/analytics",           icon: "📈",  label: "Analytics"       },
  { to: "/reports",             icon: "📊",  label: "Reports"         },
];

const fmt = (d) => d ? new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "—";

function CheckoutAlert() {
  const [guests, setGuests]       = useState([]);
  const [show, setShow]           = useState(false);
  const [checkingOut, setCheckingOut] = useState({});

  const checkAndAlert = useCallback(async () => {
    const today = localToday();
    if (localStorage.getItem("checkoutAlertDismissed") === today) return;
    try {
      const res = await api.get("/reservations");
      const pending = res.data.filter(r => r.checkOutDate === today && r.status === "CHECKED_IN");
      if (pending.length > 0) { setGuests(pending); setShow(true); }
    } catch {}
  }, []);

  useEffect(() => {
    const now  = new Date();
    const noon = new Date();
    noon.setHours(12, 0, 0, 0);
    if (now >= noon) {
      checkAndAlert();
    } else {
      const t = setTimeout(checkAndAlert, noon - now);
      return () => clearTimeout(t);
    }
  }, [checkAndAlert]);

  const handleCheckout = async (reservation) => {
    setCheckingOut(p => ({ ...p, [reservation.id]: true }));
    try {
      await api.put(`/reservations/${reservation.id}/checkout`);
      const remaining = guests.filter(g => g.id !== reservation.id);
      setGuests(remaining);
      if (remaining.length === 0) dismiss();
    } catch {
      alert("Checkout failed. Please try from Rooms View.");
    } finally {
      setCheckingOut(p => ({ ...p, [reservation.id]: false }));
    }
  };

  const dismiss = () => {
    localStorage.setItem("checkoutAlertDismissed", localToday());
    setShow(false);
  };

  if (!show) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: "var(--radius)", width: 500, maxWidth: "90vw",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)", overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          background: "rgba(239,68,68,0.12)", borderBottom: "1px solid rgba(239,68,68,0.3)",
          padding: "16px 20px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>🔔</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#ef4444" }}>Checkout Due — 12:00 PM</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              {guests.length} guest{guests.length !== 1 ? "s" : ""} due for checkout today
            </div>
          </div>
          <button onClick={dismiss} style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: 18, cursor: "pointer", lineHeight: 1,
          }}>✕</button>
        </div>

        {/* Guest list */}
        <div style={{ maxHeight: 320, overflowY: "auto" }}>
          {guests.map(r => (
            <div key={r.id} style={{
              padding: "12px 20px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(239,68,68,0.15)", color: "#ef4444",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 14, flexShrink: 0,
              }}>
                {r.guestName?.[0]?.toUpperCase() || "?"}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.guestName}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                  Room {r.room?.roomNumber} · Checked in {fmt(r.checkInDate)}
                </div>
              </div>
              <button
                onClick={() => handleCheckout(r)}
                disabled={checkingOut[r.id]}
                style={{
                  padding: "6px 14px", borderRadius: "var(--radius-sm)",
                  background: checkingOut[r.id] ? "rgba(74,222,128,0.1)" : "rgba(74,222,128,0.15)",
                  color: "#4ade80", border: "1px solid rgba(74,222,128,0.3)",
                  fontWeight: 600, fontSize: 12, cursor: checkingOut[r.id] ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap", flexShrink: 0,
                }}
              >
                {checkingOut[r.id] ? "Checking out…" : "✓ Checkout"}
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: "14px 20px", display: "flex", justifyContent: "flex-end" }}>
          <button onClick={dismiss} style={{
            padding: "8px 20px", borderRadius: "var(--radius-sm)",
            background: "transparent", color: "var(--text-muted)",
            border: "1px solid var(--border)", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}>
            Dismiss for Today
          </button>
        </div>
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout, theme, onToggleTheme }) {
  const navLink = (item) => (
    <NavLink
      key={item.to}
      to={item.to}
      end={item.to === "/"}
      className={({ isActive }) => "nav-link" + (isActive ? " active" : "")}
    >
      <span className="nav-icon">{item.icon}</span>
      {item.label}
    </NavLink>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">♛</span>
        <span className="brand-name">Annapurna</span>
        <span className="brand-sub">Banquets &amp; Inn</span>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Operations</div>
        {navItems.map(navLink)}

        <div className="sidebar-section-label">Guest Management</div>
        {navItems2.map(navLink)}

        <div className="sidebar-section-label">Analytics &amp; Reports</div>
        {navItems3.map(navLink)}
      </nav>

      <div className="sidebar-user-panel">
        <div className="sidebar-user-info">
          <div className="sidebar-user-avatar">
            {(user?.fullName || user?.username || "A")[0].toUpperCase()}
          </div>
          <div className="sidebar-user-text">
            <span className="sidebar-user-name">{user?.fullName || user?.username}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button className="sidebar-logout-btn" onClick={onLogout} title="Logout">
          ⏻
        </button>
      </div>
    </aside>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });

  const [theme, setTheme] = useState(() => localStorage.getItem("theme") || "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogin = (data) => {
    const u = { username: data.username, fullName: data.fullName, role: data.role };
    setUser(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  };

  const handleToggleTheme = () => setTheme(t => t === "dark" ? "light" : "dark");

  if (!user || !localStorage.getItem("token")) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <BrowserRouter>
      <div style={{ display: "flex", minHeight: "100vh", width: "100%" }}>
        <CheckoutAlert />
        <AIChatWidget />
        <Sidebar user={user} onLogout={handleLogout} theme={theme} onToggleTheme={handleToggleTheme} />
        <div className="main-content">
          <Routes>
            <Route path="/"                    element={<Dashboard />}              />
            <Route path="/stay-view"           element={<StayViewPage />}           />
            <Route path="/rooms"               element={<RoomsView />}              />
            <Route path="/reservations"        element={<ReservationList />}        />
            <Route path="/create"              element={<CreateReservation />}      />
            <Route path="/guests"              element={<GuestsPage />}             />
            <Route path="/companies"           element={<CompaniesPage />}          />
            <Route path="/analytics"           element={<AnalyticsPage />}          />
            <Route path="/reports"             element={<ReportsPage />}            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
