import React, { useEffect, useState } from "react";
import { api } from "../api";
import PricingRecommendations from "./PricingRecommendations";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Legend,
} from "recharts";

const PIE_COLORS = {
  AVAILABLE:   "#22c55e",
  OCCUPIED:    "#ef4444",
  MAINTENANCE: "#f59e0b",
  OUT_OF_ORDER:"#6b7280",
};

function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(m) - 1];
}

const CustomPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const R = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + R * Math.cos(-midAngle * Math.PI / 180);
  const y = cy + R * Math.sin(-midAngle * Math.PI / 180);
  return <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>{`${(percent*100).toFixed(0)}%`}</text>;
};

export default function Dashboard() {
  const [rooms, setRooms]             = useState([]);
  const [reservations, setReservations] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    api.get("/rooms").then(res => setRooms(res.data));
    api.get("/reservations").then(res => setReservations(res.data));
    api.get("/analytics/monthly").then(res =>
      setMonthlyData(res.data.map(d => ({ ...d, monthLabel: fmtMonth(d.month) })))
    );
  }, []);

  const totalRooms     = rooms.length;
  const occupiedRooms  = rooms.filter(r => r.status === "OCCUPIED").length;
  const availableRooms = rooms.filter(r => r.status === "AVAILABLE").length;
  const maintenance    = rooms.filter(r => r.status === "MAINTENANCE" || r.status === "OUT_OF_ORDER").length;
  const occupancy      = totalRooms === 0 ? 0 : Math.round((occupiedRooms / totalRooms) * 100);

  // Today's check-ins/check-outs
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  const pendingArrivals = reservations.filter(r => r.checkInDate === today && r.status === "BOOKED").length;
  const arrivedToday    = reservations.filter(r => r.checkInDate === today && r.status === "CHECKED_IN").length;
  const todayDepartures = reservations.filter(r => r.checkOutDate === today).length;
  const totalRevenue    = reservations.reduce((s, r) => s + (r.amount || 0), 0);

  // ADR: total revenue / total nights booked
  const totalNights = reservations.reduce((s, r) => {
    if (!r.checkInDate || !r.checkOutDate) return s;
    const diff = Math.round((new Date(r.checkOutDate) - new Date(r.checkInDate)) / 86400000);
    return s + Math.max(0, diff);
  }, 0);
  const adr = totalNights > 0 ? Math.round(totalRevenue / totalNights) : 0;

  // Pie chart data
  const statusGroups = [
    { name: "Available",    value: availableRooms,  color: PIE_COLORS.AVAILABLE   },
    { name: "Occupied",     value: occupiedRooms,   color: PIE_COLORS.OCCUPIED    },
    { name: "Maintenance",  value: maintenance,     color: PIE_COLORS.MAINTENANCE },
  ].filter(d => d.value > 0);

  const statusBadge = (s) => {
    if (s === "BOOKED")      return <span className="badge badge-blue">Booked</span>;
    if (s === "CHECKED_IN")  return <span className="badge badge-green">Checked In</span>;
    if (s === "CHECKED_OUT") return <span className="badge badge-gold">Checked Out</span>;
    return <span className="badge badge-yellow">{s}</span>;
  };

  const todayStr = new Date().toLocaleDateString("en-IN", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div>
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-subtitle">{todayStr}</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* KPI stats */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <span className="stat-label">Occupancy Today</span>
            <span className="stat-value" style={{ color: occupancy > 70 ? "#4ade80" : occupancy > 40 ? "#fbbf24" : "#f87171" }}>
              {occupancy}%
            </span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">ADR</span>
            <span className="stat-value" style={{ fontSize: 20 }}>₹{adr.toLocaleString()}</span>
            <span className="stat-icon">🏷</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Pending Arrivals</span>
            <span className="stat-value" style={{ color: "#f59e0b" }}>{pendingArrivals}</span>
            <span className="stat-icon">⏳</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Arrived Today</span>
            <span className="stat-value" style={{ color: "#60a5fa" }}>{arrivedToday}</span>
            <span className="stat-icon">🛬</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Departures Today</span>
            <span className="stat-value" style={{ color: "#f59e0b" }}>{todayDepartures}</span>
            <span className="stat-icon">🛫</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Revenue</span>
            <span className="stat-value" style={{ fontSize: 18 }}>₹{Math.round(totalRevenue).toLocaleString()}</span>
            <span className="stat-icon">💰</span>
          </div>
        </div>

        {/* Charts row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 20, marginBottom: 28 }}>

          {/* Room status donut */}
          <div className="card">
            <div className="section-heading">Room Status</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <ResponsiveContainer width="60%" height={170}>
                <PieChart>
                  <Pie data={statusGroups} cx="50%" cy="50%" innerRadius={45} outerRadius={75}
                       dataKey="value" labelLine={false} label={<CustomPieLabel />}>
                    {statusGroups.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{
                    background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12,
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {statusGroups.map(s => (
                  <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    <span style={{ color: "var(--text-secondary)" }}>{s.name}</span>
                    <span style={{ color: s.color, fontWeight: 700, marginLeft: "auto" }}>{s.value}</span>
                  </div>
                ))}
                <div style={{ marginTop: 4, paddingTop: 8, borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-muted)" }}>
                  Total: {totalRooms} rooms
                </div>
              </div>
            </div>
          </div>

          {/* Monthly Revenue bar */}
          <div className="card">
            <div className="section-heading">Revenue (Last 6 Months)</div>
            {monthlyData.length === 0 ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 170, color: "var(--text-muted)", fontSize: 13 }}>
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={170}>
                <BarChart data={monthlyData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="monthLabel" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                         tickFormatter={v => v >= 1000 ? "₹" + Math.round(v/1000) + "k" : "₹" + v} />
                  <Tooltip
                    contentStyle={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => ["₹" + v.toLocaleString(), "Revenue"]}
                  />
                  <Bar dataKey="revenue" fill="#c9a84c" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Smart Pricing */}
        <PricingRecommendations />

        {/* Recent Reservations */}
        <div className="section-heading">Recent Reservations</div>
        {reservations.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No reservations yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Guest</th>
                  <th>Room</th>
                  <th>Check-in</th>
                  <th>Check-out</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reservations.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.guestName}</td>
                    <td>{r.room?.roomNumber ?? "—"}</td>
                    <td>{r.checkInDate ?? "—"}</td>
                    <td>{r.checkOutDate ?? "—"}</td>
                    <td>₹{r.amount?.toLocaleString() ?? "—"}</td>
                    <td>{statusBadge(r.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
