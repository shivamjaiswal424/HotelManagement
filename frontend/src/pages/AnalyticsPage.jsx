import React, { useEffect, useState } from "react";
import { api } from "../api";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Area, AreaChart,
} from "recharts";

const GOLD   = "#c9a84c";
const GREEN  = "#22c55e";
const BLUE   = "#3b82f6";
const PURPLE = "#a855f7";

function fmtMonth(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[parseInt(m) - 1] + " " + y.slice(2);
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-card)", border: "1px solid var(--border)",
      borderRadius: 8, padding: "10px 14px", fontSize: 13,
    }}>
      <p style={{ color: "var(--accent)", fontWeight: 700, marginBottom: 6 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.name === "Revenue (₹)" ? "₹" + Number(p.value).toLocaleString() : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState("performance");

  useEffect(() => {
    setLoading(true);
    api.get("/analytics/monthly").then(res => {
      setData(res.data.map(d => ({ ...d, monthLabel: fmtMonth(d.month) })));
    }).finally(() => setLoading(false));
  }, []);

  const totalRevenue   = data.reduce((s, d) => s + (d.revenue || 0), 0);
  const totalBookings  = data.reduce((s, d) => s + (d.reservations || 0), 0);
  const avgOccupancy   = data.length ? Math.round(data.reduce((s, d) => s + (d.occupancyPercent || 0), 0) / data.length) : 0;
  const avgRate        = data.length ? Math.round(data.reduce((s, d) => s + (d.avgRate || 0), 0) / data.length) : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Analytics</h2>
        <p className="page-subtitle">Hotel performance & trend analysis</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* KPI cards */}
        <div className="stats-grid" style={{ marginBottom: 28 }}>
          <div className="stat-card">
            <span className="stat-label">Total Revenue (6 mo)</span>
            <span className="stat-value" style={{ fontSize: 22 }}>₹{Math.round(totalRevenue).toLocaleString()}</span>
            <span className="stat-icon">💰</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Reservations</span>
            <span className="stat-value">{totalBookings}</span>
            <span className="stat-icon">📋</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg Occupancy</span>
            <span className="stat-value">{avgOccupancy}%</span>
            <span className="stat-icon">📈</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Avg Room Rate</span>
            <span className="stat-value">₹{avgRate.toLocaleString()}</span>
            <span className="stat-icon">🏷</span>
          </div>
        </div>

        {/* Tab selector */}
        <div className="analytics-tabs">
          {[["performance", "Hotel Performance"], ["trend", "Trend Analysis"]].map(([key, label]) => (
            <button key={key}
              className={"analytics-tab" + (tab === key ? " active" : "")}
              onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty-state"><p>Loading data…</p></div>
        ) : data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>No reservation data yet. Create some reservations to see analytics.</p>
          </div>
        ) : tab === "performance" ? (
          <div>
            {/* Revenue bar chart */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-heading">Monthly Revenue (₹)</div>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="monthLabel" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                         tickFormatter={v => "₹" + (v >= 1000 ? Math.round(v/1000) + "k" : v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="revenue" name="Revenue (₹)" fill={GOLD} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Occupancy + ARR */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div className="card">
                <div className="section-heading">Occupancy % by Month</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="monthLabel" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }} unit="%" domain={[0, 100]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="occupancyPercent" name="Occupancy %" stroke={GREEN} fill={GREEN + "33"} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="card">
                <div className="section-heading">Average Room Rate (ARR)</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="monthLabel" tick={{ fill: "var(--text-secondary)", fontSize: 11 }} />
                    <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
                           tickFormatter={v => "₹" + v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="avgRate" name="ARR (₹)" stroke={BLUE} strokeWidth={2} dot={{ r: 4, fill: BLUE }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Reservations trend */}
            <div className="card" style={{ marginBottom: 24 }}>
              <div className="section-heading">Reservations by Month</div>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="monthLabel" tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                  <YAxis tick={{ fill: "var(--text-secondary)", fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="reservations" name="Reservations" fill={PURPLE} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Monthly data table */}
            <div className="card">
              <div className="section-heading">Monthly Performance Table</div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Reservations</th>
                      <th>Occupancy %</th>
                      <th>Revenue (₹)</th>
                      <th>Avg Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map(d => (
                      <tr key={d.month}>
                        <td><strong>{d.monthLabel}</strong></td>
                        <td>{d.reservations}</td>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ flex: 1, height: 6, background: "var(--bg-base)", borderRadius: 3 }}>
                              <div style={{ width: `${Math.min(100, d.occupancyPercent)}%`, height: "100%", background: GREEN, borderRadius: 3 }} />
                            </div>
                            <span>{d.occupancyPercent}%</span>
                          </div>
                        </td>
                        <td>₹{d.revenue?.toLocaleString()}</td>
                        <td>₹{d.avgRate?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ fontWeight: 700, borderTop: "2px solid var(--border)" }}>
                      <td>Total</td>
                      <td>{totalBookings}</td>
                      <td>{avgOccupancy}%</td>
                      <td>₹{Math.round(totalRevenue).toLocaleString()}</td>
                      <td>₹{avgRate.toLocaleString()}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
