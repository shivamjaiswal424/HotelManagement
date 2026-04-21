import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";

import Dashboard             from "./pages/Dashboard";
import RoomsView             from "./pages/RoomsView";
import ReservationList       from "./pages/ReservationList";
import CreateReservation     from "./pages/CreateReservation";
import GuestsPage            from "./pages/GuestsPage";
import CompaniesPage         from "./pages/CompaniesPage";
import ReportsPage           from "./pages/ReportsPage";
import ChannelBulkUpdatePage from "./pages/ChannelBulkUpdatePage";
import StayViewPage          from "./pages/StayViewPage";
import AnalyticsPage         from "./pages/AnalyticsPage";
import LoginPage             from "./pages/LoginPage";

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
  { to: "/channel-bulk-update", icon: "⚡",  label: "Channel Manager" },
];

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
            <Route path="/channel-bulk-update" element={<ChannelBulkUpdatePage />}  />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
