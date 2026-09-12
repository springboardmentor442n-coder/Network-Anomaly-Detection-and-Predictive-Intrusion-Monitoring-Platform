import { useState, useEffect } from "react";

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("User");
  const [authError, setAuthError] = useState("");

  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const [traffic, setTraffic] = useState(null);
  const [trafficLoading, setTrafficLoading] = useState(false);

  const users = [
    {
      username: "admin",
      password: "admin123",
      role: "Admin",
    },
    {
      username: "analyst",
      password: "analyst123",
      role: "Analyst",
    },
    {
      username: "user",
      password: "user123",
      role: "User",
    },
  ];

  const login = () => {
    setAuthError("");

    const foundUser = users.find(
      (user) =>
        user.username === username &&
        user.password === password
    );

    if (foundUser) {
      setRole(foundUser.role);
      setIsLoggedIn(true);
    } else {
      setAuthError("Invalid username or password");
    }
  };

  const register = () => {
    setAuthError("");

    if (!username || !password) {
      setAuthError("Please enter username and password");
      return;
    }

    alert("Registration successful! You can now login.");
    setShowRegister(false);
  };

  const scanUrl = async () => {
    if (!url) {
      setResult({ error: "Please enter a URL" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/scan",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ url }),
        }
      );

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        error: "Could not connect to backend.",
      });
    }

    setLoading(false);
  };

  const loadTraffic = async () => {
    setTrafficLoading(true);

    try {
      const response = await fetch(
        "http://127.0.0.1:5000/traffic"
      );

      const data = await response.json();
      setTraffic(data);
    } catch (error) {
      setTraffic({
        error: "Could not load traffic analytics.",
      });
    }

    setTrafficLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn) {
      loadTraffic();
    }
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f172a",
          color: "white",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontFamily: "Arial",
        }}
      >
        <div
          style={{
            background: "#1e293b",
            padding: "40px",
            borderRadius: "15px",
            width: "350px",
            textAlign: "center",
          }}
        >
          <h1>🛡️ NetShield AI</h1>

          <p>
            AI-Powered Network Anomaly Detection
          </p>

          <h2>
            {showRegister ? "Create Account" : "Login"}
          </h2>

          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={{
              width: "90%",
              padding: "12px",
              margin: "8px",
              borderRadius: "8px",
              border: "none",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "90%",
              padding: "12px",
              margin: "8px",
              borderRadius: "8px",
              border: "none",
            }}
          />

          <button
            onClick={showRegister ? register : login}
            style={{
              padding: "12px 30px",
              margin: "15px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showRegister ? "Register" : "Login"}
          </button>

          {authError && (
            <p style={{ color: "#f87171" }}>
              {authError}
            </p>
          )}

          <p>
            {showRegister
              ? "Already have an account?"
              : "Don't have an account?"}
          </p>

          <button
            onClick={() => {
              setShowRegister(!showRegister);
              setAuthError("");
            }}
            style={{
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
            }}
          >
            {showRegister ? "Go to Login" : "Create Account"}
          </button>

          {!showRegister && (
            <div style={{ marginTop: "25px" }}>
              <p>
                <b>Demo Login</b>
              </p>

              <p>Admin: admin / admin123</p>
              <p>Analyst: analyst / analyst123</p>
              <p>User: user / user123</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const total =
    traffic?.total ??
    traffic?.total_traffic ??
    0;

  const benign =
    traffic?.benign ??
    traffic?.normal ??
    traffic?.benign_traffic ??
    0;

  const attacks =
    traffic?.attacks ??
    traffic?.attack ??
    traffic?.attack_traffic ??
    0;

  const attackTypes =
    traffic?.attack_types ??
    traffic?.examples ??
    {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f1f5f9",
        fontFamily: "Arial",
        color: "#0f172a",
      }}
    >
      <header
        style={{
          background: "#0f172a",
          color: "white",
          padding: "20px 40px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>
            🛡️ NetShield AI
          </h1>

          <p style={{ margin: "5px 0 0" }}>
            Network Anomaly Detection Dashboard
          </p>
        </div>

        <div>
          <b>{username}</b>
          <span style={{ marginLeft: "15px" }}>
            {role}
          </span>

          <button
            onClick={() => {
              setIsLoggedIn(false);
              setUsername("");
              setPassword("");
              setResult(null);
            }}
            style={{
              marginLeft: "20px",
              padding: "8px 15px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main style={{ padding: "30px 40px" }}>
        <h2>Security Overview</h2>

        {trafficLoading ? (
          <p>Loading traffic analytics...</p>
        ) : traffic?.error ? (
          <p style={{ color: "red" }}>
            {traffic.error}
          </p>
        ) : (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(3, 1fr)",
                gap: "20px",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h3>Total Traffic</h3>
                <h1>{total.toLocaleString()}</h1>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h3>Normal Traffic</h3>
                <h1>{benign.toLocaleString()}</h1>
              </div>

              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "12px",
                  boxShadow:
                    "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                <h3>Attacks Detected</h3>
                <h1>{attacks.toLocaleString()}</h1>
              </div>
            </div>

            <div
              style={{
                background: "white",
                marginTop: "30px",
                padding: "25px",
                borderRadius: "12px",
                boxShadow:
                  "0 2px 8px rgba(0,0,0,0.1)",
              }}
            >
              <h2>Attack Types</h2>

              {Object.keys(attackTypes).length === 0 ? (
                <p>No attack type information available.</p>
              ) : (
                Object.entries(attackTypes).map(
                  ([name, count]) => (
                    <div
                      key={name}
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        padding: "12px",
                        borderBottom:
                          "1px solid #e2e8f0",
                      }}
                    >
                      <b>{name}</b>
                      <span>
                        {Number(count).toLocaleString()}
                      </span>
                    </div>
                  )
                )
              )}
            </div>
          </>
        )}

        <div
          style={{
            background: "white",
            marginTop: "30px",
            padding: "25px",
            borderRadius: "12px",
            boxShadow:
              "0 2px 8px rgba(0,0,0,0.1)",
          }}
        >
          <h2>🔍 URL Security Scanner</h2>

          <input
            type="text"
            placeholder="Enter URL to scan"
            value={url}
            onChange={(e) =>
              setUrl(e.target.value)
            }
            style={{
              padding: "12px",
              width: "60%",
              borderRadius: "7px",
              border: "1px solid #cbd5e1",
            }}
          />

          <button
            onClick={scanUrl}
            style={{
              padding: "12px 20px",
              marginLeft: "10px",
              borderRadius: "7px",
              border: "none",
              cursor: "pointer",
              background: "#0f172a",
              color: "white",
            }}
          >
            {loading ? "Scanning..." : "Scan URL"}
          </button>

          {result && (
            <div
              style={{
                marginTop: "25px",
                padding: "20px",
                background: "#f8fafc",
                borderRadius: "10px",
              }}
            >
              {result.error ? (
                <p style={{ color: "red" }}>
                  {result.error}
                </p>
              ) : (
                <>
                  <h3>Scan Result</h3>

                  <p>
                    <b>URL:</b> {result.url}
                  </p>

                  <p>
                    <b>Risk Level:</b>{" "}
                    {result.risk}
                  </p>

                  <p>
                    <b>Score:</b> {result.score}
                  </p>

                  {result.warnings &&
                    result.warnings.length > 0 && (
                      <div>
                        <h4>Warnings</h4>

                        {result.warnings.map(
                          (warning, index) => (
                            <p key={index}>
                              ⚠️ {warning}
                            </p>
                          )
                        )}
                      </div>
                    )}
                </>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;