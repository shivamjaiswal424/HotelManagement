import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function PricingRecommendations() {
  const [recs, setRecs]         = useState([]);
  const [loading, setLoading]   = useState(false);
  const [generating, setGen]    = useState(false);
  const [msg, setMsg]           = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get("/pricing/recommendations");
      setRecs(res.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const generate = async () => {
    setGen(true); setMsg("");
    try {
      const res = await api.post("/pricing/generate");
      setRecs(res.data);
      setMsg(res.data.length > 0 ? `${res.data.length} new recommendation(s) generated` : "No changes recommended for now");
    } catch { setMsg("Failed to generate recommendations"); }
    finally { setGen(false); }
  };

  const approve = async (id) => {
    await api.put(`/pricing/recommendations/${id}/approve`);
    setMsg("Rate applied to all rooms of this type ✓");
    load();
  };

  const dismiss = async (id) => {
    await api.put(`/pricing/recommendations/${id}/dismiss`);
    load();
  };

  const pct = (curr, sugg) => {
    if (!curr) return 0;
    return Math.round(((sugg - curr) / curr) * 100);
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
            ✨ Smart Pricing Recommendations
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            AI-suggested rates based on occupancy & trends · Auto-runs daily at 8 AM
          </div>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={generate} disabled={generating}>
          {generating ? "Analysing…" : "⟳ Generate Now"}
        </button>
      </div>

      {msg && (
        <div style={{ fontSize: 12, color: "var(--accent)", marginBottom: 12, fontWeight: 600 }}>{msg}</div>
      )}

      {loading && <div style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading…</div>}

      {!loading && recs.length === 0 && (
        <div style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic" }}>
          No pending recommendations. Click "Generate Now" to analyse current occupancy.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {recs.map(rec => {
          const change = pct(rec.currentRate, rec.suggestedRate);
          const up     = change > 0;
          return (
            <div key={rec.id} style={{
              display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
              padding: "12px 16px", borderRadius: "var(--radius-sm)",
              background: "var(--bg-input)", border: "1px solid var(--border)",
            }}>
              {/* Room type badge */}
              <span className="badge badge-gold" style={{ minWidth: 110, textAlign: "center" }}>
                {rec.roomType?.replace("_", " ")}
              </span>

              {/* Rate change */}
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, color: "var(--text-muted)", textDecoration: "line-through" }}>
                    ₹{Number(rec.currentRate).toLocaleString("en-IN")}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                    → ₹{Number(rec.suggestedRate).toLocaleString("en-IN")}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
                    background: up ? "rgba(74,222,128,0.15)" : "rgba(239,68,68,0.15)",
                    color: up ? "#4ade80" : "#ef4444",
                  }}>
                    {up ? "▲" : "▼"} {Math.abs(change)}%
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                  {rec.reason}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-primary btn-sm" onClick={() => approve(rec.id)}>
                  ✓ Apply
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => dismiss(rec.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
