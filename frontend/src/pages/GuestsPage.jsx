import React, { useEffect, useState } from "react";
import { api } from "../api";

const STATUS_STYLE = {
  IN_HOUSE:    { cls: "badge-green", label: "In House"    },
  UPCOMING:    { cls: "badge-blue",  label: "Upcoming"    },
  CHECKED_OUT: { cls: "badge-gold",  label: "Checked Out" },
};

function Avatar({ name }) {
  const initials = (name || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      background: "var(--accent-glow)", border: "2px solid var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: 13, fontWeight: 700, color: "var(--accent)", flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function GuestsPage() {
  const [guests, setGuests]   = useState([]);
  const [search, setSearch]   = useState("");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm]       = useState({ name: "", phone: "", email: "", city: "", country: "India" });
  const [saving, setSaving]   = useState(false);

  const load = async (q = search) => {
    setLoading(true);
    try {
      const res = await api.get("/guests", { params: q ? { search: q } : {} });
      setGuests(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(""); }, []);

  const handleKey = (e) => { if (e.key === "Enter") load(); };

  const saveGuest = async () => {
    if (!form.name.trim()) { alert("Name is required"); return; }
    setSaving(true);
    try {
      await api.post("/guests", form);
      setShowAdd(false);
      setForm({ name: "", phone: "", email: "", city: "", country: "India" });
      load("");
    } finally {
      setSaving(false);
    }
  };

  const totalSpent = selected ? selected.totalValue : 0;
  const avgPerStay = selected && selected.totalStays > 0
    ? Math.round(totalSpent / selected.totalStays) : 0;

  return (
    <div>
      <div className="page-header">
        <h2>Guests</h2>
        <p className="page-subtitle">Guest profiles, stay history &amp; lifetime spend</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="search-bar">
          <input
            className="form-input"
            placeholder="🔍  Search by name, email or phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKey}
            style={{ maxWidth: 340 }}
          />
          <button className="btn btn-primary" onClick={() => load()}>Search</button>
          {search && (
            <button className="btn btn-secondary" onClick={() => { setSearch(""); load(""); }}>Clear</button>
          )}
          <button
            className={"btn btn-" + (showAdd ? "secondary" : "primary")}
            style={{ marginLeft: "auto" }}
            onClick={() => setShowAdd(v => !v)}
          >
            {showAdd ? "✕ Cancel" : "＋ Add Guest"}
          </button>
        </div>

        {showAdd && (
          <div className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
            <div className="section-heading" style={{ marginBottom: 16 }}>New Guest Profile</div>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Full name" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" placeholder="+91 98765 43210" value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Email</label>
                <input className="form-input" type="email" placeholder="guest@email.com" value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" placeholder="City" value={form.city}
                  onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input className="form-input" placeholder="India" value={form.country}
                  onChange={e => setForm({ ...form, country: e.target.value })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveGuest} disabled={saving}>
                {saving ? "Saving…" : "Save Guest"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="empty-state"><p>Loading guests…</p></div>
        ) : guests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No guests found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}></th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th style={{ textAlign: "right" }}>Total Spend</th>
                  <th style={{ textAlign: "center" }}>Stays</th>
                  <th>Last Check-in</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g, i) => {
                  const st = STATUS_STYLE[g.currentStatus] || STATUS_STYLE.CHECKED_OUT;
                  return (
                    <tr key={g.email || g.name + i} style={{ cursor: "pointer" }}
                      onClick={() => setSelected(g)} title="Click to view stay history">
                      <td style={{ padding: "8px 10px" }}><Avatar name={g.name} /></td>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>{g.name}</td>
                      <td>{g.phone ?? "—"}</td>
                      <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{g.email ?? "—"}</td>
                      <td style={{ textAlign: "right", fontWeight: 600, color: "#4ade80" }}>
                        ₹{Math.round(g.totalValue).toLocaleString()}
                      </td>
                      <td style={{ textAlign: "center" }}>{g.totalStays}</td>
                      <td>{g.lastCheckIn ?? "—"}</td>
                      <td><span className={"badge " + st.cls}>{st.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "8px 12px", fontSize: 12, color: "var(--text-muted)", textAlign: "right" }}>
              {guests.length} guest{guests.length !== 1 ? "s" : ""}. Click a row to view stay history.
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="stay-popup-overlay" onClick={() => setSelected(null)}>
          <div className="stay-popup" style={{ width: 620, maxWidth: "95vw" }} onClick={e => e.stopPropagation()}>
            <div className="stay-popup-header">
              <span>Guest Profile</span>
              <button className="stay-popup-close" onClick={() => setSelected(null)}>✕</button>
            </div>
            <div className="stay-popup-body">
              {/* Identity */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
                <Avatar name={selected.name} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    {selected.email || selected.phone || "No contact info"}
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <span className={"badge " + (STATUS_STYLE[selected.currentStatus]?.cls || "badge-gold")}>
                    {STATUS_STYLE[selected.currentStatus]?.label || "Checked Out"}
                  </span>
                </div>
              </div>

              <div className="stay-popup-row"><span>Phone</span><strong>{selected.phone || "—"}</strong></div>
              <div className="stay-popup-row"><span>Email</span><strong>{selected.email || "—"}</strong></div>

              {/* Stats */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8,
                margin: "16px 0", padding: "14px 0",
                borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)"
              }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent)" }}>{selected.totalStays}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Total Stays</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#4ade80" }}>
                    ₹{Math.round(totalSpent).toLocaleString()}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Lifetime Spend</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "#60a5fa" }}>
                    {avgPerStay > 0 ? `₹${avgPerStay.toLocaleString()}` : "—"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Avg per Stay</div>
                </div>
              </div>

              {/* Booking history */}
              <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.05em", marginBottom: 8 }}>
                BOOKING HISTORY
              </div>
              {!selected.reservations || selected.reservations.length === 0 ? (
                <div style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px 0" }}>
                  No reservations on record.
                </div>
              ) : (
                <div style={{ maxHeight: 260, overflowY: "auto" }}>
                  <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "var(--bg-input)" }}>
                        {["Room", "Type", "Check-in", "Check-out", "Nights", "Pax", "Source", "Status", "Amount"].map(h => (
                          <th key={h} style={{ padding: "6px 8px", color: "var(--text-muted)", fontWeight: 500, textAlign: h === "Amount" ? "right" : "left", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {selected.reservations.map(r => {
                        const st = r.status === "CHECKED_IN" ? "badge-green" : r.status === "BOOKED" ? "badge-blue" : "badge-gold";
                        const statusLabel = r.status === "CHECKED_IN" ? "In House" : r.status === "BOOKED" ? "Upcoming" : "Checked Out";
                        return (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border)" }}>
                            <td style={{ padding: "6px 8px", fontWeight: 600 }}>{r.roomNumber}</td>
                            <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{r.roomType}</td>
                            <td style={{ padding: "6px 8px" }}>{r.checkInDate}</td>
                            <td style={{ padding: "6px 8px" }}>{r.checkOutDate}</td>
                            <td style={{ padding: "6px 8px", textAlign: "center" }}>{r.nights}</td>
                            <td style={{ padding: "6px 8px", textAlign: "center" }}>{r.pax}</td>
                            <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{r.source ?? "—"}</td>
                            <td style={{ padding: "6px 8px" }}>
                              <span className={"badge " + st}>{statusLabel}</span>
                            </td>
                            <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }}>
                              ₹{r.amount?.toLocaleString() ?? "—"}
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
        </div>
      )}
    </div>
  );
}
