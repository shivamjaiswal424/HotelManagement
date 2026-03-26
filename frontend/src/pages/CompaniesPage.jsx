import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);

  const load = async () => {
    const res = await api.get("/companies");
    setCompanies(res.data);
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Companies</h2>
        <p className="page-subtitle">Corporate accounts and billing overview</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="toolbar">
          <button className="btn btn-secondary btn-sm" onClick={load}>↻ Refresh</button>
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            {companies.length} compan{companies.length !== 1 ? "ies" : "y"}
          </span>
        </div>

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
                {companies.map((c) => (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.name}</td>
                    <td>{c.gstVat ?? "—"}</td>
                    <td>₹{c.totalBilled?.toLocaleString() ?? "0"}</td>
                    <td>
                      {c.totalOutstanding > 0
                        ? <span className="badge badge-red">₹{c.totalOutstanding?.toLocaleString()}</span>
                        : <span className="badge badge-green">Nil</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
