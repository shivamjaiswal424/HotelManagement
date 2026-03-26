import React, { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_META = {
  AVAILABLE:   { cls: "available",    dot: "dot-green",  badge: "badge-green",  label: "Available"   },
  OCCUPIED:    { cls: "occupied",     dot: "dot-red",    badge: "badge-red",    label: "Occupied"    },
  MAINTENANCE: { cls: "maintenance",  dot: "dot-yellow", badge: "badge-yellow", label: "Maintenance" },
};

export default function RoomsView() {
  const [rooms, setRooms] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const loadRooms = async () => {
    const res = await api.get("/rooms");
    setRooms(res.data);
  };

  useEffect(() => { loadRooms(); }, []);

  const filtered = filter === "ALL" ? rooms : rooms.filter((r) => r.status === filter);

  const counts = {
    ALL:         rooms.length,
    AVAILABLE:   rooms.filter((r) => r.status === "AVAILABLE").length,
    OCCUPIED:    rooms.filter((r) => r.status === "OCCUPIED").length,
    MAINTENANCE: rooms.filter((r) => r.status === "MAINTENANCE").length,
  };

  return (
    <div>
      <div className="page-header">
        <h2>Rooms View</h2>
        <p className="page-subtitle">Live floor plan — {rooms.length} rooms total</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="legend" style={{ marginBottom: 20 }}>
          {["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map((s) => {
            const meta = STATUS_META[s];
            return (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={"btn btn-sm " + (filter === s ? "btn-primary" : "btn-secondary")}
                style={{ gap: 6 }}
              >
                {meta && <span className={"room-status-dot " + meta.dot} />}
                {s === "ALL" ? "All Rooms" : meta.label} ({counts[s]})
              </button>
            );
          })}
          <button className="btn btn-secondary btn-sm" onClick={loadRooms} style={{ marginLeft: "auto" }}>
            ↻ Refresh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🛏</div>
            <p>No rooms match this filter</p>
          </div>
        ) : (
          <div className="rooms-grid">
            {filtered.map((room) => {
              const meta = STATUS_META[room.status] || { cls: "", dot: "", badge: "badge-gold", label: room.status };
              return (
                <div key={room.id} className={"room-card " + meta.cls}>
                  <div className="room-number">{room.roomNumber}</div>
                  <div className="room-type">{room.roomType?.replace("_", " ")}</div>
                  <span className={"badge " + meta.badge} style={{ marginTop: 4 }}>
                    <span className={"room-status-dot " + meta.dot} />
                    {meta.label}
                  </span>
                  <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                    ₹{room.basePrice?.toLocaleString()}/night
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
