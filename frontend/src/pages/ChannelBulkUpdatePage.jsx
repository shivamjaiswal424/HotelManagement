import React, { useEffect, useState } from "react";
import { api } from "../api";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export default function ChannelBulkUpdatePage() {
  const [type, setType] = useState("RATE");
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate]     = useState(today);
  const [weekdays, setWeekdays] = useState([...WEEKDAYS]);

  const [ratePlans, setRatePlans] = useState([]);
  const [selected, setSelected]   = useState({});
  const [values, setValues]       = useState({});
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get("/channel/rateplans").then((res) => {
      setRatePlans(res.data);
      const sel = {}, val = {};
      res.data.forEach((rp) => { sel[rp.id] = true; val[rp.id] = 0; });
      setSelected(sel);
      setValues(val);
    });
  }, []);

  const toggleWeekday = (d) =>
    setWeekdays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);

  const submit = async () => {
    setLoading(true);
    try {
      if (type === "RATE") {
        const updates = ratePlans
          .filter((rp) => selected[rp.id])
          .map((rp) => ({ ratePlanId: rp.id, value: Number(values[rp.id] || 0) }));
        const res = await api.post("/channel/bulk-update/rate", { fromDate, toDate, weekdays, updates });
        alert(`✅ Rate updated — ${res.data.updated} calendar entries modified`);
      } else {
        const updates = ["DELUXE", "SUPER_DELUXE"].map((rt) => ({
          roomType: rt,
          value: Number(values[rt] || 0),
        }));
        const res = await api.post("/channel/bulk-update/inventory", { fromDate, toDate, weekdays, updates });
        alert(`✅ Inventory updated — ${res.data.updated} calendar entries modified`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Channel Manager</h2>
        <p className="page-subtitle">Bulk update rates and inventory across date ranges</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="card" style={{ maxWidth: 720 }}>
          <div className="section-heading">Date Range & Type</div>

          <div className="form-grid" style={{ marginBottom: 20 }}>
            <div className="form-group">
              <label className="form-label">From Date</label>
              <input className="form-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To Date</label>
              <input className="form-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Update Type</label>
            <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
              {["RATE", "INVENTORY"].map((t) => (
                <label key={t} style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 16px",
                  borderRadius: "var(--radius-sm)", cursor: "pointer",
                  border: `1px solid ${type === t ? "var(--accent)" : "var(--border)"}`,
                  background: type === t ? "var(--accent-glow)" : "transparent",
                  color: type === t ? "var(--accent)" : "var(--text-secondary)",
                  fontWeight: 600, fontSize: 13,
                }}>
                  <input type="radio" checked={type === t} onChange={() => setType(t)} style={{ display: "none" }} />
                  {t === "RATE" ? "📈 Rate" : "📦 Inventory"}
                </label>
              ))}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 24 }}>
            <label className="form-label">Apply on Weekdays</label>
            <div className="checkbox-group" style={{ marginTop: 8 }}>
              {WEEKDAYS.map((d) => (
                <label key={d} className={"checkbox-chip " + (weekdays.includes(d) ? "checked" : "")} onClick={() => toggleWeekday(d)}>
                  <input type="checkbox" checked={weekdays.includes(d)} onChange={() => {}} />
                  {d}
                </label>
              ))}
            </div>
          </div>

          <div className="section-heading">
            {type === "RATE" ? "Rate Plans" : "Room Type Inventory"}
          </div>

          {type === "RATE" ? (
            ratePlans.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No rate plans found</p>
            ) : (
              <div className="table-wrap" style={{ marginBottom: 20 }}>
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>✓</th>
                      <th>Rate Plan</th>
                      <th>Room Type</th>
                      <th>New Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ratePlans.map((rp) => (
                      <tr key={rp.id}>
                        <td>
                          <input type="checkbox" checked={!!selected[rp.id]}
                            onChange={(e) => setSelected((p) => ({ ...p, [rp.id]: e.target.checked }))}
                            style={{ accentColor: "var(--accent)" }} />
                        </td>
                        <td>{rp.name}</td>
                        <td><span className="badge badge-gold">{rp.roomType?.replace("_", " ")}</span></td>
                        <td>
                          <input className="form-input" type="number" placeholder="0"
                            value={values[rp.id] || ""}
                            onChange={(e) => setValues((p) => ({ ...p, [rp.id]: e.target.value }))}
                            style={{ maxWidth: 120 }} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {["DELUXE", "SUPER_DELUXE"].map((rt) => (
                <div key={rt} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <span className="badge badge-gold" style={{ minWidth: 120 }}>{rt.replace("_", " ")}</span>
                  <input className="form-input" type="number" placeholder="Available rooms"
                    value={values[rt] || ""}
                    onChange={(e) => setValues((p) => ({ ...p, [rt]: e.target.value }))}
                    style={{ maxWidth: 180 }} />
                </div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button className="btn btn-primary" onClick={submit} disabled={loading}>
              {loading ? "Updating…" : "⚡ Apply Bulk Update"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
