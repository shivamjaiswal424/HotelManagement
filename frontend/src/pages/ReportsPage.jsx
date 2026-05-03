import React, { useState } from "react";
import { api } from "../api";

// ── Report catalogue ──────────────────────────────────────────────────────────
const REPORTS = [
  { key: "arrival",             label: "Arrival Report",               group: "Front Office",  date: "range"  },
  { key: "departure",           label: "Departure Report",             group: "Front Office",  date: "range"  },
  { key: "night-audit",         label: "Night Audit Report",           group: "Front Office",  date: "single" },
  { key: "forecast",            label: "Daily Forecast Report",        group: "Front Office",  date: "range"  },
  { key: "room-status",         label: "Room Status Report",           group: "Front Office",  date: "none"   },
  { key: "no-show",             label: "No Show Report",               group: "Front Office",  date: "range"  },
  { key: "police-enquiry",      label: "Police Enquiry Report",        group: "Front Office",  date: "range"  },
  { key: "mgmt-block",          label: "Management Block Report",      group: "Front Office",  date: "range"  },
  { key: "oo-rooms",            label: "Out of Order Room Report",     group: "Front Office",  date: "none"   },
  { key: "maintenance",         label: "Maintenance Report",           group: "Front Office",  date: "none"   },
  { key: "room-wise",           label: "Room Wise Revenue Report",     group: "Accounting",    date: "range"  },
  { key: "date-wise",           label: "Date Wise Revenue Report",     group: "Accounting",    date: "range"  },
  { key: "checkout-accounting", label: "Checkout Based Accounting",    group: "Accounting",    date: "range"  },
  { key: "payments-report",     label: "Payments Report",              group: "Accounting",    date: "range"  },
  { key: "item-consumption",    label: "Item Consumption Report",      group: "Accounting",    date: "range"  },
  { key: "pos-report",          label: "POS Report",                   group: "Accounting",    date: "range"  },
  { key: "payment-void",        label: "Payment Void Report",          group: "Accounting",    date: "range"  },
  { key: "expense",             label: "Expense Report",               group: "Accounting",    date: "range"  },
  { key: "city-ledger",         label: "City Ledger Payment Report",   group: "Accounting",    date: "range"  },
  { key: "hotel-sales",         label: "Hotel Sales Report",           group: "Management",    date: "range"  },
  { key: "monthly-perf",        label: "Monthly Performance Report",   group: "Management",    date: "range"  },
  { key: "company-perf",        label: "Company Performance",          group: "Management",    date: "range"  },
];

