import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api";

const CELL_W   = 130; // px per day
const ROW_H    = 46;
const ROOM_COL = 80;
const NUM_DAYS = 7;

const STATUS_COLORS = {
  BOOKED:      { bg: "#1e40af", border: "#3b82f6", text: "#bfdbfe" },
  CHECKED_IN:  { bg: "#14532d", border: "#22c55e", text: "#bbf7d0" },
  CHECKED_OUT: { bg: "#374151", border: "#6b7280", text: "#d1d5db" },
  CANCELED:    { bg: "#7f1d1d", border: "#ef4444", text: "#fecaca" },
};

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}

function fmtDate(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function fmtDay(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "short" });
}

export default function StayViewPage() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [rooms, setRooms]         = useState([]);
  const [stayData, setStayData]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null); // clicked reservation

  const dates = Array.from({ length: NUM_DAYS }, (_, i) => addDays(startDate, i));
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

  // Group rooms by type
  const roomsByType = rooms.reduce((acc, r) => {
    const t = r.roomType || "OTHER";
    if (!acc[t]) acc[t] = [];
    acc[t].push(r);
    return acc;
  }, {});

  // Reservations per room
  const resvForRoom = (roomNo) => stayData.filter(s => s.roomNumber === roomNo);

  // Bar style calculation
  const getBar = (resv) => {
    const ci = resv.checkIn;
    const co = resv.checkOut;
    const offsetStart = daysBetween(startDate, ci);
    const offsetEnd   = daysBetween(startDate, co);
    const left  = Math.max(0, offsetStart) * CELL_W + 3;
    const right = Math.min(NUM_DAYS, offsetEnd) * CELL_W - 3;
    const width = right - left;
    if (width <= 0) return null;
    const colors = STATUS_COLORS[resv.status] || STATUS_COLORS.BOOKED;
    return { left, width, colors };
  };

  // Count available rooms per date
  const availablePerDate = dates.map(d => {
    const occupied = stayData.filter(s =>
      s.checkIn <= d && s.checkOut > d &&
      (s.status === "BOOKED" || s.status === "CHECKED_IN")
    ).length;
    return rooms.length - occupied;
  });

  const totalRooms    = rooms.length;
  const occupiedNow   = rooms.filter(r => r.status === "OCCUPIED").length;
  const availableNow  = rooms.filter(r => r.status === "AVAILABLE").length;
  const maintenanceNow= rooms.filter(r => r.status === "MAINTENANCE" || r.status === "OUT_OF_ORDER").length;

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
              {s.replace("_", " ")}
            </span>
          ))}
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
                  <div className="stay-date-num">{fmtDate(d)}</div>
                </div>
              ))}
            </div>

            {/* Room type groups */}
            {Object.entries(roomsByType).map(([type, typeRooms]) => (
              <div key={type}>
                {/* Group header */}
                <div className="stay-group-header">
                  <span>{type.replace("_", " ")}</span>
                </div>

                {/* Room rows */}
                {typeRooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, undefined, { numeric: true })).map(room => {
                  const roomResvs = resvForRoom(room.roomNumber);
                  return (
                    <div key={room.roomNumber} className="stay-room-row">
                      <div className="stay-room-cell">
                        <span className="stay-room-no">{room.roomNumber}</span>
                        <span className={"stay-room-dot " + (room.status === "AVAILABLE" ? "dot-green" : room.status === "OCCUPIED" ? "dot-red" : "dot-yellow")} />
                      </div>
                      {/* Timeline */}
                      <div className="stay-timeline" style={{ width: NUM_DAYS * CELL_W }}>
                        {/* Day column separators */}
                        {dates.map((d, i) => (
                          <div key={d} className={"stay-day-bg" + (d === today ? " today-col" : "")}
                               style={{ left: i * CELL_W, width: CELL_W }} />
                        ))}
                        {/* Reservation bars */}
                        {roomResvs.map(resv => {
                          const bar = getBar(resv);
                          if (!bar) return null;
                          return (
                            <div key={resv.reservationId}
                              className="stay-bar"
                              style={{
                                left: bar.left,
                                width: bar.width,
                                background: bar.colors.bg,
                                border: `1px solid ${bar.colors.border}`,
                                color: bar.colors.text,
                              }}
                              onClick={() => setSelected(resv)}
                              title={`${resv.guestName} | ${resv.checkIn} → ${resv.checkOut}`}
                            >
                              <span className="stay-bar-name">{resv.guestName}</span>
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
                <div className="stay-popup-row"><span>Check-in</span><strong>{selected.checkIn}</strong></div>
                <div className="stay-popup-row"><span>Check-out</span><strong>{selected.checkOut}</strong></div>
                <div className="stay-popup-row"><span>Guests</span><strong>{selected.guestsCount}</strong></div>
                <div className="stay-popup-row"><span>Amount</span><strong>₹{selected.amount?.toLocaleString()}</strong></div>
                <div className="stay-popup-row">
                  <span>Status</span>
                  <strong style={{ color: STATUS_COLORS[selected.status]?.border }}>
                    {selected.status?.replace("_", " ")}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
