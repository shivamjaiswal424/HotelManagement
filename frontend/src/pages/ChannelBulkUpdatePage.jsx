import React, { useEffect, useState, useCallback, useRef } from "react";
import { api } from "../api";

const WEEKDAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAYS_SHOWN = 10;

function addDays(dateStr, n) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function fmtColHeader(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.toLocaleDateString("en-IN", { weekday: "short" });
  const dt  = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  return { day, dt };
}

// ── Tab: Update Rates ──────────────────────────────────────────────────────

function UpdateRatesTab() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate]   = useState(today);
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [localRates, setLocalRates] = useState({});
  const [saving, setSaving]         = useState({});
  const [publishMsg, setPublishMsg] = useState("");

  const endDate = addDays(startDate, DAYS_SHOWN - 1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/channel/rates-grid", { params: { from: startDate, days: DAYS_SHOWN } });
      setData(res.data);
      // Init local rates from server
      const init = {};
      res.data.ratePlans.forEach(rp => {
        init[rp.id] = {};
        res.data.dates.forEach(d => {
          init[rp.id][d] = rp.rates[d] != null ? String(rp.rates[d]) : "";
        });
      });
      setLocalRates(init);
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => { load(); }, [load]);

  const saveCell = async (planId, date, value) => {
    const num = parseFloat(value);
    if (isNaN(num) || num <= 0) return;
    const key = `${planId}_${date}`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      await api.post("/channel/rates-grid/cell", { ratePlanId: planId, date, rate: num });
    } finally {
      setSaving(p => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  // Only update local display value — NO sync during typing to avoid compounding ratios
  const handleChange = (planId, date, value) => {
    setLocalRates(prev => ({ ...prev, [planId]: { ...prev[planId], [date]: value } }));
  };

  const handleBlur = async (planId, date) => {
    const newVal = parseFloat(localRates[planId]?.[date]);
    if (isNaN(newVal) || newVal <= 0) return;

    // Save this cell first
    await saveCell(planId, date, String(newVal));

    // Sync peers using SERVER-saved rates as the base (not local intermediate values)
    if (!syncEnabled || !data) { load(); return; }
    const thisPlan = data.ratePlans.find(p => p.id === planId);
    if (!thisPlan) { load(); return; }

    const serverOldVal = parseFloat(thisPlan.rates[date]);
    if (isNaN(serverOldVal) || serverOldVal <= 0) { load(); return; }

    const ratio = newVal / serverOldVal;
    const peers = data.ratePlans.filter(p => p.roomType === thisPlan.roomType && p.id !== planId);

    for (const peer of peers) {
      const peerServerRate = parseFloat(peer.rates[date]);
      if (!isNaN(peerServerRate) && peerServerRate > 0) {
        const newPeerRate = Math.round(peerServerRate * ratio);
        setLocalRates(prev => ({ ...prev, [peer.id]: { ...prev[peer.id], [date]: String(newPeerRate) } }));
        await saveCell(peer.id, date, String(newPeerRate));
      }
    }

    // Reload so server state matches local display
    load();
  };

  const handlePublish = async () => {
    if (!data) return;
    setPublishMsg("Publishing…");
    let count = 0;
    for (const rp of data.ratePlans) {
      for (const date of data.dates) {
        const val = localRates[rp.id]?.[date];
        if (val && parseFloat(val) > 0) {
          await saveCell(rp.id, date, val);
          count++;
        }
      }
    }
    setPublishMsg(`✅ ${count} rates published`);
    setTimeout(() => setPublishMsg(""), 3000);
  };

  // Group plans by roomType
  const grouped = data
    ? data.ratePlans.reduce((acc, p) => {
        const key = p.roomType || "OTHER";
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {})
    : {};

  const COL_W = 110;
  const LEFT_W = 200;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, -DAYS_SHOWN))}>&#8249; Prev</button>
        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--text-secondary)" }}>
          {fmtColHeader(startDate).dt} — {fmtColHeader(endDate).dt}
        </span>
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, DAYS_SHOWN))}>Next &#8250;</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(today)}>Today</button>

        <label style={{
          display: "flex", alignItems: "center", gap: 7, marginLeft: 16,
          fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", cursor: "pointer",
        }}>
          <input type="checkbox" checked={syncEnabled} onChange={e => setSyncEnabled(e.target.checked)}
            style={{ accentColor: "var(--accent)" }} />
          🔄 Sync room group rates
        </label>

        <button className="btn btn-primary btn-sm" style={{ marginLeft: "auto" }} onClick={handlePublish}>
          📤 Publish Rates
        </button>
        {publishMsg && <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{publishMsg}</span>}
        {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</span>}
      </div>

      {!data ? null : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: LEFT_W + DAYS_SHOWN * COL_W }}>
            <thead>
              <tr>
                <th style={thLeft(LEFT_W)}>Rate Plan</th>
                {data.dates.map(d => {
                  const h = fmtColHeader(d);
                  const isToday = d === today;
                  return (
                    <th key={d} style={{
                      ...thDate(COL_W),
                      background: isToday ? "var(--accent-glow)" : "var(--bg-input)",
                      color: isToday ? "var(--accent)" : "var(--text-muted)",
                      borderBottom: isToday ? "2px solid var(--accent)" : "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 500 }}>{h.day}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{h.dt}</div>
                    </th>
                  );
                })}
              </tr>

              {/* Available Rooms row */}
              <tr style={{ background: "var(--bg-card)" }}>
                <td style={tdLabel(LEFT_W, "#60a5fa")}>📦 Available Rooms</td>
                {data.dateStats.map(ds => (
                  <td key={ds.date} style={tdStat(COL_W)}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{ds.totalRooms - ds.occupied}</div>
                    <div style={{ fontSize: 10, color: "var(--text-muted)" }}>({Math.round(ds.occupancyPct)}%)</div>
                  </td>
                ))}
              </tr>

              {/* Recommended Rate row */}
              <tr style={{ background: "var(--bg-card)", borderBottom: "2px solid var(--border)" }}>
                <td style={tdLabel(LEFT_W, "#fbbf24")}>⭐ Recommended Rate</td>
                {data.dateStats.map(ds => (
                  <td key={ds.date} style={tdStat(COL_W)}>
                    {ds.recommendedRate != null
                      ? <span style={{ fontWeight: 700, color: "#fbbf24" }}>₹{Math.round(ds.recommendedRate).toLocaleString()}</span>
                      : <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                    }
                  </td>
                ))}
              </tr>
            </thead>

            <tbody>
              {Object.entries(grouped).map(([roomType, plans]) => (
                <React.Fragment key={roomType}>
                  {/* Room type group header */}
                  <tr>
                    <td colSpan={data.dates.length + 1} style={{
                      padding: "8px 14px", background: "var(--accent-glow)",
                      fontSize: 11, fontWeight: 700, color: "var(--accent)",
                      letterSpacing: "0.06em", textTransform: "uppercase",
                      borderTop: "2px solid var(--border)",
                    }}>
                      🛏 {roomType.replace(/_/g, " ")}
                    </td>
                  </tr>

                  {/* Rate plan rows */}
                  {plans.map((rp, idx) => (
                    <tr key={rp.id} style={{
                      background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-hover)",
                    }}>
                      <td style={{ padding: "6px 14px", fontSize: 13, fontWeight: 500,
                        color: "var(--text-secondary)", whiteSpace: "nowrap",
                        borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                        minWidth: LEFT_W, maxWidth: LEFT_W,
                      }}>
                        {rp.name}
                        {rp.mealPlan && <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 9 }}>{rp.mealPlan}</span>}
                        {rp.category && <span className="badge badge-blue" style={{ marginLeft: 4, fontSize: 9 }}>{rp.category}</span>}
                      </td>
                      {data.dates.map(d => {
                        const key = `${rp.id}_${d}`;
                        const isSaving = !!saving[key];
                        return (
                          <td key={d} style={{ padding: 4, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", width: COL_W }}>
                            <input
                              type="number"
                              value={localRates[rp.id]?.[d] ?? ""}
                              onChange={e => handleChange(rp.id, d, e.target.value)}
                              onBlur={() => handleBlur(rp.id, d)}
                              placeholder="—"
                              style={{
                                width: "100%", padding: "5px 6px",
                                background: isSaving ? "rgba(154,111,10,0.12)" : "var(--bg-input)",
                                border: "1px solid var(--border)", borderRadius: 4,
                                color: "var(--text-primary)", fontSize: 13, fontWeight: 600,
                                textAlign: "right",
                              }}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}

              {data.ratePlans.length === 0 && (
                <tr>
                  <td colSpan={data.dates.length + 1} style={{ padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
                    No rate plans found. Add rate plans first via Bulk Update.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Update Rooms ──────────────────────────────────────────────────────

function UpdateRoomsTab() {
  const today = new Date().toISOString().split("T")[0];
  const [startDate, setStartDate] = useState(today);
  const [data, setData]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [localInv, setLocalInv]   = useState({});
  const [dirty, setDirty]         = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/channel/inventory-grid", { params: { from: startDate, days: DAYS_SHOWN } });
      setData(res.data);
      const init = {};
      res.data.roomTypes.forEach(rt => {
        init[rt.type] = {};
        res.data.dates.forEach(d => {
          init[rt.type][d] = rt.inventory[d] != null ? String(rt.inventory[d]) : "";
        });
      });
      setLocalInv(init);
      setDirty(false);
    } finally {
      setLoading(false);
    }
  }, [startDate]);

  useEffect(() => { load(); }, [load]);

  const handleChange = (roomType, date, value) => {
    setLocalInv(prev => ({ ...prev, [roomType]: { ...prev[roomType], [date]: value } }));
    setDirty(true);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaveMsg("Saving…");
    let count = 0;
    for (const rt of data.roomTypes) {
      for (const date of data.dates) {
        const val = localInv[rt.type]?.[date];
        if (val !== "" && val != null) {
          const num = parseInt(val, 10);
          if (!isNaN(num) && num >= 0) {
            await api.post("/channel/inventory-grid/cell", { roomType: rt.type, date, availableRooms: num });
            count++;
          }
        }
      }
    }
    setSaveMsg(`✅ ${count} entries saved`);
    setDirty(false);
    setTimeout(() => setSaveMsg(""), 3000);
    load();
  };

  const handleReset = () => {
    if (!data) return;
    const init = {};
    data.roomTypes.forEach(rt => {
      init[rt.type] = {};
      data.dates.forEach(d => {
        init[rt.type][d] = rt.inventory[d] != null ? String(rt.inventory[d]) : "";
      });
    });
    setLocalInv(init);
    setDirty(false);
  };

  // Recompute totals from local state
  const computedTotals = data ? data.dates.map(d => {
    const avail = data.roomTypes.reduce((sum, rt) => {
      const v = parseInt(localInv[rt.type]?.[d] ?? "0", 10);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);
    const total = data.roomTypes.reduce((s, rt) => s + rt.totalCount, 0);
    const occ   = total > 0 ? Math.round((total - avail) / total * 100) : 0;
    return { date: d, available: avail, total, occupancyPct: occ };
  }) : [];

  const COL_W  = 110;
  const LEFT_W = 180;
  const endDate = addDays(startDate, DAYS_SHOWN - 1);

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <label className="form-label" style={{ marginBottom: 0 }}>Start Date:</label>
        <input className="form-input" type="date" value={startDate}
          onChange={e => setStartDate(e.target.value)}
          style={{ width: 150 }} />
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, -DAYS_SHOWN))}>&#8249; Prev</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(d => addDays(d, DAYS_SHOWN))}>Next &#8250;</button>
        <button className="btn btn-secondary btn-sm" onClick={() => setStartDate(today)}>Today</button>
        {loading && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Loading…</span>}

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
          {saveMsg && <span style={{ fontSize: 12, color: "var(--accent)", fontWeight: 600 }}>{saveMsg}</span>}
          <button className="btn btn-secondary btn-sm" onClick={handleReset} disabled={!dirty}>Reset</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!dirty}>💾 Save All</button>
        </div>
      </div>

      {!data ? null : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: LEFT_W + DAYS_SHOWN * COL_W }}>
            <thead>
              <tr>
                <th style={thLeft(LEFT_W)}>Room Type</th>
                {data.dates.map(d => {
                  const h = fmtColHeader(d);
                  const isToday = d === today;
                  return (
                    <th key={d} style={{
                      ...thDate(COL_W),
                      background: isToday ? "var(--accent-glow)" : "var(--bg-input)",
                      color: isToday ? "var(--accent)" : "var(--text-muted)",
                      borderBottom: isToday ? "2px solid var(--accent)" : "1px solid var(--border)",
                    }}>
                      <div style={{ fontSize: 10, fontWeight: 500 }}>{h.day}</div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{h.dt}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>

            <tbody>
              {/* Room type rows */}
              {data.roomTypes.map((rt, idx) => (
                <tr key={rt.type} style={{ background: idx % 2 === 0 ? "var(--bg-card)" : "var(--bg-card-hover)" }}>
                  <td style={{ padding: "8px 14px", fontSize: 13, fontWeight: 600,
                    color: "var(--text-secondary)", borderRight: "1px solid var(--border)",
                    borderBottom: "1px solid var(--border)", whiteSpace: "nowrap", minWidth: LEFT_W,
                  }}>
                    🛏 {rt.label}
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 400, marginLeft: 6 }}>
                      (total: {rt.totalCount})
                    </span>
                  </td>
                  {data.dates.map(d => (
                    <td key={d} style={{ padding: 4, borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)", width: COL_W }}>
                      <input
                        type="number"
                        min={0}
                        max={rt.totalCount}
                        value={localInv[rt.type]?.[d] ?? ""}
                        onChange={e => handleChange(rt.type, d, e.target.value)}
                        style={{
                          width: "100%", padding: "5px 6px",
                          background: "var(--bg-input)",
                          border: "1px solid var(--border)", borderRadius: 4,
                          color: "var(--text-primary)", fontSize: 13, fontWeight: 600,
                          textAlign: "center",
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              {/* Total Available Rooms */}
              <tr style={{ background: "var(--bg-input)", borderTop: "2px solid var(--border)" }}>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700,
                  color: "var(--text-secondary)", borderRight: "1px solid var(--border)" }}>
                  Total Available Rooms
                </td>
                {computedTotals.map(t => (
                  <td key={t.date} style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, fontSize: 14,
                    borderRight: "1px solid var(--border)", color: t.available > 0 ? "#4ade80" : "#ef4444" }}>
                    {t.available}
                  </td>
                ))}
              </tr>

              {/* Occupancy % */}
              <tr style={{ background: "var(--bg-card-hover)" }}>
                <td style={{ padding: "8px 14px", fontSize: 12, fontWeight: 700,
                  color: "var(--text-secondary)", borderRight: "1px solid var(--border)" }}>
                  Occupancy %
                </td>
                {computedTotals.map(t => (
                  <td key={t.date} style={{ padding: "8px 6px", textAlign: "center", fontWeight: 700, fontSize: 13,
                    borderRight: "1px solid var(--border)",
                    color: t.occupancyPct >= 80 ? "#4ade80" : t.occupancyPct >= 50 ? "#fbbf24" : "var(--text-muted)" }}>
                    {t.occupancyPct}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Tab: Bulk Update ───────────────────────────────────────────────────────

const BULK_TYPES = [
  { id: "INVENTORY",       label: "Inventory"             },
  { id: "RATE",            label: "Rate"                  },
  { id: "INCREMENT",       label: "Increment"             },
  { id: "RESTRICT_RATE",   label: "Restrictions (Rates)"  },
  { id: "RESTRICT_INV",    label: "Restrictions (Inventory)" },
];

const RESTRICTION_FIELDS = [
  { key: "stopSell",         label: "Stop Sell"          },
  { key: "closeOnArrival",   label: "Close on Arrival"   },
  { key: "closeOnDeparture", label: "Close on Departure" },
];

function BulkUpdateTab() {
  const today = new Date().toISOString().split("T")[0];
  const [type, setType]         = useState("RATE");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate]     = useState(today);
  const [allDays, setAllDays]   = useState(true);
  const [weekdays, setWeekdays] = useState([...WEEKDAYS]);
  const [ratePlans, setRatePlans] = useState([]);
  const [roomTypes, setRoomTypes] = useState([]);
  const [selected, setSelected]   = useState({});
  const [values, setValues]       = useState({});
  const [restrictions, setRestrictions] = useState({});
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    api.get("/channel/rateplans").then(res => {
      setRatePlans(res.data);
      const sel = {}, val = {}, restr = {};
      res.data.forEach(rp => {
        sel[rp.id]  = true;
        val[rp.id]  = "";
        restr[rp.id] = { stopSell: false, closeOnArrival: false, closeOnDeparture: false, minStay: "", maxStay: "" };
      });
      setSelected(sel);
      setValues(val);
      setRestrictions(restr);
      // Unique room types
      const rts = [...new Set(res.data.map(r => r.roomType).filter(Boolean))];
      setRoomTypes(rts);
      rts.forEach(rt => {
        val[rt]  = "";
        restr[rt] = { stopSell: false, closeOnArrival: false, closeOnDeparture: false, minStay: "", maxStay: "" };
      });
      setValues({ ...val });
      setRestrictions({ ...restr });
    });
  }, []);

  const toggleAllDays = () => {
    const next = !allDays;
    setAllDays(next);
    setWeekdays(next ? [...WEEKDAYS] : []);
  };

  const toggleWeekday = d => {
    const next = weekdays.includes(d) ? weekdays.filter(x => x !== d) : [...weekdays, d];
    setWeekdays(next);
    setAllDays(next.length === WEEKDAYS.length);
  };

  const submit = async () => {
    setLoading(true);
    try {
      const wd = weekdays.length === WEEKDAYS.length ? [] : weekdays;
      if (type === "INVENTORY") {
        const updates = roomTypes.map(rt => ({ roomType: rt, value: Number(values[rt] || 0) }));
        const res = await api.post("/channel/bulk-update/inventory", { fromDate, toDate, weekdays: wd, updates });
        alert(`✅ Inventory updated — ${res.data.updated} entries modified`);

      } else if (type === "RATE") {
        const updates = ratePlans.filter(rp => selected[rp.id])
          .map(rp => ({ ratePlanId: rp.id, value: Number(values[rp.id] || 0) }));
        const res = await api.post("/channel/bulk-update/rate", { fromDate, toDate, weekdays: wd, updates });
        alert(`✅ Rates updated — ${res.data.updated} entries modified`);

      } else if (type === "INCREMENT") {
        const updates = ratePlans.filter(rp => selected[rp.id] && values[rp.id] !== "")
          .map(rp => ({ ratePlanId: rp.id, increment: Number(values[rp.id]) }));
        const res = await api.post("/channel/bulk-update/increment", { fromDate, toDate, weekdays: wd, updates });
        alert(`✅ Rates incremented — ${res.data.updated} entries modified`);

      } else if (type === "RESTRICT_RATE") {
        const updates = ratePlans.filter(rp => selected[rp.id]).map(rp => ({
          ratePlanId: rp.id,
          stopSell:         restrictions[rp.id]?.stopSell         || false,
          closeOnArrival:   restrictions[rp.id]?.closeOnArrival   || false,
          closeOnDeparture: restrictions[rp.id]?.closeOnDeparture || false,
          minStay: restrictions[rp.id]?.minStay ? Number(restrictions[rp.id].minStay) : null,
          maxStay: restrictions[rp.id]?.maxStay ? Number(restrictions[rp.id].maxStay) : null,
        }));
        const res = await api.post("/channel/bulk-update/restrictions",
          { fromDate, toDate, weekdays: wd, restrictionType: "RATE", updates });
        alert(`✅ Rate restrictions saved — ${res.data.updated} entries modified`);

      } else if (type === "RESTRICT_INV") {
        const updates = roomTypes.map(rt => ({
          roomType: rt,
          stopSell:         restrictions[rt]?.stopSell         || false,
          closeOnArrival:   restrictions[rt]?.closeOnArrival   || false,
          closeOnDeparture: restrictions[rt]?.closeOnDeparture || false,
          minStay: restrictions[rt]?.minStay ? Number(restrictions[rt].minStay) : null,
          maxStay: restrictions[rt]?.maxStay ? Number(restrictions[rt].maxStay) : null,
        }));
        const res = await api.post("/channel/bulk-update/restrictions",
          { fromDate, toDate, weekdays: wd, restrictionType: "INVENTORY", updates });
        alert(`✅ Inventory restrictions saved — ${res.data.updated} entries modified`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helpers for restriction toggle
  const toggleRestriction = (key, field) => {
    setRestrictions(p => ({ ...p, [key]: { ...p[key], [field]: !p[key]?.[field] } }));
  };
  const setRestrictionNum = (key, field, val) => {
    setRestrictions(p => ({ ...p, [key]: { ...p[key], [field]: val } }));
  };

  const isRateBased = type === "RATE" || type === "INCREMENT" || type === "RESTRICT_RATE";

  return (
    <div className="card" style={{ maxWidth: 860 }}>
      {/* Date range */}
      <div className="section-heading">Date Range</div>
      <div className="form-grid" style={{ marginBottom: 20 }}>
        <div className="form-group">
          <label className="form-label">From Date</label>
          <input className="form-input" type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">To Date</label>
          <input className="form-input" type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </div>
      </div>

      {/* Update type */}
      <div className="form-group" style={{ marginBottom: 20 }}>
        <label className="form-label">Type</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
          {BULK_TYPES.map(t => (
            <label key={t.id} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "7px 14px",
              borderRadius: "var(--radius-sm)", cursor: "pointer",
              border: `1px solid ${type === t.id ? "var(--accent)" : "var(--border)"}`,
              background: type === t.id ? "var(--accent-glow)" : "transparent",
              color: type === t.id ? "var(--accent)" : "var(--text-secondary)",
              fontWeight: 600, fontSize: 12,
            }}>
              <input type="radio" checked={type === t.id} onChange={() => setType(t.id)} style={{ display: "none" }} />
              {t.label}
            </label>
          ))}
        </div>
      </div>

      {/* Weekdays */}
      <div className="form-group" style={{ marginBottom: 24 }}>
        <label className="form-label">Weekdays</label>
        <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className={"checkbox-chip " + (allDays ? "checked" : "")} onClick={toggleAllDays} style={{ minWidth: 40 }}>
            <input type="checkbox" checked={allDays} onChange={() => {}} />
            All
          </label>
          {WEEKDAYS.map(d => (
            <label key={d} className={"checkbox-chip " + (weekdays.includes(d) ? "checked" : "")} onClick={() => toggleWeekday(d)}>
              <input type="checkbox" checked={weekdays.includes(d)} onChange={() => {}} />
              {d}
            </label>
          ))}
        </div>
      </div>

      {/* ── INVENTORY ── */}
      {type === "INVENTORY" && (
        <>
          <div className="section-heading">Available Rooms per Room Type</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {roomTypes.map(rt => (
              <div key={rt} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <span className="badge badge-gold" style={{ minWidth: 140 }}>{rt.replace(/_/g, " ")}</span>
                <input className="form-input" type="number" min={0} placeholder="Available rooms"
                  value={values[rt] || ""}
                  onChange={e => setValues(p => ({ ...p, [rt]: e.target.value }))}
                  style={{ maxWidth: 160 }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── RATE ── */}
      {type === "RATE" && (
        <>
          <div className="section-heading">Set Rates</div>
          <RatePlanTable ratePlans={ratePlans} selected={selected} setSelected={setSelected}
            renderValue={(rp) => (
              <input className="form-input" type="number" min={0} placeholder="New rate (₹)"
                value={values[rp.id] || ""}
                onChange={e => setValues(p => ({ ...p, [rp.id]: e.target.value }))}
                style={{ maxWidth: 130 }} />
            )} />
        </>
      )}

      {/* ── INCREMENT ── */}
      {type === "INCREMENT" && (
        <>
          <div className="section-heading" style={{ marginBottom: 6 }}>Increment / Decrement Rates</div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            Enter positive values to increase rates, negative values to decrease. Leave blank to skip a plan.
          </p>
          <RatePlanTable ratePlans={ratePlans} selected={selected} setSelected={setSelected}
            colHeader="Increment (₹)"
            renderValue={(rp) => (
              <input className="form-input" type="number" placeholder="e.g. +300 or -150"
                value={values[rp.id] || ""}
                onChange={e => setValues(p => ({ ...p, [rp.id]: e.target.value }))}
                style={{ maxWidth: 150 }} />
            )} />
        </>
      )}

      {/* ── RESTRICTIONS (RATES) ── */}
      {type === "RESTRICT_RATE" && (
        <>
          <div className="section-heading" style={{ marginBottom: 6 }}>Rate Restrictions</div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            Apply stop-sell or stay controls per rate plan for the selected date range.
          </p>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>✓</th>
                  <th>Rate Plan</th>
                  <th>Room Type</th>
                  {RESTRICTION_FIELDS.map(f => <th key={f.key} style={{ textAlign: "center" }}>{f.label}</th>)}
                  <th>Min Stay</th>
                  <th>Max Stay</th>
                </tr>
              </thead>
              <tbody>
                {ratePlans.map(rp => (
                  <tr key={rp.id}>
                    <td>
                      <input type="checkbox" checked={!!selected[rp.id]}
                        onChange={e => setSelected(p => ({ ...p, [rp.id]: e.target.checked }))}
                        style={{ accentColor: "var(--accent)" }} />
                    </td>
                    <td>{rp.name}</td>
                    <td><span className="badge badge-gold">{rp.roomType?.replace(/_/g, " ")}</span></td>
                    {RESTRICTION_FIELDS.map(f => (
                      <td key={f.key} style={{ textAlign: "center" }}>
                        <input type="checkbox"
                          checked={!!restrictions[rp.id]?.[f.key]}
                          onChange={() => toggleRestriction(rp.id, f.key)}
                          style={{ accentColor: "#ef4444", width: 16, height: 16 }} />
                      </td>
                    ))}
                    <td>
                      <input className="form-input" type="number" min={1} placeholder="—"
                        value={restrictions[rp.id]?.minStay || ""}
                        onChange={e => setRestrictionNum(rp.id, "minStay", e.target.value)}
                        style={{ maxWidth: 70 }} />
                    </td>
                    <td>
                      <input className="form-input" type="number" min={1} placeholder="—"
                        value={restrictions[rp.id]?.maxStay || ""}
                        onChange={e => setRestrictionNum(rp.id, "maxStay", e.target.value)}
                        style={{ maxWidth: 70 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── RESTRICTIONS (INVENTORY) ── */}
      {type === "RESTRICT_INV" && (
        <>
          <div className="section-heading" style={{ marginBottom: 6 }}>Inventory Restrictions</div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 14 }}>
            Stop-sell or close room types for specific dates / weekday patterns.
          </p>
          <div className="table-wrap" style={{ marginBottom: 20 }}>
            <table>
              <thead>
                <tr>
                  <th>Room Type</th>
                  {RESTRICTION_FIELDS.map(f => <th key={f.key} style={{ textAlign: "center" }}>{f.label}</th>)}
                  <th>Min Stay</th>
                  <th>Max Stay</th>
                </tr>
              </thead>
              <tbody>
                {roomTypes.map(rt => (
                  <tr key={rt}>
                    <td style={{ fontWeight: 600 }}>{rt.replace(/_/g, " ")}</td>
                    {RESTRICTION_FIELDS.map(f => (
                      <td key={f.key} style={{ textAlign: "center" }}>
                        <input type="checkbox"
                          checked={!!restrictions[rt]?.[f.key]}
                          onChange={() => toggleRestriction(rt, f.key)}
                          style={{ accentColor: "#ef4444", width: 16, height: 16 }} />
                      </td>
                    ))}
                    <td>
                      <input className="form-input" type="number" min={1} placeholder="—"
                        value={restrictions[rt]?.minStay || ""}
                        onChange={e => setRestrictionNum(rt, "minStay", e.target.value)}
                        style={{ maxWidth: 70 }} />
                    </td>
                    <td>
                      <input className="form-input" type="number" min={1} placeholder="—"
                        value={restrictions[rt]?.maxStay || ""}
                        onChange={e => setRestrictionNum(rt, "maxStay", e.target.value)}
                        style={{ maxWidth: 70 }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={submit} disabled={loading}>
          {loading ? "Updating…" : "⚡ Update"}
        </button>
      </div>
    </div>
  );
}

// Shared rate-plan table used by Rate and Increment modes
function RatePlanTable({ ratePlans, selected, setSelected, renderValue, colHeader = "Value (₹)" }) {
  if (ratePlans.length === 0)
    return <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 20 }}>No rate plans found.</p>;
  return (
    <div className="table-wrap" style={{ marginBottom: 20 }}>
      <table>
        <thead>
          <tr>
            <th style={{ width: 36 }}>✓</th>
            <th>Rate Plan</th>
            <th>Room Type</th>
            <th>{colHeader}</th>
          </tr>
        </thead>
        <tbody>
          {ratePlans.map(rp => (
            <tr key={rp.id}>
              <td>
                <input type="checkbox" checked={!!selected[rp.id]}
                  onChange={e => setSelected(p => ({ ...p, [rp.id]: e.target.checked }))}
                  style={{ accentColor: "var(--accent)" }} />
              </td>
              <td>{rp.name}</td>
              <td><span className="badge badge-gold">{rp.roomType?.replace(/_/g, " ")}</span></td>
              <td>{renderValue(rp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Shared style helpers ───────────────────────────────────────────────────

function thLeft(w) {
  return {
    padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700,
    color: "var(--text-muted)", background: "var(--bg-input)",
    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
    position: "sticky", left: 0, zIndex: 2, minWidth: w, maxWidth: w,
    letterSpacing: "0.04em",
  };
}

function thDate(w) {
  return {
    padding: "8px 6px", textAlign: "center", width: w, minWidth: w,
    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
  };
}

function tdLabel(w, color) {
  return {
    padding: "8px 14px", fontSize: 11, fontWeight: 700, color,
    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
    position: "sticky", left: 0, background: "var(--bg-card)", zIndex: 1,
    minWidth: w, maxWidth: w, whiteSpace: "nowrap",
  };
}

function tdStat(w) {
  return {
    padding: "6px 8px", textAlign: "center", width: w,
    borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
  };
}

// ── Tab: OTA Sync ──────────────────────────────────────────────────────────

const ROOM_TYPE_OPTIONS = ["DELUXE", "SUPER_DELUXE"];

function OtaSyncTab() {
  const [configs, setConfigs]     = useState([]);
  const [logs, setLogs]           = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [editId, setEditId]       = useState(null);
  const [form, setForm]           = useState({ otaName: "Booking.com", icalUrl: "", roomType: "DELUXE", enabled: true });
  const [syncing, setSyncing]     = useState({});
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    const [cfgRes, logRes] = await Promise.all([
      api.get("/ota-sync/configs"),
      api.get("/ota-sync/logs"),
    ]);
    setConfigs(cfgRes.data);
    setLogs(logRes.data);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm({ otaName: "Booking.com", icalUrl: "", roomType: "DELUXE", enabled: true });
    setTestResult(null);
    setShowForm(true);
  };

  const openEdit = (cfg) => {
    setEditId(cfg.id);
    setForm({ otaName: cfg.otaName, icalUrl: cfg.icalUrl, roomType: cfg.roomType, enabled: cfg.enabled });
    setTestResult(null);
    setShowForm(true);
  };

  const testUrl = async () => {
    if (!form.icalUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.post("/ota-sync/test-url", { url: form.icalUrl });
      setTestResult(res.data);
    } finally { setTesting(false); }
  };

  const saveConfig = async () => {
    if (!form.icalUrl.trim()) { alert("iCal URL is required"); return; }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/ota-sync/configs/${editId}`, form);
      } else {
        await api.post("/ota-sync/configs", form);
      }
      setShowForm(false);
      load();
    } finally { setSaving(false); }
  };

  const deleteConfig = async (id) => {
    if (!window.confirm("Remove this OTA feed?")) return;
    await api.delete(`/ota-sync/configs/${id}`);
    load();
  };

  const toggle = async (id) => {
    await api.put(`/ota-sync/configs/${id}/toggle`);
    load();
  };

  const syncNow = async (id) => {
    setSyncing(p => ({ ...p, [id]: true }));
    try {
      await api.post(`/ota-sync/sync/${id}`);
      load();
    } finally { setSyncing(p => ({ ...p, [id]: false })); }
  };

  const fmtTime = (ts) => {
    if (!ts) return "Never";
    const d = new Date(ts);
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
         + " " + d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      {/* How-to Banner */}
      <div style={{
        background: "var(--accent-glow)", border: "1px solid var(--accent)",
        borderRadius: "var(--radius)", padding: "14px 18px", marginBottom: 24,
        fontSize: 13, lineHeight: 1.7,
      }}>
        <strong style={{ color: "var(--accent)" }}>📋 How to get your Booking.com iCal URL</strong>
        <ol style={{ margin: "8px 0 0 18px", color: "var(--text-secondary)" }}>
          <li>Log in to your <strong>Booking.com Extranet</strong></li>
          <li>Go to <strong>Property → Availability</strong></li>
          <li>Click <strong>"Sync calendar"</strong> or look for <strong>"Export calendar"</strong></li>
          <li>Copy the <strong>.ics URL</strong> provided — paste it below</li>
        </ol>
        <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>
          Once saved, bookings sync automatically every <strong>30 minutes</strong>. Use "Sync Now" for immediate import.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button className="btn btn-primary btn-sm" onClick={openAdd}>＋ Add iCal Feed</button>
        {configs.length > 0 && (
          <button className="btn btn-secondary btn-sm" onClick={async () => {
            await api.post("/ota-sync/sync-all");
            load();
          }}>
            🔄 Sync All
          </button>
        )}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="card" style={{ maxWidth: 620, marginBottom: 24 }}>
          <div className="section-heading" style={{ marginBottom: 16 }}>
            {editId ? "Edit iCal Feed" : "Add iCal Feed"}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">OTA Name</label>
              <select className="form-select" value={form.otaName}
                onChange={e => setForm(p => ({ ...p, otaName: e.target.value }))}>
                <option>Booking.com</option>
                <option>Airbnb</option>
                <option>Agoda</option>
                <option>Expedia</option>
                <option>Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Maps to Room Type</label>
              <select className="form-select" value={form.roomType}
                onChange={e => setForm(p => ({ ...p, roomType: e.target.value }))}>
                {ROOM_TYPE_OPTIONS.map(rt => (
                  <option key={rt} value={rt}>{rt.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: "1 / -1" }}>
              <label className="form-label">iCal URL (.ics)</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-input" type="url"
                  placeholder="https://booking.com/hotel/ical/your-property.ics"
                  value={form.icalUrl}
                  onChange={e => { setForm(p => ({ ...p, icalUrl: e.target.value })); setTestResult(null); }}
                  style={{ flex: 1 }} />
                <button className="btn btn-secondary btn-sm" onClick={testUrl} disabled={testing || !form.icalUrl.trim()}>
                  {testing ? "Testing…" : "🔍 Test"}
                </button>
              </div>
              {testResult && (
                <div style={{
                  marginTop: 8, padding: "8px 12px", borderRadius: 4, fontSize: 12,
                  background: testResult.valid ? "rgba(74,222,128,0.1)" : "rgba(239,68,68,0.1)",
                  border: `1px solid ${testResult.valid ? "rgba(74,222,128,0.4)" : "rgba(239,68,68,0.4)"}`,
                  color: testResult.valid ? "#4ade80" : "#ef4444",
                }}>
                  {testResult.valid ? "✅" : "❌"} {testResult.message}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
            <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveConfig} disabled={saving}>
              {saving ? "Saving…" : "Save Feed"}
            </button>
          </div>
        </div>
      )}

      {/* Config cards */}
      {configs.length === 0 && !showForm && (
        <div className="empty-state">
          <div className="empty-icon">📡</div>
          <p>No OTA feeds configured. Add your Booking.com iCal URL to start syncing.</p>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 32 }}>
        {configs.map(cfg => (
          <div key={cfg.id} className="card" style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ fontSize: 20 }}>🏨</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                  {cfg.otaName}
                  <span className="badge badge-gold" style={{ marginLeft: 8, fontSize: 10 }}>
                    {cfg.roomType?.replace(/_/g, " ")}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-all" }}>
                  {cfg.icalUrl?.substring(0, 60)}{cfg.icalUrl?.length > 60 ? "…" : ""}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                  Last sync: {fmtTime(cfg.lastSyncAt)}
                  {cfg.lastSyncStatus && (
                    <span style={{ marginLeft: 8, color: cfg.lastSyncStatus === "SUCCESS" ? "#4ade80" : "#ef4444" }}>
                      {cfg.lastSyncStatus === "SUCCESS" ? "✓ OK" : "✗ Error"}
                    </span>
                  )}
                </div>
              </div>

              {/* Status toggle */}
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 12,
                color: cfg.enabled ? "#4ade80" : "var(--text-muted)", fontWeight: 600 }}>
                <input type="checkbox" checked={cfg.enabled} onChange={() => toggle(cfg.id)}
                  style={{ accentColor: "#4ade80" }} />
                {cfg.enabled ? "Active" : "Paused"}
              </label>

              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => syncNow(cfg.id)}
                  disabled={syncing[cfg.id]}>
                  {syncing[cfg.id] ? "Syncing…" : "🔄 Sync Now"}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cfg)}>✏ Edit</button>
                <button className="btn btn-secondary btn-sm" style={{ color: "#ef4444" }}
                  onClick={() => deleteConfig(cfg.id)}>🗑</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Sync Log */}
      {logs.length > 0 && (
        <>
          <div className="section-heading" style={{ marginBottom: 12 }}>Recent Sync Log</div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>OTA</th>
                  <th style={{ textAlign: "center" }}>New Bookings</th>
                  <th style={{ textAlign: "center" }}>Skipped</th>
                  <th>Status</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ fontSize: 12, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                      {fmtTime(l.syncedAt)}
                    </td>
                    <td>{l.otaName}</td>
                    <td style={{ textAlign: "center", color: l.newBookings > 0 ? "#4ade80" : "var(--text-muted)", fontWeight: 600 }}>
                      {l.newBookings}
                    </td>
                    <td style={{ textAlign: "center", color: "var(--text-muted)" }}>{l.skipped}</td>
                    <td>
                      <span className={"badge " + (l.status === "SUCCESS" ? "badge-green" : "badge-red")}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-muted)" }}>{l.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "rates",  label: "📈 Update Rates"  },
  { id: "rooms",  label: "📦 Update Rooms"  },
  { id: "bulk",   label: "⚡ Bulk Update"   },
  { id: "ota",    label: "📡 OTA Sync"      },
];

export default function ChannelBulkUpdatePage() {
  const [tab, setTab] = useState("rates");

  return (
    <div>
      <div className="page-header">
        <h2>Channel Manager</h2>
        <p className="page-subtitle">Manage rates, inventory and bulk updates across channels</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, marginBottom: 24,
          borderBottom: "2px solid var(--border)", width: "fit-content" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 22px", fontSize: 13, fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              color: tab === t.id ? "var(--accent)" : "var(--text-muted)",
              borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              marginBottom: -2, transition: "all 0.15s",
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "rates" && <UpdateRatesTab />}
        {tab === "rooms" && <UpdateRoomsTab />}
        {tab === "bulk"  && <BulkUpdateTab />}
        {tab === "ota"   && <OtaSyncTab />}
      </div>
    </div>
  );
}
