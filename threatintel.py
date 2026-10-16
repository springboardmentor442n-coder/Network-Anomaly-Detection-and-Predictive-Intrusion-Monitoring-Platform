"""Threat-intelligence checks for an IP: a local blocklist file and, if NETSHIELD_ABUSEIPDB_KEY is set, AbuseIPDB.
The blocklist file (threat_intel/blocklist.txt) has one IP or CIDR range per line; '#' starts a comment."""
import ipaddress, json, os, time, urllib.parse, urllib.request

BLOCKLIST = os.getenv("NETSHIELD_BLOCKLIST", "threat_intel/blocklist.txt")
_cache, _bl = {}, {"mtime": None, "nets": []}

def _load_blocklist():
    try:
        m = os.path.getmtime(BLOCKLIST)
    except OSError:
        _bl.update(mtime=None, nets=[]); return _bl["nets"]
    if m != _bl["mtime"]:
        nets = []
        for line in open(BLOCKLIST, encoding="utf-8"):
            t = line.split("#")[0].strip()
            if t:
                try: nets.append(ipaddress.ip_network(t, strict=False))
                except ValueError: pass
        _bl.update(mtime=m, nets=nets)
    return _bl["nets"]

def in_blocklist(ip):
    try:
        a = ipaddress.ip_address(str(ip).strip())
    except ValueError:
        return False
    return any(a in n for n in _load_blocklist() if n.version == a.version)

def abuseipdb(ip):
    key = os.getenv("NETSHIELD_ABUSEIPDB_KEY")
    if not key:
        return None
    hit = _cache.get(ip)
    if hit and time.time() - hit[0] < 3600:
        return hit[1]
    req = urllib.request.Request("https://api.abuseipdb.com/api/v2/check?" + urllib.parse.urlencode({"ipAddress": ip, "maxAgeInDays": 90}),
                                 headers={"Key": key, "Accept": "application/json"})
    try:
        d = json.load(urllib.request.urlopen(req, timeout=8))["data"]
        res = {"score": d.get("abuseConfidenceScore"), "reports": d.get("totalReports"), "country": d.get("countryCode"), "isp": d.get("isp")}
    except Exception as e:
        res = {"error": str(e)[:100]}
    _cache[ip] = (time.time(), res)
    return res

def lookup(ip):
    a = ipaddress.ip_address(str(ip).strip())          # raises ValueError for a bad address
    out = {"ip": str(a), "private": a.is_private, "blocklist": in_blocklist(a),
           "abuseipdb": None if a.is_private else abuseipdb(str(a))}
    score = (out["abuseipdb"] or {}).get("score") or 0
    out["verdict"] = ("malicious" if out["blocklist"] or score >= 75 else "suspicious" if score >= 25
                      else "private address" if a.is_private else "no known reports")
    return out
