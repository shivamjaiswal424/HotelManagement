import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api";

const CELL_W        = 140;
const ROW_H         = 48;
const ROOM_COL      = 80;
const NUM_DAYS      = 7;
const CHECKIN_HOUR  = 12;          // 12:00 PM
const CHECKOUT_HOUR = 10;          // 10:00 AM
const CI_PX  = Math.round(CHECKIN_HOUR  / 24 * CELL_W);  // px offset into CI column
const CO_PX  = Math.round(CHECKOUT_HOUR / 24 * CELL_W);  // px offset into CO column

const STATUS_COLORS = {
  BOOKED:      { bg: "#1e3a6e", border: "#3b82f6", text: "#bfdbfe", label: "Booked"      },
  CHECKED_IN:  { bg: "#14532d", border: "#22c55e", text: "#bbf7d0", label: "Checked In"  },
  CHECKED_OUT: { bg: "#1f2937", border: "#6b7280", text: "#9ca3af", label: "Checked Out" },
  CANCELED:    { bg: "#450a0a", border: "#ef4444", text: "#fecaca", label: "Canceled"    },
};

const MEAL_LABELS   = { EP: "EP – Room Only", CP: "CP – Breakfast", MAP: "MAP – Half Board", AP: "AP – Full Board" };
const SOURCE_LABELS = { PMS: "PMS", OTA: "OTA", WALK_IN: "Walk-in", PHONE: "Phone", EMAIL: "Email" };

const isUnavailable = (status) => status === "OUT_OF_ORDER" || status === "MAINTENANCE";

function toLocalISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return toLocalISO(d);
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDay(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short" });
}

