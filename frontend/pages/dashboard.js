import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { api, getToken, clearToken } from "../lib/api";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [traffic, setTraffic] = useState([]);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!getToken()) {
      router.push("/");
      return;
    }
    loadData();
  }, []);

  async function loadData() {
    try {
      const [meRes, statsRes, trafficRes] = await Promise.all([
        api.get("/auth/me"),
        api.get("/traffic/stats"),
        api.get("/traffic/?limit=25"),
      ]);
      setUser(meRes.data);
      setStats(statsRes.data);
      setTraffic(trafficRes.data);
    } catch (err) {
      setError("Session expired or backend unreachable. Please log in again.");
    }
  }

  function handleLogout() {
    clearToken();
    router.push("/");
  }

  return (
    <div className="container">
      <div className="topbar">
        <h1>🛡️ NetShield AI — Dashboard</h1>
        <div>
          {user && (
            <span style={{ marginRight: "1rem", color: "#94a3b8" }}>
              {user.full_name} ({user.role})
            </span>
          )}
          <button onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Total Flows</div>
            <div className="value">{stats.total_flows}</div>
          </div>
          <div className="stat-card danger">
            <div className="label">Anomalous</div>
            <div className="value">{stats.anomalous_flows}</div>
          </div>
          <div className="stat-card ok">
            <div className="label">Benign</div>
            <div className="value">{stats.benign_flows}</div>
          </div>
          <div className="stat-card">
            <div className="label">Avg Risk Score</div>
            <div className="value">{stats.avg_risk_score}</div>
          </div>
        </div>
      )}

      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>Recent Network Traffic</h2>
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Source IP</th>
              <th>Dest IP</th>
              <th>Protocol</th>
              <th>Bytes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {traffic.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "#94a3b8" }}>
                  No traffic ingested yet — run the dataset loader or POST to
                  /traffic/ingest.
                </td>
              </tr>
            )}
            {traffic.map((t) => (
              <tr key={t.id}>
                <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
                <td>{t.src_ip}</td>
                <td>{t.dst_ip}</td>
                <td>{t.protocol}</td>
                <td>{t.total_bytes ?? "-"}</td>
                <td>
                  <span
                    className={`badge ${t.is_anomalous ? "anomalous" : "benign"}`}
                  >
                    {t.is_anomalous ? "Anomalous" : "Benign"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
