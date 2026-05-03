import React, { useEffect, useState } from "react";
import { api } from "../api";

const COUNTRY_CODES = [
  { code: "+91",  flag: "🇮🇳", label: "IN" },
  { code: "+1",   flag: "🇺🇸", label: "US" },
  { code: "+44",  flag: "🇬🇧", label: "GB" },
  { code: "+971", flag: "🇦🇪", label: "AE" },
  { code: "+65",  flag: "🇸🇬", label: "SG" },
  { code: "+60",  flag: "🇲🇾", label: "MY" },
  { code: "+61",  flag: "🇦🇺", label: "AU" },
  { code: "+86",  flag: "🇨🇳", label: "CN" },
  { code: "+49",  flag: "🇩🇪", label: "DE" },
  { code: "+33",  flag: "🇫🇷", label: "FR" },
];

const MEAL_PLAN_OPTIONS = [
  { value: "",    label: "— Select Meal Plan —" },
  { value: "EP",  label: "EP – Room Only"        },
  { value: "CP",  label: "CP – With Breakfast"   },
  { value: "MAP", label: "MAP – Half Board"       },
  { value: "AP",  label: "AP – Full Board"        },
];

const SOURCE_OPTIONS = [
  { value: "",           label: "— Select Source —"  },
  { value: "PMS",        label: "PMS (Direct)"        },
  { value: "OTA",        label: "OTA"                 },
  { value: "WALK_IN",    label: "Walk-in"             },
  { value: "PHONE",      label: "Phone"               },
  { value: "EMAIL",      label: "Email"               },
];

const PAYMENT_OPTIONS = [
  { value: "",               label: "— Select Payment —" },
  { value: "CASH",           label: "Cash"               },
  { value: "CARD",           label: "Card"               },
  { value: "UPI",            label: "UPI"                },
  { value: "BANK_TRANSFER",  label: "Bank Transfer"      },
  { value: "CREDIT",         label: "Credit"             },
];

