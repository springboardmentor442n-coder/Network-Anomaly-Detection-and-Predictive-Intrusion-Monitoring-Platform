import { useState } from "react";

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

  // Demo users
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
          body: JSON.stringify({ url: url }),
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

  // =========================
  // LOGIN / REGISTER PAGE
  // =========================

  if (!isLoggedIn) {
    return (
      <div
        style={{
          textAlign: "center",
          padding: "60px",
        }}
      >
        <h1>🛡️ NetShield AI</h1>

        <p>
          AI-Powered Cybersecurity Monitoring Platform
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
            padding: "12px",
            width: "250px",
            display: "block",
            margin: "10px auto",
          }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: "12px",
            width: "250px",
            display: "block",
            margin: "10px auto",
          }}
        />

        {showRegister ? (
          <button onClick={register}>
            Register
          </button>
        ) : (
          <button onClick={login}>
            Login
          </button>
        )}

        {authError && (
          <p style={{ color: "red" }}>
            {authError}
          </p>
        )}

        <p style={{ marginTop: "20px" }}>
          {showRegister
            ? "Already have an account?"
            : "Don't have an account?"}
        </p>

        <button
          onClick={() => {
            setShowRegister(!showRegister);
            setAuthError("");
          }}
        >
          {showRegister ? "Go to Login" : "Create Account"}
        </button>

        {!showRegister && (
          <div style={{ marginTop: "30px" }}>
            <p><b>Demo Login</b></p>
            <p>Admin: admin / admin123</p>
            <p>Analyst: analyst / analyst123</p>
            <p>User: user / user123</p>
          </div>
        )}
      </div>
    );
  }

  // =========================
  // DASHBOARD / SCANNER
  // =========================

  return (
    <div
      style={{
        textAlign: "center",
        padding: "50px",
      }}
    >
      <h1>🛡️ NetShield AI</h1>

      <p>
        Welcome, <b>{username}</b>
      </p>

      <p>
        Role: <b>{role}</b>
      </p>

      <hr />

      <h2>URL Security Scanner</h2>

      <input
        type="text"
        placeholder="Enter URL to scan"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        style={{
          padding: "12px",
          width: "300px",
          marginRight: "10px",
        }}
      />

      <button onClick={scanUrl}>
        {loading ? "Scanning..." : "Scan URL"}
      </button>

      {result && (
        <div style={{ marginTop: "30px" }}>
          {result.error ? (
            <p style={{ color: "red" }}>
              {result.error}
            </p>
          ) : (
            <>
              <h2>Scan Result</h2>

              <p>
                URL: {result.url}
              </p>

              <p>
                Risk Level: <b>{result.risk}</b>
              </p>

              <p>
                Score: {result.score}
              </p>

              {result.warnings &&
                result.warnings.length > 0 && (
                  <div>
                    <h3>Warnings</h3>

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

      <br />

      <button
        onClick={() => {
          setIsLoggedIn(false);
          setUsername("");
          setPassword("");
          setResult(null);
        }}
      >
        Logout
      </button>
    </div>
  );
}

export default App;