function fmtShort(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export default function StayViewPage() {
  const today = toLocalISO(new Date());
  const [startDate, setStartDate]       = useState(today);
  const [rooms, setRooms]               = useState([]);
  const [stayData, setStayData]         = useState([]);
  const [loading, setLoading]           = useState(false);
  const [selected, setSelected]         = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const dates  = Array.from({ length: NUM_DAYS }, (_, i) => addDays(startDate, i));
  const endDate = addDays(startDate, NUM_DAYS - 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [roomsRes, stayRes] = await Promise.all([
        api.get("/rooms"),
        api.get("/reservations/stay-view", { params: { from: startDate, to: endDate } }),
      ]);
      setRooms(roomsRes.data);
      setStayData(stayRes.data);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { load(); }, [load]);

  const doCheckIn = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/reservations/${id}/checkin`);
      setSelected(null); load();
    } catch (err) {
      alert(err.response?.data?.message || "Check-in failed.");
    } finally { setActionLoading(false); }
  };

  const doCheckOut = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/reservations/${id}/checkout`);
      setSelected(null); load();
    } finally { setActionLoading(false); }
  };

  // Group rooms by type
  const roomsByType = rooms.reduce((acc, r) => {
    const t = r.roomType || "OTHER";
    if (!acc[t]) acc[t] = [];
    acc[t].push(r);
    return acc;
  }, {});

  const resvForRoom = (roomNo) => stayData.filter(s => s.roomNumber === roomNo);

  // Bar geometry respecting real check-in/checkout times:
  //   Check-in  = 12:00 PM → bar starts CI_PX into the check-in column
  //   Check-out = 10:00 AM → bar ends  CO_PX into the checkout column
  // When an edge is outside the visible range the bar is clamped flush.
  const getBar = (resv) => {
    const ci = resv.checkIn;
    const co = resv.checkOut;
    const offsetStart = daysBetween(startDate, ci);
    const offsetEnd   = daysBetween(startDate, co);

    const showCI = offsetStart >= 0 && offsetStart < NUM_DAYS;
    const showCO = offsetEnd   >= 0 && offsetEnd   < NUM_DAYS;

    const left  = showCI
      ? offsetStart * CELL_W + CI_PX                 // 12 PM into CI column
      : Math.max(0, offsetStart) * CELL_W;           // clamped flush left

    const right = showCO
      ? offsetEnd * CELL_W + CO_PX                   // 10 AM into CO column
      : Math.min(NUM_DAYS, offsetEnd) * CELL_W;      // clamped flush right

    const width = right - left;
    if (width <= 0) return null;
    const colors = STATUS_COLORS[resv.status] || STATUS_COLORS.BOOKED;
    return { left, width, colors, showCI, showCO };
  };

  const unavailableRooms = rooms.filter(r => isUnavailable(r.status)).length;

  const availablePerDate = dates.map(d => {
    const occupied = stayData.filter(s =>
      s.checkIn <= d && s.checkOut > d &&
      (s.status === "BOOKED" || s.status === "CHECKED_IN")
    ).length;
    return rooms.length - occupied - unavailableRooms;
  });

  // Summary counts
  const totalRooms    = rooms.length;
  const occupiedNow   = rooms.filter(r => r.status === "OCCUPIED").length;
  const availableNow  = rooms.filter(r => r.status === "AVAILABLE").length;
  const maintenanceNow= rooms.filter(r => r.status === "MAINTENANCE" || r.status === "OUT_OF_ORDER").length;
  const checkingInToday  = stayData.filter(s => s.checkIn  === today && s.status === "BOOKED").length;
  const checkingOutToday = stayData.filter(s => s.checkOut === today && s.status === "CHECKED_IN").length;

  return (
    <div>
      <div className="page-header">
        <h2>Stay View</h2>
        <p className="page-subtitle">Room-wise booking calendar</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* Summary bar */}
        <div className="stay-summary-bar">
          <span className="stay-summary-item">
            <span className="dot dot-green" /> Occupied: <strong>{occupiedNow}</strong>
          </span>
          <span className="stay-summary-item">
            <span className="dot dot-blue" /> Available: <strong>{availableNow}</strong>
          </span>
          <span className="stay-summary-item">
            <span className="dot dot-yellow" /> Maintenance: <strong>{maintenanceNow}</strong>
          </span>
          {checkingInToday > 0 && (
            <span className="stay-summary-item" style={{ color: "#22c55e", fontWeight: 600 }}>
              ▶ Arriving Today: <strong>{checkingInToday}</strong>
            </span>
          )}
          {checkingOutToday > 0 && (
            <span className="stay-summary-item" style={{ color: "#f97316", fontWeight: 600 }}>
              ◀ Departing Today: <strong>{checkingOutToday}</strong>
            </span>
          )}
          <span className="stay-summary-item" style={{ marginLeft: "auto" }}>
            Total: <strong>{totalRooms}</strong> rooms
          </span>
        </div>

        {/* Date navigation */}
        <div className="stay-nav">
          <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, -7))}>&#8249; Prev Week</button>
          <span className="stay-range">{fmtDate(startDate)} — {fmtDate(endDate)}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, 7))}>Next Week &#8250;</button>
          <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(today)}>Today</button>
          {loading && <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>Loading…</span>}
        </div>

        {/* Legend */}
        <div className="stay-legend">
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <span key={s} className="stay-legend-item">
              <span style={{ display: "inline-block", width: 12, height: 12, borderRadius: 2, background: c.border, marginRight: 4 }} />
              {c.label}
            </span>
          ))}
          <span className="stay-legend-item" style={{ marginLeft: 12 }}>
            <span style={{ color: "#22c55e", marginRight: 4 }}>▶</span> Check-in
          </span>
          <span className="stay-legend-item">
            <span style={{ color: "#f97316", marginRight: 4 }}>◀</span> Checkout
          </span>
        </div>

        {/* Gantt grid */}
        <div className="stay-grid-wrap">
          <div style={{ minWidth: ROOM_COL + NUM_DAYS * CELL_W + 16 }}>

            {/* Header row */}
            <div className="stay-header-row">
              <div className="stay-room-cell stay-header-room">Room</div>
              {dates.map(d => (
                <div key={d} className={"stay-date-cell stay-header-date" + (d === today ? " today" : "")}>
                  <div className="stay-date-day">{fmtDay(d)}</div>
                  <div className="stay-date-num">{fmtShort(d)}</div>
                </div>
              ))}
            </div>

            {/* Room type groups */}
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                <div className="stay-group-header">
                  <span>{type.replace("_", " ")}</span>
                </div>

                {typeRooms
                  .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true }))
                  .map(room => {
                    const roomResvs = resvForRoom(room.roomNumber);
                    const ooo = isUnavailable(room.status);
                    const dotClass = room.status === "AVAILABLE" ? "dot-green"
                                   : room.status === "OCCUPIED"  ? "dot-red"
                                   : "dot-yellow";
                    return (
                      <div key={room.roomNumber} className="stay-room-row"
                        style={ooo ? { background: "rgba(239,68,68,0.04)" } : {}}>
                        <div className="stay-room-cell">
                          <span className="stay-room-no">{room.roomNumber}</span>
                          <span className={"stay-room-dot " + dotClass} />
                          {ooo && (
                            <span style={{
                              fontSize: 9, fontWeight: 700, color: "#ef4444",
                              background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                              borderRadius: 3, padding: "1px 4px", marginLeft: 4,
                            }}>
                              {room.status === "MAINTENANCE" ? "MAINT" : "OOO"}
                            </span>
                          )}
                        </div>

                        {/* Timeline */}
                        <div className="stay-timeline" style={{ width: NUM_DAYS * CELL_W }}>
                          {dates.map((d, i) => (
                            <div key={d} className={"stay-day-bg" + (d === today ? " today-col" : "")}
                                 style={{ left: i * CELL_W, width: CELL_W }} />
                          ))}

                          {/* OOO hatched overlay */}
                          {ooo && (
                            <div style={{
                              position: "absolute", inset: 2,
                              backgroundImage: "repeating-linear-gradient(135deg, rgba(239,68,68,0.18) 0px, rgba(239,68,68,0.18) 2px, transparent 2px, transparent 10px)",
                              borderRadius: 3, pointerEvents: "none", zIndex: 1,
                              display: "flex", alignItems: "center", paddingLeft: 10,
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", opacity: 0.85 }}>
                                {room.status === "MAINTENANCE" ? "Under Maintenance" : "Out of Order"}
                              </span>
                            </div>
                          )}

                          {/* Reservation bars */}
                          {roomResvs.map(resv => {
                            const bar = getBar(resv);
                            if (!bar) return null;
                            const { left, width, colors, showCI, showCO } = bar;
                            return (
                              <div key={resv.reservationId}
                                className="stay-bar"
                                style={{
                                  left, width,
                                  background: colors.bg,
                                  border: `1px solid ${colors.border}`,
                                  color: colors.text,
                                  zIndex: 2,
                                  display: "flex",
                                  alignItems: "center",
                                  overflow: "hidden",
                                  gap: 4,
                                  // Round only the edges that represent actual CI/CO
                                  borderRadius: `${showCI ? 4 : 0}px ${showCO ? 4 : 0}px ${showCO ? 4 : 0}px ${showCI ? 4 : 0}px`,
                                }}
                                onClick={() => setSelected(resv)}
                                title={`${resv.guestName}  |  CI: ${fmtShort(resv.checkIn)}  →  CO: ${fmtShort(resv.checkOut)}`}
                              >
                                {/* Check-in marker */}
                                {showCI && (
                                  <span style={{
                                    fontSize: 11, color: "#4ade80", flexShrink: 0,
                                    paddingLeft: 5, lineHeight: 1,
                                  }}>▶</span>
                                )}

                                {/* Guest name + dates */}
                                <span style={{
                                  fontSize: 11, fontWeight: 600, flex: 1,
                                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                }}>
                                  {resv.guestName}
                                  {width >= 160 && (
                                    <span style={{ fontWeight: 400, opacity: 0.75, marginLeft: 5 }}>
                                      {fmtShort(resv.checkIn)} – {fmtShort(resv.checkOut)}
                                    </span>
                                  )}
                                </span>

                                {/* Checkout marker */}
                                {showCO && (
                                  <span style={{
                                    fontSize: 11, color: "#fb923c", flexShrink: 0,
                                    paddingRight: 5, lineHeight: 1,
                                  }}>◀</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ))}

            {/* Available rooms footer */}
            <div className="stay-footer-row">
              <div className="stay-room-cell" style={{ fontSize: 11, color: "var(--text-muted)" }}>Available</div>
              {availablePerDate.map((cnt, i) => (
                <div key={i} className="stay-date-cell stay-avail-cell">
                  <span style={{ color: cnt > 0 ? "var(--green)" : "var(--red)", fontWeight: 600 }}>{cnt}</span>
                </div>
              ))}
            </div>

          </div>
        </div>

        {/* Detail popup */}
        {selected && (
          <div className="stay-popup-overlay" onClick={() => setSelected(null)}>
            <div className="stay-popup" onClick={e => e.stopPropagation()}>
              <div className="stay-popup-header">
                <span>Reservation #{selected.reservationId}</span>
                <button className="stay-popup-close" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="stay-popup-body">
                <div className="stay-popup-row"><span>Guest</span><strong>{selected.guestName}</strong></div>
                <div className="stay-popup-row"><span>Phone</span><strong>{selected.guestPhone || "—"}</strong></div>
                <div className="stay-popup-row"><span>Room</span><strong>{selected.roomNumber} ({selected.roomType?.replace("_", " ")})</strong></div>

                {/* CI / CO with visual indicator */}
                <div className="stay-popup-row">
                  <span>Check-in</span>
                  <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: "#4ade80", fontSize: 12 }}>▶</span>
                    {fmtDate(selected.checkIn)}
                    {selected.checkIn === today && (
                      <span style={{ fontSize: 10, background: "rgba(74,222,128,0.15)", color: "#4ade80",
                        border: "1px solid rgba(74,222,128,0.4)", borderRadius: 3, padding: "1px 5px" }}>
                        Today
                      </span>
                    )}
                  </strong>
                </div>
                <div className="stay-popup-row">
                  <span>Checkout</span>
                  <strong style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ color: "#fb923c", fontSize: 12 }}>◀</span>
                    {fmtDate(selected.checkOut)}
                    {selected.checkOut === today && (
                      <span style={{ fontSize: 10, background: "rgba(249,115,22,0.15)", color: "#fb923c",
                        border: "1px solid rgba(249,115,22,0.4)", borderRadius: 3, padding: "1px 5px" }}>
                        Today
                      </span>
                    )}
                  </strong>
                </div>

                <div className="stay-popup-row">
                  <span>Nights</span>
                  <strong>{daysBetween(selected.checkIn, selected.checkOut)}</strong>
                </div>
                <div className="stay-popup-row"><span>Guests</span><strong>{selected.guestsCount} pax</strong></div>
                <div className="stay-popup-row"><span>Amount</span><strong>₹{selected.amount?.toLocaleString("en-IN")}</strong></div>
                {selected.mealPlan && (
                  <div className="stay-popup-row"><span>Meal Plan</span><strong>{MEAL_LABELS[selected.mealPlan] || selected.mealPlan}</strong></div>
                )}
                {selected.source && (
                  <div className="stay-popup-row"><span>Source</span><strong>{SOURCE_LABELS[selected.source] || selected.source}</strong></div>
                )}
                <div className="stay-popup-row">
                  <span>Status</span>
                  <strong style={{ color: STATUS_COLORS[selected.status]?.border }}>
                    {STATUS_COLORS[selected.status]?.label || selected.status}
                  </strong>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, padding: "12px 0 0", borderTop: "1px solid var(--border)", marginTop: 4 }}>
                {selected.status === "BOOKED" && selected.checkIn <= today && (
                  <button className="btn btn-success btn-sm" style={{ flex: 1 }}
                    disabled={actionLoading} onClick={() => doCheckIn(selected.reservationId)}>
                    {actionLoading ? "…" : "▶ Check In"}
                  </button>
                )}
                {selected.status === "BOOKED" && selected.checkIn > today && (
                  <span style={{ fontSize: 12, color: "var(--text-muted)", padding: "6px 0" }}>
                    Check-in available from {fmtDate(selected.checkIn)}
                  </span>
                )}
                {selected.status === "CHECKED_IN" && (
                  <button className="btn btn-danger btn-sm" style={{ flex: 1 }}
                    disabled={actionLoading} onClick={() => doCheckOut(selected.reservationId)}>
                    {actionLoading ? "…" : "◀ Check Out"}
                  </button>
                )}
                <button className="btn btn-secondary btn-sm" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