export default function CreateReservation() {
  const [rooms, setRooms]           = useState([]);
  const [roomId, setRoomId]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [phoneCode, setPhoneCode]   = useState("+91");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [form, setForm] = useState({
    guestName:   "",
    guestEmail:  "",
    guestPhone:  "",
    checkInDate:  "",
    checkOutDate: "",
    guestsCount:  1,
    mealPlan:     "",
    source:       "",
    paymentMode:  "",
  });

  useEffect(() => {
    api.get("/rooms").then(res => setRooms(res.data.filter(r => r.status === "AVAILABLE")));
  }, []);


  // Combine country code + local number into guestPhone
  useEffect(() => {
    setForm(prev => ({ ...prev, guestPhone: phoneLocal ? `${phoneCode} ${phoneLocal}` : "" }));
  }, [phoneCode, phoneLocal]);

  const set = field => e => setForm({ ...form, [field]: e.target.value });

  const submit = async () => {
    if (!roomId)                { alert("Please select a room"); return; }
    if (!form.guestName.trim()) { alert("Guest name is required"); return; }
    if (!form.checkInDate || !form.checkOutDate) { alert("Check-in and check-out dates are required"); return; }
    if (form.checkOutDate <= form.checkInDate)   { alert("Check-out date must be after check-in date"); return; }
    setSubmitting(true);
    try {
      await api.post(`/reservations?roomId=${roomId}`, { ...form, amount: nightlyRate * nights });
      setSuccess(true);
      setForm({ guestName: "", guestEmail: "", guestPhone: "", checkInDate: "", checkOutDate: "",
                guestsCount: 1, mealPlan: "", source: "", paymentMode: "" });
      setRoomId("");
      setPhoneLocal("");
      setPhoneCode("+91");
      api.get("/rooms").then(res => setRooms(res.data.filter(r => r.status === "AVAILABLE")));
      setTimeout(() => setSuccess(false), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const _d = new Date();
  const today = `${_d.getFullYear()}-${String(_d.getMonth()+1).padStart(2,"0")}-${String(_d.getDate()).padStart(2,"0")}`;
  const selectedRoom = rooms.find(r => String(r.id) === String(roomId));
  const nights = form.checkInDate && form.checkOutDate
    ? Math.round((new Date(form.checkOutDate) - new Date(form.checkInDate)) / 86400000)
    : 0;
  const nightlyRate = selectedRoom?.basePrice ?? 0;

  return (
    <div>
      <div className="page-header">
        <h2>New Reservation</h2>
        <p className="page-subtitle">Fill in the details to create a booking</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {success && (
          <div style={{
            background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)",
            borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: 20,
            color: "#4ade80", fontSize: 14, display: "flex", alignItems: "center", gap: 8,
          }}>
            ✅ Reservation created successfully!
          </div>
        )}

        <div className="card" style={{ maxWidth: 720 }}>
          {/* ── Guest Information ── */}
          <div className="section-heading" style={{ marginBottom: 20 }}>Guest Information</div>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Guest Name *</label>
              <input className="form-input" placeholder="Full name" value={form.guestName} onChange={set("guestName")} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select className="form-select" style={{ width: 100, flex: "0 0 100px" }}
                  value={phoneCode} onChange={e => setPhoneCode(e.target.value)}>
                  {COUNTRY_CODES.map(c => (
                    <option key={c.code} value={c.code}>{c.flag} {c.code}</option>
                  ))}
                </select>
                <input className="form-input" type="tel" placeholder="98765 43210"
                  value={phoneLocal}
                  onChange={e => setPhoneLocal(e.target.value.replace(/[^\d\s\-]/g, ""))}
                  style={{ flex: 1 }} />
              </div>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Email</label>
              <input className="form-input" type="email" placeholder="guest@email.com"
                value={form.guestEmail} onChange={set("guestEmail")} />
            </div>
          </div>

          {/* ── Booking Details ── */}
          <div className="section-heading" style={{ marginBottom: 20 }}>Booking Details</div>
          <div className="form-grid" style={{ marginBottom: 16 }}>
            <div className="form-group">
              <label className="form-label">Check-in Date</label>
              <input className="form-input" type="date" min={today}
                value={form.checkInDate} onChange={set("checkInDate")} />
            </div>
            <div className="form-group">
              <label className="form-label">Check-out Date</label>
              <input className="form-input" type="date"
                min={form.checkInDate || today}
                value={form.checkOutDate} onChange={set("checkOutDate")} />
            </div>
            <div className="form-group">
              <label className="form-label">Room *</label>
              <select className="form-select" value={roomId} onChange={e => setRoomId(e.target.value)}>
                <option value="">Select available room</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} — {r.roomType?.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Guests Count</label>
              <input className="form-input" type="number" min="1" value={form.guestsCount}
                onChange={e => setForm({ ...form, guestsCount: parseInt(e.target.value) })} />
            </div>
            <div className="form-group">
              <label className="form-label">Meal Plan</label>
              <select className="form-select" value={form.mealPlan} onChange={set("mealPlan")}>
                {MEAL_PLAN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Booking Source</label>
              <select className="form-select" value={form.source} onChange={set("source")}>
                {SOURCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Mode</label>
              <select className="form-select" value={form.paymentMode} onChange={set("paymentMode")}>
                {PAYMENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">Amount</label>
              <div style={{
                padding: "12px 16px", borderRadius: "var(--radius-sm)",
                background: "var(--accent-glow)", border: "1px solid var(--accent)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                flexWrap: "wrap", gap: 8,
              }}>
                {nights > 0 && nightlyRate > 0 ? (
                  <>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                      ₹{nightlyRate.toLocaleString("en-IN")}/night × {nights} night{nights !== 1 ? "s" : ""}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "var(--accent)" }}>
                      ₹{(nightlyRate * nights).toLocaleString("en-IN")}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Select a room and dates to see the amount
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
            <button className="btn btn-primary" onClick={submit} disabled={submitting}>
              {submitting ? "Creating…" : "✚ Create Reservation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
