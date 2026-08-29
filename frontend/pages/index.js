import { useState } from "react";
import { useRouter } from "next/router";
import { api, saveToken } from "../lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", { email, password });
      saveToken(res.data.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err?.response?.data?.detail || "Login failed");
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, marginTop: "10vh" }}>
      <h1 style={{ marginBottom: "1.5rem" }}>🛡️ NetShield AI</h1>
      <div className="card">
        <h2 style={{ marginBottom: "1rem" }}>Security Analyst Login</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit" style={{ width: "100%" }}>
            Sign In
          </button>
        </form>
      </div>
      <p style={{ color: "#94a3b8", fontSize: "0.85rem" }}>
        No account? Register via the API at <code>/auth/register</code> (or
        build a signup page as a stretch goal).
      </p>
    </div>
  );
}
