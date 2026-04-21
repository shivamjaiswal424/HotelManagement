import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [showAdd, setShowAdd]     = useState(false);
  const [form, setForm]           = useState({ name: "", gstVat: "", totalBilled: 0, totalOutstanding: 0 });
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    const res = await api.get("/companies");
    setCompanies(res.data);
  };

  useEffect(() => { load(); }, []);

  const saveCompany = async () => {
    if (!form.name.trim()) { alert("Company name is required"); return; }
    setSaving(true);
    try {
      await api.post("/companies", form);
      setShowAdd(false);
      setForm({ name: "", gstVat: "", totalBilled: 0, totalOutstanding: 0 });
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Companies</h2>
        <p className="page-subtitle">Corporate accounts &amp; City Ledger</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
          <button
            className={"btn btn-sm btn-" + (showAdd ? "secondary" : "primary")}
            style={{ marginLeft: 8 }}
            onClick={() => setShowAdd(v => !v)}
          >
            {showAdd ? "✕ Cancel" : "＋ Add Company"}
          </button>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            {companies.length} compan{companies.length !== 1 ? "ies" : "y"}
          </span>
        </div>

        {/* Add Company form */}
        {showAdd && (
          <div className="card" style={{ marginBottom: 20, maxWidth: 640 }}>
            <div className="section-heading" style={{ marginBottom: 16 }}>New Corporate Account</div>
            <div className="form-grid">
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label className="form-label">Company Name *</label>
                <input className="form-input" placeholder="e.g. Tata Consultancy Services" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">GST / VAT Number</label>
                <input className="form-input" placeholder="27AABCU9603R1ZX" value={form.gstVat}
                  onChange={e => setForm({ ...form, gstVat: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Opening Outstanding (₹)</label>
                <input className="form-input" type="number" min="0" value={form.totalOutstanding}
                  onChange={e => setForm({ ...form, totalOutstanding: parseFloat(e.target.value) || 0 })} />
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 }}>
              <button className="btn btn-secondary" onClick={() => setShowAdd(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveCompany} disabled={saving}>
                {saving ? "Saving…" : "Save Company"}
              </button>
            </div>
          </div>
        )}

        {companies.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🏢</div>
            <p>No corporate accounts yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company Name</th>
                  <th>GST / VAT</th>
                  <th>Total Billed</th>
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {companies.map(c => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{c.gstVat ?? "—"}</td>
                    <td>₹{c.totalBilled?.toLocaleString() ?? "0"}</td>
                    <td>
                      {c.totalOutstanding > 0
                        ? <span className="badge badge-red">₹{c.totalOutstanding?.toLocaleString()}</span>
                        : <span className="badge badge-green">Nil</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: "right", fontWeight: 600, color: "var(--text-secondary)", padding: "10px 12px" }}>
                    Total Outstanding
                  </td>
                  <td />
                  <td style={{ fontWeight: 700, color: "var(--red)", padding: "10px 12px" }}>
                    ₹{companies.reduce((s, c) => s + (c.totalOutstanding || 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
