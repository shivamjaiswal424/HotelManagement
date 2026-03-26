import React, { useState } from "react";
import { api } from "../api";

export default function ReportsPage() {
  const [reportType, setReportType] = useState("arrival");
  const today = new Date().toISOString().split("T")[0];
  const [from, setFrom] = useState(today);
  const [to, setTo]     = useState(today);
  const [rows, setRows] = useState([]);
  const [salesSummary, setSalesSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (reportType === "arrival") {
        const res = await api.get("/reports/arrival", { params: { from, to } });
        setRows(res.data);
        setSalesSummary(null);
      } else {
        const res = await api.get("/reports/sales-summary", { params: { from, to } });
        setSalesSummary(res.data);
        setRows([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const statusBadge = (s) => {
    if (s === "BOOKED")      return <span className="badge badge-blue">Booked</span>;
    if (s === "CHECKED_IN")  return <span className="badge badge-green">Checked In</span>;
    if (s === "CHECKED_OUT") return <span className="badge badge-gold">Checked Out</span>;
    return <span className="badge badge-yellow">{s}</span>;
  };

  return (
    <div>
      <div className="page-header">
        <h2>Reports</h2>
        <p className="page-subtitle">Arrival & Sales summary reports</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 24, maxWidth: 600 }}>
          <div className="form-grid" style={{ alignItems: "flex-end" }}>
            <div className="form-group">
              <label className="form-label">Report Type</label>
              <select className="form-select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                <option value="arrival">Arrival Report</option>
                <option value="sales">Sales Summary</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">From</label>
              <input className="form-input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">To</label>
              <input className="form-input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <button className="btn btn-primary" onClick={submit} disabled={loading} style={{ width: "100%" }}>
                {loading ? "Loading…" : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {salesSummary && (
          <div>
            <div className="section-heading">Sales Summary</div>
            <div className="summary-grid">
              <div className="summary-tile">
                <div className="tile-label">Room Nights Sold</div>
                <div className="tile-value">{salesSummary.roomNightsSold}</div>
              </div>
              <div className="summary-tile">
                <div className="tile-label">Occupancy</div>
                <div className="tile-value">{salesSummary.occupancyPercent}%</div>
              </div>
              <div className="summary-tile">
                <div className="tile-label">Total Revenue</div>
                <div className="tile-value">₹{salesSummary.totalRevenue?.toLocaleString()}</div>
              </div>
              <div className="summary-tile">
                <div className="tile-label">Avg Room Rate</div>
                <div className="tile-value">₹{Math.round(salesSummary.avgRoomRate)?.toLocaleString()}</div>
              </div>
            </div>
          </div>
        )}

        {rows.length > 0 && (
          <div>
            <div className="section-heading">Arrival Report — {rows.length} record{rows.length !== 1 ? "s" : ""}</div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Guest</th>
                    <th>Room</th>
                    <th>Source</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>PAX</th>
                    <th>Status</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.reservationId}>
                      <td>{r.reservationId}</td>
                      <td>{r.guestName}</td>
                      <td>{r.roomNo}</td>
                      <td><span className="badge badge-blue">{r.source}</span></td>
                      <td>{r.checkIn}</td>
                      <td>{r.checkOut}</td>
                      <td>{r.pax}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>₹{r.amount?.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!salesSummary && rows.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>Select a report type and date range, then click Generate</p>
          </div>
        )}
      </div>
    </div>
  );
}
