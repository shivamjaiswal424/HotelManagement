import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api";

const STATUS_META = {
  AVAILABLE:    { cls: "available",   dot: "dot-green",  badge: "badge-green",  label: "Available"    },
  OCCUPIED:     { cls: "occupied",    dot: "dot-red",    badge: "badge-red",    label: "Occupied"     },
  MAINTENANCE:  { cls: "maintenance", dot: "dot-yellow", badge: "badge-yellow", label: "Maintenance"  },
  OUT_OF_ORDER: { cls: "maintenance", dot: "dot-yellow", badge: "badge-yellow", label: "Out of Order" },
};

const MEAL_PLAN_LABELS = { EP: "EP – Room Only", CP: "CP – With Breakfast", MAP: "MAP – Half Board", AP: "AP – Full Board" };
const SOURCE_LABELS    = { PMS: "PMS", OTA: "OTA", WALK_IN: "Walk-in", PHONE: "Phone", EMAIL: "Email" };
const PAYMENT_LABELS   = { CASH: "Cash", CARD: "Card", UPI: "UPI", BANK_TRANSFER: "Bank Transfer", CREDIT: "Credit" };

const fmt = (d) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtAmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

export default function RoomsView() {
  const [rooms, setRooms]             = useState([]);
  const [reservations, setReservations] = useState([]);
  const [todayRates, setTodayRates]   = useState({});
  const [filter, setFilter]           = useState("ALL");
  const [selected, setSelected]       = useState(null);
  const [res, setRes]                 = useState(null);
  const [services, setServices]       = useState([]);
  const [payments, setPayments]       = useState([]);
  const [panel, setPanel]             = useState(null);
  const [loading, setLoading]         = useState(false);
  const [resLoading, setResLoading]   = useState(false);

  const [editForm, setEditForm]       = useState({});
  const [svcForm, setSvcForm]         = useState({ description: "", amount: "" });
  const [pymForm, setPymForm]         = useState({ amount: "", paymentMode: "CASH", remarks: "" });
  const [availRooms, setAvailRooms]   = useState([]);
  const [exchRoomId, setExchRoomId]   = useState("");

  const loadRooms = useCallback(async () => {
    const [roomsRes, resRes, ratesRes] = await Promise.all([
      api.get("/rooms"),
      api.get("/reservations"),
      api.get("/channel/today-rates").catch(() => ({ data: {} })),
    ]);
    setRooms(roomsRes.data);
    setReservations(resRes.data);
    setTodayRates(ratesRes.data || {});
  }, []);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const openRoom = async (room) => {
    setSelected(room);
    setPanel(null);
    setRes(null);
    setServices([]);
    setPayments([]);

    if (room.status === "OCCUPIED") {
      // Find the active reservation client-side — no extra endpoint needed
      const activeReservation = reservations.find(r =>
        r.room?.id === room.id &&
        (r.status === "CHECKED_IN" || r.status === "BOOKED")
      );

      if (activeReservation) {
        setRes(activeReservation);
        setEditForm({
          checkInDate:  activeReservation.checkInDate,
          checkOutDate: activeReservation.checkOutDate,
          guestsCount:  activeReservation.guestsCount || 1,
          source:       activeReservation.source || "",
          mealPlan:     activeReservation.mealPlan || "",
          paymentMode:  activeReservation.paymentMode || "",
          amount:       activeReservation.amount || 0,
        });

        // Load services & payments (requires restarted backend)
        setResLoading(true);
        try {
          const [svcR, pymR] = await Promise.all([
            api.get(`/reservations/${activeReservation.id}/services`, { skipAuthRedirect: true }),
            api.get(`/reservations/${activeReservation.id}/payments`, { skipAuthRedirect: true }),
          ]);
          setServices(svcR.data);
          setPayments(pymR.data);
        } catch { /* services/payments endpoints not available until backend restart */ }
        finally { setResLoading(false); }
      }
    }
  };

  const closePopup = () => { setSelected(null); setRes(null); setPanel(null); };

  const SA = { skipAuthRedirect: true }; // prevents global 401 logout for popup actions

  const changeStatus = async (roomId, newStatus) => {
    try {
      await api.put(`/rooms/${roomId}/status`, null, { params: { roomStatus: newStatus }, ...SA });
      loadRooms();
      if (selected?.id === roomId) closePopup();
    } catch (e) { alert(e.response?.data?.message || "Status change failed"); }
  };

  const handleCheckout = async () => {
    if (!res || !window.confirm("Confirm checkout for " + res.guestName + "?")) return;
    setLoading(true);
    try {
      await api.put(`/reservations/${res.id}/checkout`, null, SA);
      await loadRooms();
      closePopup();
    } catch (e) { alert(e.response?.data?.message || "Checkout failed"); }
    finally { setLoading(false); }
  };

  const handleSaveEdit = async () => {
    setLoading(true);
    try {
      const body = {
        checkInDate:  editForm.checkInDate,
        checkOutDate: editForm.checkOutDate,
        guestsCount:  Number(editForm.guestsCount),
        source:       editForm.source    || null,
        mealPlan:     editForm.mealPlan  || null,
        paymentMode:  editForm.paymentMode || null,
        amount:       Number(editForm.amount),
      };
      const { data: updated } = await api.put(`/reservations/${res.id}`, body, SA);
      setRes(updated);
      // Also refresh the cached reservations list so re-opening shows updated data
      const resRes = await api.get("/reservations");
      setReservations(resRes.data);
      setPanel(null);
    } catch (e) { alert(e.response?.data?.message || "Update failed. Please restart the backend to enable editing."); }
    finally { setLoading(false); }
  };

  const handleAddService = async () => {
    if (!svcForm.description.trim() || !svcForm.amount) return;
    setLoading(true);
    try {
      const { data: newSvc } = await api.post(`/reservations/${res.id}/services`, {
        description: svcForm.description,
        amount:      parseFloat(svcForm.amount),
        chargeDate:  new Date().toISOString().split("T")[0],
      }, SA);
      setServices(prev => [...prev, newSvc]);
      setSvcForm({ description: "", amount: "" });
      setPanel(null);
    } catch (e) { alert(e.response?.data?.message || "Failed to add service. Please restart the backend."); }
    finally { setLoading(false); }
  };

  const handleAddPayment = async () => {
    if (!pymForm.amount) return;
    setLoading(true);
    try {
      const { data: newPym } = await api.post(`/reservations/${res.id}/payments`, {
        amount:      parseFloat(pymForm.amount),
        paymentMode: pymForm.paymentMode,
        remarks:     pymForm.remarks,
        paymentDate: new Date().toISOString().split("T")[0],
      }, SA);
      setPayments(prev => [...prev, newPym]);
      setPymForm({ amount: "", paymentMode: "CASH", remarks: "" });
      setPanel(null);
    } catch (e) { alert(e.response?.data?.message || "Failed to add payment. Please restart the backend."); }
    finally { setLoading(false); }
  };

  const openExchange = () => {
    const avail = rooms.filter(r => r.status === "AVAILABLE");
    setAvailRooms(avail);
    setExchRoomId(avail[0]?.id?.toString() || "");
    setPanel("exchange");
  };

  const handleExchange = async () => {
    if (!exchRoomId || !window.confirm("Move guest to this room?")) return;
    setLoading(true);
    try {
      await api.put(`/reservations/${res.id}/exchange`, null, { params: { newRoomId: exchRoomId }, ...SA });
      await loadRooms();
      closePopup();
    } catch (e) { alert(e.response?.data?.message || "Exchange failed. Please restart the backend."); }
    finally { setLoading(false); }
  };

  const filtered = filter === "ALL" ? rooms : rooms.filter(r => r.status === filter);
  const counts = {
    ALL:         rooms.length,
    AVAILABLE:   rooms.filter(r => r.status === "AVAILABLE").length,
    OCCUPIED:    rooms.filter(r => r.status === "OCCUPIED").length,
    MAINTENANCE: rooms.filter(r => r.status === "MAINTENANCE" || r.status === "OUT_OF_ORDER").length,
  };

  const roomCharges   = res?.amount || 0;
  const serviceTotal  = services.reduce((s, c) => s + c.amount, 0);
  const totalCharges  = roomCharges + serviceTotal;
  const totalPaid     = payments.reduce((s, p) => s + p.amount, 0);
  const balance       = totalCharges - totalPaid;

  const popupMeta = selected ? (STATUS_META[selected.status] || STATUS_META.AVAILABLE) : null;

  return (
    <div>
      <div className="page-header">
        <h2>Rooms View</h2>
        <p className="page-subtitle">Live floor plan — {rooms.length} rooms total</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="legend" style={{ marginBottom: 20 }}>
          {["ALL", "AVAILABLE", "OCCUPIED", "MAINTENANCE"].map(s => {
            const meta = STATUS_META[s];
            return (
              <button key={s} onClick={() => setFilter(s)}
                className={"btn btn-sm " + (filter === s ? "btn-primary" : "btn-secondary")}
                style={{ gap: 6 }}>
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
          <div className="empty-state"><div className="empty-icon">🛏</div><p>No rooms match this filter</p></div>
        ) : (
          <div className="rooms-grid">
            {filtered.map(room => {
              const meta = STATUS_META[room.status] || { cls: "", dot: "", badge: "badge-gold", label: room.status };
              return (
                <div key={room.id} className={"room-card " + meta.cls + " room-card-clickable"}
                  onClick={() => openRoom(room)}>
                  <div className="room-number">{room.roomNumber}</div>
                  <div className="room-type">{room.roomType?.replace(/_/g, " ")}</div>
                  <span className={"badge " + meta.badge} style={{ marginTop: 4 }}>
                    <span className={"room-status-dot " + meta.dot} />{meta.label}
                  </span>
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    {(() => {
                      const rateData = todayRates[room.roomType];
                      const rate = rateData?.rate ?? room.basePrice;
                      const fromCal = rateData?.fromCalendar;
                      return (
                        <span style={{ color: fromCal ? "var(--accent)" : "var(--text-muted)" }}>
                          ₹{Number(rate).toLocaleString()}/night
                          {fromCal && <span style={{ fontSize: 10, marginLeft: 3, color: "#4ade80" }}>★</span>}
                        </span>
                      );
                    })()}
                  </div>
                  {room.status === "OCCUPIED" && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "var(--accent)", fontStyle: "italic" }}>
                      Click to manage
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Room Detail Popup ─────────────────────────── */}
      {selected && (
        <div className="stay-popup-overlay" onClick={closePopup}>
          <div className="rdp" onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="rdp-header">
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="rdp-room-num">Room {selected.roomNumber}</span>
                <span className="rdp-room-type">{selected.roomType?.replace("_", " ")}</span>
                <span className={"badge " + popupMeta.badge}>
                  <span className={"room-status-dot " + popupMeta.dot} />{popupMeta.label}
                </span>
              </div>
              <button className="stay-popup-close" onClick={closePopup}>✕</button>
            </div>

            <div className="rdp-body">
              {/* Available / Maintenance rooms */}
              {selected.status !== "OCCUPIED" && (
                <div>
                  {(() => {
                    const rateData = todayRates[selected.roomType];
                    const rate = rateData?.rate ?? selected.basePrice;
                    const fromCal = rateData?.fromCalendar;
                    return (
                      <p style={{ color: "var(--text-secondary)", marginBottom: 16 }}>
                        <span style={{ color: fromCal ? "var(--accent)" : "var(--text-secondary)", fontWeight: 600 }}>
                          ₹{Number(rate).toLocaleString()}/night
                        </span>
                        {fromCal && <span style={{ fontSize: 11, color: "#4ade80", marginLeft: 6 }}>★ Channel rate</span>}
                        {!fromCal && <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>Base rate</span>}
                        <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
                          · {selected.roomType?.replace(/_/g, " ")}
                        </span>
                      </p>
                    );
                  })()}
                  {(selected.status === "AVAILABLE") && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => changeStatus(selected.id, "MAINTENANCE")}>Mark Maintenance</button>
                      <button className="btn btn-secondary btn-sm"
                        onClick={() => changeStatus(selected.id, "OUT_OF_ORDER")}>Mark Out of Order</button>
                    </div>
                  )}
                  {(selected.status === "MAINTENANCE" || selected.status === "OUT_OF_ORDER") && (
                    <button className="btn btn-primary btn-sm"
                      onClick={() => changeStatus(selected.id, "AVAILABLE")}>Mark Available</button>
                  )}
                </div>
              )}

              {/* Occupied — loading */}
              {selected.status === "OCCUPIED" && resLoading && (
                <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: 24 }}>Loading reservation…</div>
              )}

              {/* Occupied — no reservation found */}
              {selected.status === "OCCUPIED" && !resLoading && !res && (
                <div style={{ color: "var(--text-secondary)" }}>No active reservation found for this room.</div>
              )}

              {/* Occupied — main detail view */}
              {selected.status === "OCCUPIED" && !resLoading && res && panel === null && (
                <>
                  {/* Guest info */}
                  <div className="rdp-section">
                    <div className="rdp-section-title">Guest</div>
                    <div className="rdp-info-grid">
                      <span className="rdp-label">Name</span>      <span className="rdp-value">{res.guestName}</span>
                      <span className="rdp-label">Phone</span>     <span className="rdp-value">{res.guestPhone || "—"}</span>
                      <span className="rdp-label">Email</span>     <span className="rdp-value">{res.guestEmail || "—"}</span>
                      <span className="rdp-label">Guests</span>    <span className="rdp-value">{res.guestsCount || 1} pax</span>
                    </div>
                  </div>

                  {/* Stay info */}
                  <div className="rdp-section">
                    <div className="rdp-section-title">Stay Details</div>
                    <div className="rdp-info-grid">
                      <span className="rdp-label">Check-in</span>  <span className="rdp-value">{fmt(res.checkInDate)}</span>
                      <span className="rdp-label">Check-out</span> <span className="rdp-value">{fmt(res.checkOutDate)}</span>
                      <span className="rdp-label">Nights</span>
                      <span className="rdp-value">
                        {Math.round((new Date(res.checkOutDate) - new Date(res.checkInDate)) / 86400000)}
                      </span>
                      <span className="rdp-label">Source</span>    <span className="rdp-value">{SOURCE_LABELS[res.source] || "—"}</span>
                      <span className="rdp-label">Meal Plan</span> <span className="rdp-value">{MEAL_PLAN_LABELS[res.mealPlan] || "—"}</span>
                      <span className="rdp-label">Payment</span>   <span className="rdp-value">{PAYMENT_LABELS[res.paymentMode] || "—"}</span>
                      <span className="rdp-label">Room Rate</span> <span className="rdp-value" style={{ color: "var(--accent)" }}>{fmtAmt(res.amount)}</span>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="rdp-section">
                    <div className="rdp-section-title" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Services</span>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                        onClick={() => setPanel("service")}>+ Add</button>
                    </div>
                    {services.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No services added</p>
                    ) : (
                      <div className="rdp-list">
                        {services.map(s => (
                          <div key={s.id} className="rdp-list-row">
                            <span>{s.description}</span>
                            <span style={{ color: "var(--accent)" }}>{fmtAmt(s.amount)}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{fmt(s.chargeDate)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div className="rdp-section">
                    <div className="rdp-section-title" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Payments</span>
                      <button className="btn btn-secondary btn-sm" style={{ fontSize: 11 }}
                        onClick={() => setPanel("payment")}>+ Add</button>
                    </div>
                    {payments.length === 0 ? (
                      <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No payments recorded</p>
                    ) : (
                      <div className="rdp-list">
                        {payments.map(p => (
                          <div key={p.id} className="rdp-list-row">
                            <span>{PAYMENT_LABELS[p.paymentMode] || p.paymentMode}</span>
                            <span style={{ color: "var(--green)" }}>{fmtAmt(p.amount)}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{fmt(p.paymentDate)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Balance bar */}
                  <div className="rdp-balance">
                    <div className="rdp-balance-item">
                      <span>Room</span><strong>{fmtAmt(roomCharges)}</strong>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>+</span>
                    <div className="rdp-balance-item">
                      <span>Services</span><strong>{fmtAmt(serviceTotal)}</strong>
                    </div>
                    <span style={{ color: "var(--text-muted)" }}>=</span>
                    <div className="rdp-balance-item">
                      <span>Total</span><strong style={{ color: "var(--accent)" }}>{fmtAmt(totalCharges)}</strong>
                    </div>
                    <div style={{ marginLeft: "auto", display: "flex", gap: 20 }}>
                      <div className="rdp-balance-item">
                        <span>Paid</span><strong style={{ color: "var(--green)" }}>{fmtAmt(totalPaid)}</strong>
                      </div>
                      <div className="rdp-balance-item">
                        <span>Due</span>
                        <strong style={{ color: balance > 0 ? "var(--red)" : "var(--green)" }}>{fmtAmt(balance)}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="rdp-actions">
                    <button className="btn btn-secondary" onClick={() => setPanel("edit")}>✏ Edit</button>
                    <button className="btn btn-secondary" onClick={() => setPanel("invoice")}>🧾 Invoice</button>
                    <button className="btn btn-secondary" onClick={openExchange}>⇄ Exchange Room</button>
                    <button className="btn btn-danger" onClick={handleCheckout} disabled={loading}>
                      {loading ? "…" : "✓ Checkout"}
                    </button>
                  </div>
                </>
              )}

              {/* ── Edit panel ───────────────────────────── */}
              {panel === "edit" && res && (
                <div className="rdp-subpanel">
                  <div className="rdp-subpanel-title">Edit Reservation</div>
                  <div className="form-grid" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Check-in Date</label>
                      <input type="date" className="form-input" value={editForm.checkInDate || ""}
                        onChange={e => setEditForm(p => ({ ...p, checkInDate: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Check-out Date</label>
                      <input type="date" className="form-input" value={editForm.checkOutDate || ""}
                        onChange={e => setEditForm(p => ({ ...p, checkOutDate: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">No. of Guests</label>
                      <input type="number" className="form-input" min="1" value={editForm.guestsCount || 1}
                        onChange={e => setEditForm(p => ({ ...p, guestsCount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Amount (₹)</label>
                      <input type="number" className="form-input" value={editForm.amount || 0}
                        onChange={e => setEditForm(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Source</label>
                      <select className="form-input" value={editForm.source || ""}
                        onChange={e => setEditForm(p => ({ ...p, source: e.target.value }))}>
                        <option value="">— Select —</option>
                        {Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Meal Plan</label>
                      <select className="form-input" value={editForm.mealPlan || ""}
                        onChange={e => setEditForm(p => ({ ...p, mealPlan: e.target.value }))}>
                        <option value="">— Select —</option>
                        {Object.entries(MEAL_PLAN_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Mode</label>
                      <select className="form-input" value={editForm.paymentMode || ""}
                        onChange={e => setEditForm(p => ({ ...p, paymentMode: e.target.value }))}>
                        <option value="">— Select —</option>
                        {Object.entries(PAYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={handleSaveEdit} disabled={loading}>
                      {loading ? "Saving…" : "Save Changes"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Add Service panel ─────────────────────── */}
              {panel === "service" && (
                <div className="rdp-subpanel">
                  <div className="rdp-subpanel-title">Add Service Charge</div>
                  <div className="form-group" style={{ marginBottom: 12 }}>
                    <label className="form-label">Description</label>
                    <input type="text" className="form-input" placeholder="e.g. Room Service, Laundry…"
                      value={svcForm.description}
                      onChange={e => setSvcForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 16 }}>
                    <label className="form-label">Amount (₹)</label>
                    <input type="number" className="form-input" placeholder="0"
                      value={svcForm.amount}
                      onChange={e => setSvcForm(p => ({ ...p, amount: e.target.value }))} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn btn-primary" onClick={handleAddService} disabled={loading}>
                      {loading ? "Adding…" : "Add Charge"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Add Payment panel ─────────────────────── */}
              {panel === "payment" && (
                <div className="rdp-subpanel">
                  <div className="rdp-subpanel-title">Record Payment</div>
                  <div className="form-grid" style={{ gap: 12 }}>
                    <div className="form-group">
                      <label className="form-label">Amount (₹)</label>
                      <input type="number" className="form-input" placeholder="0"
                        value={pymForm.amount}
                        onChange={e => setPymForm(p => ({ ...p, amount: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Payment Mode</label>
                      <select className="form-input" value={pymForm.paymentMode}
                        onChange={e => setPymForm(p => ({ ...p, paymentMode: e.target.value }))}>
                        {Object.entries(PAYMENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                      <label className="form-label">Remarks (optional)</label>
                      <input type="text" className="form-input" placeholder="e.g. Advance, Partial…"
                        value={pymForm.remarks}
                        onChange={e => setPymForm(p => ({ ...p, remarks: e.target.value }))} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={handleAddPayment} disabled={loading}>
                      {loading ? "Saving…" : "Record Payment"}
                    </button>
                    <button className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
                  </div>
                </div>
              )}

              {/* ── Exchange Room panel ───────────────────── */}
              {panel === "exchange" && (
                <div className="rdp-subpanel">
                  <div className="rdp-subpanel-title">Exchange Room</div>
                  <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14 }}>
                    Move <strong style={{ color: "var(--text-primary)" }}>{res?.guestName}</strong> to another available room.
                  </p>
                  {availRooms.length === 0 ? (
                    <p style={{ color: "var(--yellow)", fontSize: 13 }}>No available rooms to exchange with.</p>
                  ) : (
                    <>
                      <div className="form-group" style={{ marginBottom: 16 }}>
                        <label className="form-label">Target Room</label>
                        <select className="form-input" value={exchRoomId}
                          onChange={e => setExchRoomId(e.target.value)}>
                          {availRooms.map(r => {
                            const rate = todayRates[r.roomType]?.rate ?? r.basePrice;
                            return (
                              <option key={r.id} value={r.id}>
                                {r.roomNumber} — {r.roomType?.replace(/_/g, " ")} (₹{Number(rate).toLocaleString()}/night)
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="btn btn-primary" onClick={handleExchange} disabled={loading}>
                          {loading ? "Moving…" : "Confirm Exchange"}
                        </button>
                        <button className="btn btn-secondary" onClick={() => setPanel(null)}>Cancel</button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── Invoice panel ─────────────────────────── */}
              {panel === "invoice" && res && (
                <div className="rdp-subpanel">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div className="rdp-subpanel-title" style={{ marginBottom: 0 }}>Invoice</div>
                    <button className="btn btn-secondary btn-sm" onClick={() => window.print()}>🖨 Print</button>
                  </div>

                  <div className="rdp-invoice-header">
                    <div style={{ fontSize: 16, fontWeight: 700, color: "var(--accent)" }}>Annapurna Banquets & Inn</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>Tax Invoice</div>
                  </div>

                  <div className="rdp-info-grid" style={{ marginBottom: 12 }}>
                    <span className="rdp-label">Guest</span>      <span className="rdp-value">{res.guestName}</span>
                    <span className="rdp-label">Phone</span>      <span className="rdp-value">{res.guestPhone || "—"}</span>
                    <span className="rdp-label">Room</span>       <span className="rdp-value">{selected.roomNumber} ({selected.roomType?.replace("_", " ")})</span>
                    <span className="rdp-label">Check-in</span>   <span className="rdp-value">{fmt(res.checkInDate)}</span>
                    <span className="rdp-label">Check-out</span>  <span className="rdp-value">{fmt(res.checkOutDate)}</span>
                    <span className="rdp-label">Nights</span>
                    <span className="rdp-value">
                      {Math.round((new Date(res.checkOutDate) - new Date(res.checkInDate)) / 86400000)}
                    </span>
                    <span className="rdp-label">Meal Plan</span>  <span className="rdp-value">{MEAL_PLAN_LABELS[res.mealPlan] || "—"}</span>
                  </div>

                  <table className="rdp-invoice-table">
                    <thead>
                      <tr><th>Description</th><th style={{ textAlign: "right" }}>Amount</th></tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Room charges ({selected.roomNumber})</td>
                        <td style={{ textAlign: "right" }}>{fmtAmt(roomCharges)}</td>
                      </tr>
                      {services.map(s => (
                        <tr key={s.id}>
                          <td>{s.description}</td>
                          <td style={{ textAlign: "right" }}>{fmtAmt(s.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="rdp-invoice-total">
                        <td><strong>Total</strong></td>
                        <td style={{ textAlign: "right" }}><strong>{fmtAmt(totalCharges)}</strong></td>
                      </tr>
                      {payments.map(p => (
                        <tr key={p.id} style={{ color: "var(--green)" }}>
                          <td>Payment — {PAYMENT_LABELS[p.paymentMode] || p.paymentMode} {p.remarks ? `(${p.remarks})` : ""}</td>
                          <td style={{ textAlign: "right" }}>- {fmtAmt(p.amount)}</td>
                        </tr>
                      ))}
                      <tr className="rdp-invoice-balance">
                        <td><strong>Balance Due</strong></td>
                        <td style={{ textAlign: "right", color: balance > 0 ? "var(--red)" : "var(--green)" }}>
                          <strong>{fmtAmt(balance)}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>

                  <button className="btn btn-secondary" style={{ marginTop: 16 }} onClick={() => setPanel(null)}>← Back</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
