import React, { useEffect, useState } from "react";
import { api } from "../api";

const statusBadge = (status) => {
  if (status === "BOOKED")      return <span className="badge badge-blue">Booked</span>;
  if (status === "CHECKED_IN")  return <span className="badge badge-green">Checked In</span>;
  if (status === "CHECKED_OUT") return <span className="badge badge-gold">Checked Out</span>;
  if (status === "CANCELLED")   return <span className="badge badge-yellow">Cancelled</span>;
  return <span className="badge badge-yellow">{status}</span>;
};

const TABS = [
  { key: "ALL",        label: "All" },
  { key: "BOOKED",     label: "Upcoming" },
  { key: "CHECKED_IN", label: "Checked In" },
  { key: "CHECKED_OUT",label: "Checked Out" },
];

export default function ReservationList() {
  const [reservations, setReservations] = useState([]);
  const [filter, setFilter] = useState("ALL");

  const load = async () => {
    const res = await api.get("/reservations");
    setReservations(res.data);
  };

  useEffect(() => { load(); }, []);

  const today = new Date().toISOString().split("T")[0];

  const checkIn = async (id) => {
    try {
      await api.put(`/reservations/${id}/checkin`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data || "Check-in failed.");
    }
  };

  const checkOut = async (id) => {
    await api.put(`/reservations/${id}/checkout`);
    load();
  };

  const filtered = filter === "ALL"
    ? reservations
    : reservations.filter(r => r.status === filter);

  const counts = {
    ALL:         reservations.length,
    BOOKED:      reservations.filter(r => r.status === "BOOKED").length,
    CHECKED_IN:  reservations.filter(r => r.status === "CHECKED_IN").length,
    CHECKED_OUT: reservations.filter(r => r.status === "CHECKED_OUT").length,
  };

  return (
    <div>
      <div className="page-header">
        <h2>Reservations</h2>
        <p className="page-subtitle">{reservations.length} reservation{reservations.length !== 1 ? "s" : ""} total</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div className="analytics-tabs" style={{ marginBottom: 20 }}>
          {TABS.map(t => (
            <button
              key={t.key}
              className={"analytics-tab" + (filter === t.key ? " active" : "")}
              onClick={() => setFilter(t.key)}
            >
              {t.label}
              <span style={{
                marginLeft: 6,
                background: filter === t.key ? "rgba(255,255,255,0.2)" : "var(--border)",
                color: "var(--text-secondary)",
                borderRadius: 10,
                padding: "1px 7px",
                fontSize: 11,
              }}>
                {counts[t.key]}
              </span>
            </button>
          ))}
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: "auto" }} onClick={load}>
            ↻ Refresh
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <p>No reservations found</p>
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
                  <th>Guests</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const canCheckIn = r.status === "BOOKED" && r.checkInDate <= today;
                  const tooEarly   = r.status === "BOOKED" && r.checkInDate > today;
                  return (
                    <tr key={r.id}>
                      <td>{r.id}</td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{r.guestName}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.guestPhone}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{r.guestEmail}</div>
                      </td>
                      <td>
                        <div>{r.room?.roomNumber ?? "—"}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {r.room?.roomType?.replace("_", " ") ?? ""}
                        </div>
                      </td>
                      <td>{r.checkInDate ?? "—"}</td>
                      <td>{r.checkOutDate ?? "—"}</td>
                      <td style={{ textAlign: "center" }}>{r.guestsCount ?? "—"}</td>
                      <td>{r.amount != null ? `₹${r.amount.toLocaleString()}` : "—"}</td>
                      <td>{statusBadge(r.status)}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {canCheckIn && (
                            <button className="btn btn-success btn-sm" onClick={() => checkIn(r.id)}>
                              Check-in
                            </button>
                          )}
                          {tooEarly && (
                            <span title={`Check-in date is ${r.checkInDate}`} style={{
                              fontSize: 11, color: "var(--text-muted)",
                              background: "var(--bg-card)", border: "1px solid var(--border)",
                              borderRadius: 6, padding: "3px 8px", cursor: "not-allowed",
                            }}>
                              Arrives {r.checkInDate}
                            </span>
                          )}
                          {r.status === "CHECKED_IN" && (
                            <button className="btn btn-danger btn-sm" onClick={() => checkOut(r.id)}>
                              Check-out
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
