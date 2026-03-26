import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function GuestsPage() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const res = await api.get("/guests", { params: { search } });
    setGuests(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleKey = (e) => { if (e.key === "Enter") load(); };

  return (
    <div>
      <div className="page-header">
        <h2>Guests</h2>
        <p className="page-subtitle">Manage and search guest profiles</p>
        <div className="header-divider" />
      </div>

      <div className="page-body">
        <div className="search-bar">
          <input
            className="form-input"
            placeholder="🔍  Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKey}
            style={{ maxWidth: 320 }}
          />
          <button className="btn btn-primary" onClick={load}>Search</button>
          {search && (
            <button className="btn btn-secondary" onClick={() => { setSearch(""); api.get("/guests").then((r) => setGuests(r.data)); }}>
              Clear
            </button>
          )}
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--text-muted)" }}>
            {guests.length} guest{guests.length !== 1 ? "s" : ""}
          </span>
        </div>

        {guests.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👤</div>
            <p>No guests found</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Email</th>
                </tr>
              </thead>
              <tbody>
                {guests.map((g) => (
                  <tr key={g.id}>
                    <td>{g.id}</td>
                    <td>{g.name}</td>
                    <td>{g.phone ?? "—"}</td>
                    <td>{g.email ?? "—"}</td>
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
