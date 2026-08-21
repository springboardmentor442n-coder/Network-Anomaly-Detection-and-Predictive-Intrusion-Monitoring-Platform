import { useState } from "react";

function App() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const scanUrl = async () => {
    if (!url) {
      setResult({ error: "Please enter a URL" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("http://127.0.0.1:5000/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url }),
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({ error: "Could not connect to backend." });
    }

    setLoading(false);
  };

  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>🛡️ NetShield AI</h1>

      <p>AI-Powered Cybersecurity URL Scanner</p>

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
            <p>{result.error}</p>
          ) : (
            <>
              <h2>Scan Result</h2>
              <p>URL: {result.url}</p>
              <p>Risk Level: {result.risk}</p>
              <p>{result.result}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default App;