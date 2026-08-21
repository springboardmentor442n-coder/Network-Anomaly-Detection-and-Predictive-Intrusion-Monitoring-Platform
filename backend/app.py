from flask import Flask, request, jsonify
from flask_cors import CORS
from urllib.parse import urlparse

app = Flask(__name__)
CORS(app)


@app.route("/")
def home():
    return "NetShield AI Backend is Running!"


@app.route("/scan", methods=["POST"])
def scan():
    data = request.get_json()
    url = data.get("url", "").strip()

    if not url:
        return jsonify({
            "status": "error",
            "message": "Please enter a URL"
        }), 400

    # Add https if the user didn't enter it
    check_url = url if "://" in url else "http://" + url

    parsed = urlparse(check_url)
    hostname = parsed.hostname or ""

    score = 0
    warnings = []

    # Check HTTPS
    if parsed.scheme != "https":
        score += 30
        warnings.append("URL does not use HTTPS")
    
    # Check suspicious characters
    if "@" in url:
        score += 25
        warnings.append("URL contains @ symbol")

    # Check IP address instead of domain
    if hostname.replace(".", "").isdigit():
        score += 25
        warnings.append("URL uses an IP address instead of a domain name")

    # Check URL length
    if len(url) > 100:
        score += 10
        warnings.append("URL is unusually long")

    # Risk level
    if score >= 60:
        risk = "High"
    elif score >= 30:
        risk = "Medium"
    else:
        risk = "Low"

    return jsonify({
        "url": url,
        "risk": risk,
        "score": score,
        "warnings": warnings
    })


if __name__ == "__main__":
    app.run(debug=True)