const GROUPS = ["Front Office", "Accounting", "Management"];

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt   = (d) => d ? new Date(d + (d.length === 10 ? "T00:00:00" : "")).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const inr   = (n) => n != null ? `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—";
const pct   = (n) => `${n ?? 0}%`;
const occColor = (p) => p >= 70 ? "#4ade80" : p >= 40 ? "#fbbf24" : "#f87171";

const statusBadge = (s) => {
  const map = { BOOKED: "badge-blue", CHECKED_IN: "badge-green", CHECKED_OUT: "badge-gold" };
  return <span className={`badge ${map[s] || "badge-yellow"}`}>{s?.replace(/_/g, " ")}</span>;
};

const sourceBadge = (src) => (
  <span className="badge badge-blue" style={{ fontSize: 11 }}>{src}</span>
);

const roomTypePill = (t) => (
  <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 10,
    background: t === "SUPER_DELUXE" ? "#7c3aed22" : "#1d4ed822",
    color:      t === "SUPER_DELUXE" ? "#a78bfa"   : "#60a5fa" }}>
    {t?.replace(/_/g, " ")}
  </span>
);

// ── Shared: Arrival / Departure / Police Enquiry / Mgmt Block tables ─────────
function GuestListTable({ data, label, emptyIcon = "📋" }) {
  if (!data.length) return (
    <div className="empty-state"><div className="empty-icon">{emptyIcon}</div>
      <p>No records found in this date range</p></div>
  );
  const total = data.reduce((s, r) => s + (r.amount || 0), 0);
  return (
    <div>
      <div className="section-heading">{label} — {data.length} record{data.length !== 1 ? "s" : ""}</div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Guest</th><th>Mobile</th><th>Email</th>
            <th>Source</th><th>Meal</th><th>Room</th>
            <th>Check-in</th><th>Check-out</th><th>PAX</th><th>Status</th><th>Amount</th>
          </tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.reservationId}>
                <td>{r.reservationId}</td>
                <td style={{ fontWeight: 500 }}>{r.guestName}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.guestPhone || "—"}</td>
                <td style={{ color: "var(--text-muted)", fontSize: 12 }}>{r.guestEmail || "—"}</td>
                <td>{sourceBadge(r.source)}</td>
                <td>{r.mealPlan || "—"}</td>
                <td><strong>{r.roomNo}</strong></td>
                <td>{fmt(r.checkIn)}</td><td>{fmt(r.checkOut)}</td>
                <td>{r.pax}</td>
                <td>{statusBadge(r.status)}</td>
                <td>{inr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={11} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(total)}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Night Audit ───────────────────────────────────────────────────────────────
function NightAuditView({ data }) {
  return (
    <div>
      <div className="section-heading">Night Audit — {fmt(data.date)}</div>
      <div className="summary-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px,1fr))", marginBottom: 24 }}>
        {[
          { label:"Total Rooms",  value: data.totalRooms },
          { label:"Occupied",     value: data.occupied },
          { label:"Occupancy",    value: pct(data.occupancyPercent), color: occColor(data.occupancyPercent) },
          { label:"Arrivals",     value: data.arrivals,   color: "#60a5fa" },
          { label:"Departures",   value: data.departures, color: "#f59e0b" },
          { label:"Revenue",      value: inr(data.revenue) },
        ].map(t => (
          <div key={t.label} className="summary-tile">
            <div className="tile-label">{t.label}</div>
            <div className="tile-value" style={t.color ? { color:t.color } : {}}>{t.value}</div>
          </div>
        ))}
      </div>
      {data.lineItems?.length > 0 && (
        <>
          <div className="section-heading" style={{ fontSize:14 }}>In-House Guests</div>
          <div className="table-wrap">
            <table>
              <thead><tr>
                <th>#</th><th>Guest</th><th>Source</th><th>Room</th>
                <th>Check-in</th><th>Check-out</th><th>PAX</th><th>Status</th>
                <th>Rate/Night</th><th>Services</th><th>Tax</th><th>Total</th><th>Paid</th><th>Balance</th><th>Mobile</th>
              </tr></thead>
              <tbody>
                {data.lineItems.map((l, i) => (
                  <tr key={l.reservationId}>
                    <td>{i+1}</td>
                    <td style={{ fontWeight:500 }}>{l.guestName}</td>
                    <td>{sourceBadge(l.source)}</td>
                    <td><strong>{l.roomNumber}</strong></td>
                    <td>{fmt(l.checkIn)}</td><td>{fmt(l.checkOut)}</td>
                    <td>{l.pax}</td><td>{statusBadge(l.status)}</td>
                    <td>{inr(l.nightlyRate)}</td>
                    <td>{inr(l.serviceCharges)}</td>
                    <td style={{ color:"#f59e0b" }}>{inr(l.tax)}</td>
                    <td style={{ fontWeight:600 }}>{inr(l.totalAmount)}</td>
                    <td style={{ color:"#4ade80" }}>{inr(l.totalPaid)}</td>
                    <td style={{ color: l.balance > 0 ? "#f87171" : "#4ade80", fontWeight:600 }}>{inr(l.balance)}</td>
                    <td style={{ color:"var(--text-muted)", fontSize:12 }}>{l.guestPhone}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot><tr>
                <td colSpan={8} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Totals</td>
                <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.nightlyRate,0))}</td>
                <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.serviceCharges,0))}</td>
                <td style={{ fontWeight:700, color:"#f59e0b", padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.tax,0))}</td>
                <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.totalAmount,0))}</td>
                <td style={{ fontWeight:700, color:"#4ade80", padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.totalPaid,0))}</td>
                <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.lineItems.reduce((s,l)=>s+l.balance,0))}</td>
                <td/>
              </tr></tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Forecast ──────────────────────────────────────────────────────────────────
function ForecastView({ data }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">📅</div><p>No data for this range</p></div>;
  return (
    <div>
      <div className="section-heading">Daily Forecast Report</div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Occ%</th><th>Occupied</th><th>Available</th>
            <th>Revenue</th><th>ARR</th><th>PMS</th><th>OTA</th><th>Walk-in</th><th>Phone</th><th>Email</th>
          </tr></thead>
          <tbody>
            {data.map(d => (
              <tr key={d.date}>
                <td style={{ fontWeight:500 }}>{fmt(d.date)}</td>
                <td><span style={{ color:occColor(d.occupancyPercent), fontWeight:600 }}>{pct(d.occupancyPercent)}</span></td>
                <td>{d.occupied}</td>
                <td style={{ color:"var(--text-muted)" }}>{d.available}</td>
                <td style={{ fontWeight:600 }}>{inr(d.revenue)}</td>
                <td>{inr(d.arr)}</td>
                <td>{inr(d.pmsRevenue)}</td><td>{inr(d.otaRevenue)}</td>
                <td>{inr(d.walkInRevenue)}</td><td>{inr(d.phoneRevenue)}</td><td>{inr(d.emailRevenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={4} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(data.reduce((s,d)=>s+d.revenue,0))}</td>
            <td/>
            {["pmsRevenue","otaRevenue","walkInRevenue","phoneRevenue","emailRevenue"].map(k=>(
              <td key={k} style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.reduce((s,d)=>s+(d[k]||0),0))}</td>
            ))}
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Room Status ───────────────────────────────────────────────────────────────
function RoomStatusView({ data }) {
  const counts = {};
  data.forEach(r => { counts[r.roomStatus] = (counts[r.roomStatus]||0)+1; });
  return (
    <div>
      <div className="section-heading">Room Status Report</div>
      <div className="summary-grid" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", marginBottom:24 }}>
        {Object.entries(counts).map(([status, count]) => (
          <div key={status} className="summary-tile">
            <div className="tile-label">{status.replace(/_/g," ")}</div>
            <div className="tile-value" style={{ color: status==="OCCUPIED"?"#f59e0b":status==="AVAILABLE"?"#4ade80":"#f87171" }}>{count}</div>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Room</th><th>Type</th><th>Status</th><th>Current Guest</th><th>Mobile</th><th>Check-in</th><th>Check-out</th><th>PAX</th></tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.roomNumber}>
                <td><strong>{r.roomNumber}</strong></td>
                <td>{roomTypePill(r.roomType)}</td>
                <td>
                  <span style={{ fontSize:12, padding:"2px 8px", borderRadius:10, fontWeight:600,
                    background: r.roomStatus==="OCCUPIED"?"#78350f22":r.roomStatus==="AVAILABLE"?"#14532d22":"#7f1d1d22",
                    color:      r.roomStatus==="OCCUPIED"?"#fbbf24":r.roomStatus==="AVAILABLE"?"#4ade80":"#f87171" }}>
                    {r.roomStatus}
                  </span>
                </td>
                <td style={{ fontWeight: r.currentGuest?500:undefined, color: r.currentGuest?undefined:"var(--text-muted)" }}>
                  {r.currentGuest||"—"}
                </td>
                <td style={{ color:"var(--text-muted)", fontSize:12 }}>{r.guestPhone||"—"}</td>
                <td>{r.checkIn?fmt(r.checkIn):"—"}</td>
                <td>{r.checkOut?fmt(r.checkOut):"—"}</td>
                <td>{r.pax||"—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── OO / Maintenance Rooms ────────────────────────────────────────────────────
function OORoomsView({ data, label }) {
  if (!data.length) return (
    <div className="empty-state"><div className="empty-icon">✅</div>
      <p>No rooms currently in {label.toLowerCase()} status</p></div>
  );
  return (
    <div>
      <div className="section-heading">{label} — {data.length} room{data.length!==1?"s":""}</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Room</th><th>Type</th><th>Status</th></tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.roomNumber}>
                <td><strong>{r.roomNumber}</strong></td>
                <td>{roomTypePill(r.roomType)}</td>
                <td><span style={{ fontSize:12, padding:"2px 8px", borderRadius:10, fontWeight:600,
                  background:"#7f1d1d22", color:"#f87171" }}>{r.roomStatus.replace(/_/g," ")}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Room Wise Revenue ─────────────────────────────────────────────────────────
function RoomWiseView({ data }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">🛏</div><p>No reservations in this date range</p></div>;
  return (
    <div>
      <div className="section-heading">Room Wise Revenue — {data.length} rooms</div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Room</th><th>Type</th><th>Nights Sold</th><th>Revenue</th></tr></thead>
          <tbody>
            {data.map((r,i) => (
              <tr key={i}>
                <td><strong>{r.roomNumber}</strong></td>
                <td>{roomTypePill(r.roomType)}</td>
                <td>{r.nightsSold}</td>
                <td>{inr(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={2} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{data.reduce((s,r)=>s+r.nightsSold,0)}</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.revenue,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Date Wise / Monthly Performance ──────────────────────────────────────────
function DateWiseView({ data, label }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">📅</div><p>No data for this date range</p></div>;
  return (
    <div>
      <div className="section-heading">{label}</div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Date</th><th>Occ%</th><th>Occupied</th><th>Available</th>
            <th>Revenue</th><th>ARR</th><th>PMS</th><th>OTA</th><th>Walk-in</th><th>Phone</th><th>Email</th>
            <th>CGST 6%</th><th>SGST 6%</th><th>CGST 9%</th><th>SGST 9%</th>
          </tr></thead>
          <tbody>
            {data.map(d => (
              <tr key={d.date}>
                <td style={{ fontWeight:500 }}>{fmt(d.date)}</td>
                <td><span style={{ color:occColor(d.occupancyPercent), fontWeight:600 }}>{pct(d.occupancyPercent)}</span></td>
                <td>{d.occupied}</td>
                <td style={{ color:"var(--text-muted)" }}>{d.available}</td>
                <td style={{ fontWeight:600 }}>{inr(d.totalRevenue)}</td>
                <td>{inr(d.arr)}</td>
                <td>{inr(d.pmsRevenue)}</td><td>{inr(d.otaRevenue)}</td>
                <td>{inr(d.walkInRevenue)}</td><td>{inr(d.phoneRevenue)}</td><td>{inr(d.emailRevenue)}</td>
                <td style={{ color:"#f59e0b" }}>{inr(d.cgst6)}</td>
                <td style={{ color:"#f59e0b" }}>{inr(d.sgst6)}</td>
                <td style={{ color:"#fb923c" }}>{inr(d.cgst9)}</td>
                <td style={{ color:"#fb923c" }}>{inr(d.sgst9)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={4} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            {["totalRevenue","arr","pmsRevenue","otaRevenue","walkInRevenue","phoneRevenue","emailRevenue","cgst6","sgst6","cgst9","sgst9"].map(k=>(
              <td key={k} style={{ fontWeight:700, padding:"10px 12px" }}>
                {k==="arr" ? "" : inr(data.reduce((s,d)=>s+(d[k]||0),0))}
              </td>
            ))}
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Checkout Accounting ───────────────────────────────────────────────────────
function CheckoutAccountingView({ data }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">🧾</div><p>No checkouts in this date range</p></div>;
  return (
    <div>
      <div className="section-heading">Checkout Based Accounting — {data.length} records</div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>#</th><th>Guest</th><th>Mobile</th><th>Room</th><th>Type</th>
            <th>Source</th><th>Meal</th><th>Payment</th>
            <th>Check-in</th><th>Check-out</th><th>Nights</th><th>PAX</th>
            <th>Room Charges</th><th>Services</th><th>Total</th><th>Paid</th><th>Balance</th>
          </tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.reservationId}>
                <td>{r.reservationId}</td>
                <td style={{ fontWeight:500 }}>{r.guestName}</td>
                <td style={{ color:"var(--text-muted)", fontSize:12 }}>{r.guestPhone}</td>
                <td><strong>{r.roomNumber}</strong></td>
                <td>{roomTypePill(r.roomType)}</td>
                <td>{sourceBadge(r.source)}</td>
                <td>{r.mealPlan}</td>
                <td style={{ fontSize:12 }}>{r.paymentMode?.replace(/_/g," ")}</td>
                <td>{fmt(r.checkIn)}</td><td>{fmt(r.checkOut)}</td>
                <td>{r.nights}</td><td>{r.pax}</td>
                <td>{inr(r.roomCharges)}</td>
                <td>{inr(r.serviceCharges)}</td>
                <td style={{ fontWeight:600 }}>{inr(r.totalCharges)}</td>
                <td style={{ color:"#4ade80" }}>{inr(r.totalPaid)}</td>
                <td style={{ color: r.balance>0?"#f87171":"#4ade80", fontWeight:600 }}>{inr(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={12} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Totals</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.roomCharges,0))}</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.serviceCharges,0))}</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.totalCharges,0))}</td>
            <td style={{ fontWeight:700, color:"#4ade80", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.totalPaid,0))}</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.balance,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Payments / City Ledger ────────────────────────────────────────────────────
function PaymentsView({ data, label }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">💳</div><p>No records in this date range</p></div>;
  const byMode = {};
  data.forEach(p => { byMode[p.paymentMode] = (byMode[p.paymentMode]||0)+p.amount; });
  return (
    <div>
      <div className="section-heading">{label} — {data.length} entries</div>
      <div className="summary-grid" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", marginBottom:24 }}>
        {Object.entries(byMode).map(([mode, amt]) => (
          <div key={mode} className="summary-tile">
            <div className="tile-label">{mode?.replace(/_/g," ")}</div>
            <div className="tile-value">{inr(amt)}</div>
          </div>
        ))}
        <div className="summary-tile">
          <div className="tile-label">Total Collected</div>
          <div className="tile-value" style={{ color:"#4ade80" }}>{inr(data.reduce((s,p)=>s+p.amount,0))}</div>
        </div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Date</th><th>Guest</th><th>Room</th><th>Mode</th><th>Amount</th><th>Remarks</th></tr></thead>
          <tbody>
            {data.map((p,i) => (
              <tr key={p.paymentId}>
                <td>{i+1}</td>
                <td>{fmt(p.paymentDate)}</td>
                <td style={{ fontWeight:500 }}>{p.guestName}</td>
                <td><strong>{p.roomNumber}</strong></td>
                <td><span className="badge badge-green" style={{ fontSize:11 }}>{p.paymentMode?.replace(/_/g," ")}</span></td>
                <td style={{ fontWeight:600, color:"#4ade80" }}>{inr(p.amount)}</td>
                <td style={{ color:"var(--text-muted)", fontSize:12 }}>{p.remarks||"—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={5} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, color:"#4ade80", padding:"10px 12px" }}>{inr(data.reduce((s,p)=>s+p.amount,0))}</td>
            <td/>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Item Consumption / POS / Expense ─────────────────────────────────────────
function ItemConsumptionView({ data, label }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">🍽</div><p>No records in this date range</p></div>;
  const byDesc = {};
  data.forEach(r => { byDesc[r.description] = (byDesc[r.description]||0)+r.amount; });
  return (
    <div>
      <div className="section-heading">{label} — {data.length} entries</div>
      <div className="summary-grid" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(180px,1fr))", marginBottom:24 }}>
        {Object.entries(byDesc).slice(0,6).map(([desc,amt]) => (
          <div key={desc} className="summary-tile">
            <div className="tile-label">{desc}</div>
            <div className="tile-value" style={{ fontSize:22 }}>{inr(amt)}</div>
          </div>
        ))}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Date</th><th>Description</th><th>Guest</th><th>Room</th><th>Amount</th></tr></thead>
          <tbody>
            {data.map((r,i) => (
              <tr key={i}>
                <td>{i+1}</td>
                <td>{fmt(r.date)}</td>
                <td style={{ fontWeight:500 }}>{r.description}</td>
                <td>{r.guestName}</td>
                <td><strong>{r.roomNumber}</strong></td>
                <td style={{ fontWeight:600, color:"var(--accent)" }}>{inr(r.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td colSpan={5} style={{ textAlign:"right", fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.amount,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Hotel Sales ───────────────────────────────────────────────────────────────
function HotelSalesView({ data }) {
  return (
    <div>
      <div className="section-heading">Hotel Sales Report</div>
      <div className="summary-grid" style={{ gridTemplateColumns:"repeat(auto-fill, minmax(160px,1fr))", marginBottom:24 }}>
        {[
          { label:"Room Nights Sold", value: data.roomNightsSold },
          { label:"Occupancy",        value: pct(data.occupancyPercent), color: occColor(data.occupancyPercent) },
          { label:"ARR",              value: inr(data.arr) },
          { label:"Total Revenue",    value: inr(data.totalRevenue),    color:"var(--accent)" },
          { label:"Room Revenue",     value: inr(data.roomRevenue) },
          { label:"Service Revenue",  value: inr(data.serviceRevenue) },
        ].map(t => (
          <div key={t.label} className="summary-tile">
            <div className="tile-label">{t.label}</div>
            <div className="tile-value" style={t.color?{color:t.color}:{}}>{t.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24 }}>
        {[
          { title:"By Meal Plan", rows: data.mealPlanBreakdown },
          { title:"By Source of Business", rows: data.sourceBreakdown },
        ].map(sec => (
          <div key={sec.title}>
            <div className="section-heading" style={{ fontSize:14 }}>{sec.title}</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>{sec.title.includes("Meal")?"Meal Plan":"Source"}</th><th>Revenue</th><th>Room Nights</th><th>ARR</th></tr></thead>
                <tbody>
                  {sec.rows?.map(s => (
                    <tr key={s.label}>
                      <td style={{ fontWeight:600 }}>{s.label}</td>
                      <td>{inr(s.revenue)}</td>
                      <td>{s.roomNights}</td>
                      <td>{inr(s.arr)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr>
                  <td style={{ fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
                  <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(sec.rows?.reduce((s,r)=>s+r.revenue,0))}</td>
                  <td style={{ fontWeight:700, padding:"10px 12px" }}>{sec.rows?.reduce((s,r)=>s+r.roomNights,0)}</td>
                  <td/>
                </tr></tfoot>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Company Performance ───────────────────────────────────────────────────────
function CompanyPerfView({ data }) {
  if (!data.length) return <div className="empty-state"><div className="empty-icon">🏢</div><p>No data for this period</p></div>;
  return (
    <div>
      <div className="section-heading">Company Performance — by Booking Source</div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>Source</th><th>Reservations</th><th>Room Nights</th>
            <th>Revenue</th><th>ARR</th><th>Total Paid</th><th>Outstanding</th>
          </tr></thead>
          <tbody>
            {data.map(r => (
              <tr key={r.source}>
                <td><strong>{r.source}</strong></td>
                <td>{r.reservationCount}</td>
                <td>{r.roomNights}</td>
                <td style={{ fontWeight:600 }}>{inr(r.revenue)}</td>
                <td>{inr(r.arr)}</td>
                <td style={{ color:"#4ade80" }}>{inr(r.totalPaid)}</td>
                <td style={{ color: r.outstanding>0?"#f87171":"#4ade80", fontWeight:600 }}>{inr(r.outstanding)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr>
            <td style={{ fontWeight:600, color:"var(--text-secondary)", padding:"10px 12px" }}>Total</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{data.reduce((s,r)=>s+r.reservationCount,0)}</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{data.reduce((s,r)=>s+r.roomNights,0)}</td>
            <td style={{ fontWeight:700, color:"var(--accent)", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.revenue,0))}</td>
            <td/>
            <td style={{ fontWeight:700, color:"#4ade80", padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.totalPaid,0))}</td>
            <td style={{ fontWeight:700, padding:"10px 12px" }}>{inr(data.reduce((s,r)=>s+r.outstanding,0))}</td>
          </tr></tfoot>
        </table>
      </div>
    </div>
  );
}

// ── Payment Void (no void concept) ───────────────────────────────────────────
function PaymentVoidView() {
  return (
    <div>
      <div className="section-heading">Payment Void Report</div>
      <div className="empty-state" style={{ border:"1px solid var(--border)", borderRadius:"var(--radius)", background:"var(--bg-card)" }}>
        <div className="empty-icon">✓</div>
        <p>No void transactions recorded in this period.</p>
        <p style={{ fontSize:12, marginTop:8, color:"var(--text-muted)" }}>Payment voids are not yet tracked in this system.</p>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const _now  = new Date();
  const today = `${_now.getFullYear()}-${String(_now.getMonth()+1).padStart(2,"0")}-${String(_now.getDate()).padStart(2,"0")}`;
  const _ma   = new Date(Date.now() - 30*86400000);
  const monthAgo = `${_ma.getFullYear()}-${String(_ma.getMonth()+1).padStart(2,"0")}-${String(_ma.getDate()).padStart(2,"0")}`;

  const [reportKey, setReportKey] = useState("arrival");
  const [from, setFrom]           = useState(monthAgo);
  const [to,   setTo]             = useState(today);
  const [result, setResult]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  const current = REPORTS.find(r => r.key === reportKey);
  const p       = { params: { from, to } };

  const generate = async () => {
    setLoading(true); setResult(null); setError(null);
    try {
      let res;
      switch (reportKey) {
        case "arrival":             res = await api.get("/reports/arrival", p);                setResult({ type:"arrival",    data:res.data, label:"Arrival Report" });              break;
        case "departure":           res = await api.get("/reports/departure", p);              setResult({ type:"arrival",    data:res.data, label:"Departure Report" });            break;
        case "police-enquiry":      res = await api.get("/reports/police-enquiry", p);         setResult({ type:"arrival",    data:res.data, label:"Police Enquiry / Guest Register" }); break;
        case "mgmt-block":          res = await api.get("/reports/mgmt-block", p);             setResult({ type:"arrival",    data:res.data, label:"Management Block (Upcoming BOOKED)" }); break;
        case "no-show":             res = await api.get("/reports/no-show", p);                setResult({ type:"arrival",    data:res.data, label:"No Show Report" });              break;
        case "night-audit":         res = await api.get("/reports/night-audit", { params:{ date:from } }); setResult({ type:"night-audit", data:res.data }); break;
        case "forecast":            res = await api.get("/reports/forecast", p);               setResult({ type:"forecast",   data:res.data });                                      break;
        case "room-status":         res = await api.get("/reports/room-status");               setResult({ type:"room-status",data:res.data });                                      break;
        case "oo-rooms":
        case "maintenance":         res = await api.get("/reports/oo-rooms");                  setResult({ type:"oo-rooms",   data:res.data, label: reportKey==="maintenance" ? "Maintenance Report" : "Out of Order Room Report" }); break;
        case "room-wise":           res = await api.get("/reports/room-wise", p);              setResult({ type:"room-wise",  data:res.data });                                      break;
        case "date-wise":           res = await api.get("/reports/date-wise", p);              setResult({ type:"date-wise",  data:res.data, label:"Date Wise Revenue Report" });    break;
        case "monthly-perf":        res = await api.get("/reports/date-wise", p);              setResult({ type:"date-wise",  data:res.data, label:"Monthly Performance Report" });  break;
        case "checkout-accounting": res = await api.get("/reports/checkout-accounting", p);    setResult({ type:"checkout",   data:res.data });                                      break;
        case "payments-report":     res = await api.get("/reports/payments-report", p);        setResult({ type:"payments",   data:res.data, label:"Payments Report" });             break;
        case "city-ledger":         res = await api.get("/reports/city-ledger", p);            setResult({ type:"payments",   data:res.data, label:"City Ledger Payment Report" });  break;
        case "item-consumption":    res = await api.get("/reports/item-consumption", p);       setResult({ type:"items",      data:res.data, label:"Item Consumption Report" });     break;
        case "pos-report":          res = await api.get("/reports/item-consumption", p);       setResult({ type:"items",      data:res.data, label:"POS Report" });                  break;
        case "expense":             res = await api.get("/reports/item-consumption", p);       setResult({ type:"items",      data:res.data, label:"Expense Report" });              break;
        case "payment-void":        res = await api.get("/reports/payment-void", p);           setResult({ type:"void" });                                                           break;
        case "hotel-sales":         res = await api.get("/reports/hotel-sales", p);            setResult({ type:"hotel-sales",data:res.data });                                      break;
        case "company-perf":        res = await api.get("/reports/company-perf", p);           setResult({ type:"company",    data:res.data });                                      break;
        default: break;
      }
    } catch (e) {
      setError(e.response?.data?.message || "Failed to load report. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Reports</h2>
        <p className="page-subtitle">Front Office · Accounting · Management</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* Controls */}
        <div className="card" style={{ marginBottom:24 }}>
          <div style={{ display:"flex", flexWrap:"wrap", gap:16, alignItems:"flex-end" }}>
            <div className="form-group" style={{ minWidth:260, flex:"1 1 260px" }}>
              <label className="form-label">Select Report</label>
              <select className="form-select" value={reportKey}
                onChange={e => { setReportKey(e.target.value); setResult(null); setError(null); }}>
                {GROUPS.map(g => (
                  <optgroup key={g} label={g}>
                    {REPORTS.filter(r => r.group === g).map(r => (
                      <option key={r.key} value={r.key}>{r.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {current?.date === "range" && (<>
              <div className="form-group">
                <label className="form-label">From Date</label>
                <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">To Date</label>
                <input className="form-input" type="date" value={to} onChange={e => setTo(e.target.value)} />
              </div>
            </>)}

            {current?.date === "single" && (
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
              </div>
            )}

            {current?.date === "none" && (
              <div className="form-group">
                <label className="form-label" style={{ color:"var(--text-muted)" }}>Date</label>
                <div className="form-input" style={{ color:"var(--text-muted)", cursor:"default" }}>Current snapshot</div>
              </div>
            )}

            <div>
              <button className="btn btn-primary" onClick={generate} disabled={loading} style={{ minWidth:140 }}>
                {loading ? "Loading…" : "Generate Report"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="card" style={{ color:"#f87171", marginBottom:16, display:"flex", alignItems:"center", gap:8 }}>
            ⚠ {error}
          </div>
        )}

        {result?.type === "arrival"     && <GuestListTable    data={result.data} label={result.label} />}
        {result?.type === "night-audit" && <NightAuditView    data={result.data} />}
        {result?.type === "forecast"    && <ForecastView      data={result.data} />}
        {result?.type === "room-status" && <RoomStatusView    data={result.data} />}
        {result?.type === "oo-rooms"    && <OORoomsView       data={result.data} label={result.label} />}
        {result?.type === "room-wise"   && <RoomWiseView      data={result.data} />}
        {result?.type === "date-wise"   && <DateWiseView      data={result.data} label={result.label} />}
        {result?.type === "checkout"    && <CheckoutAccountingView data={result.data} />}
        {result?.type === "payments"    && <PaymentsView      data={result.data} label={result.label} />}
        {result?.type === "items"       && <ItemConsumptionView   data={result.data} label={result.label} />}
        {result?.type === "hotel-sales" && <HotelSalesView    data={result.data} />}
        {result?.type === "company"     && <CompanyPerfView   data={result.data} />}
        {result?.type === "void"        && <PaymentVoidView />}

        {!result && !loading && (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <p>Select a report type and click Generate Report</p>
          </div>
        )}
      </div>
    </div>
  );
}
