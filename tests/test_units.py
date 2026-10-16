"""Unit tests that need no database or model files.  Run:  python tests/test_units.py   (or: pytest tests)"""
import os, socket, sys, tempfile, types
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.modules.setdefault("db", types.SimpleNamespace(sql=lambda *a, **k: []))   # notifier imports db

import forecast, perf, timeutil, risk_engine, siem, threatintel, zeek_ingest
from packet_capture import Capturer, Flow, add_packet

def test_risk_score_levels():
    assert risk_engine.compute_risk_score("DoS", 0.9) == {"risk_score": 72, "risk_label": "High"}
    assert risk_engine.compute_risk_score("Worms", 1.0)["risk_label"] == "Critical"
    assert risk_engine.compute_risk_score("Normal", 0.99)["risk_score"] == 0
    assert risk_engine.compute_risk_score("Normal", 0.9, 100) == {"risk_score": 30, "risk_label": "Medium"}   # anomaly term
    assert risk_engine.compute_risk_score("Unknown thing", 1.0)["risk_score"] == 50                            # default severity
    assert risk_engine.compute_risk_score("Heartbleed", 1.0, 100)["risk_score"] == 100                          # capped at 100

def test_forecast_follows_trend():
    fc, band = forecast.forecast([10] * 24, 6)
    assert all(abs(x - 10) < 1 for x in fc) and band < 1
    rising = list(range(0, 48, 2))
    fc, _ = forecast.forecast(rising, 6)
    assert fc[-1] > rising[-1] and forecast.outlook(rising, fc) == "rising"
    assert forecast.outlook([20] * 12, [2] * 6) == "falling"

def test_forecast_short_history():
    assert forecast.forecast([4, 6], 3)[0] == [5.0, 5.0, 5.0]
    assert forecast.forecast([], 2)[0] == [0.0, 0.0]

def test_perf_snapshot():
    for v in (10, 20, 30, 40):
        perf.record("batch_ms", v, 100)
    s = perf.snapshot()
    assert s["batch_ms"]["count"] >= 4 and s["batch_ms"]["avg"] is not None
    assert s["flows_per_sec"] > 0

def test_cef_format_and_escaping():
    a = {"ts": "2026-10-06 09:00:00", "prediction": "DoS|x", "risk_score": 91, "risk_label": "Critical", "source": "live", "src_ip": "10.0.0.5"}
    c = siem.to_cef(a)
    assert c.startswith("CEF:0|NetShieldAI|IDS|1.0|DoS\\|x|") and "|10|" in c and "src=10.0.0.5" in c and "cn1=91" in c
    out = siem.export([dict(a, ts="2026-10-06 09:00:00")], "json")
    assert '"risk_label": "Critical"' in out

def test_syslog_is_sent():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM); sock.bind(("127.0.0.1", 0)); sock.settimeout(3)
    os.environ["NETSHIELD_SYSLOG_HOST"], os.environ["NETSHIELD_SYSLOG_PORT"] = "127.0.0.1", str(sock.getsockname()[1])
    n = siem.send_syslog([{"ts": "2026-10-06 09:00:00", "prediction": "Exploits", "risk_score": 80, "risk_label": "Critical", "source": "live"}])
    data = sock.recv(2048).decode()
    del os.environ["NETSHIELD_SYSLOG_HOST"]; sock.close()
    assert n == 1 and "<130>" in data and "CEF:0|NetShieldAI" in data

def test_blocklist_and_lookup():
    with tempfile.NamedTemporaryFile("w", suffix=".txt", delete=False) as f:
        f.write("# comment\n203.0.113.0/24  # test range\n198.51.100.7\n")
    threatintel.BLOCKLIST = f.name; threatintel._bl.update(mtime=None, nets=[])
    assert threatintel.in_blocklist("203.0.113.66") and threatintel.in_blocklist("198.51.100.7")
    assert not threatintel.in_blocklist("8.8.8.8") and not threatintel.in_blocklist("not an ip")
    assert threatintel.lookup("203.0.113.66")["verdict"] == "malicious"
    assert threatintel.lookup("192.168.1.10")["verdict"] == "private address"
    try:
        threatintel.lookup("999.1.1.1"); assert False
    except ValueError:
        pass

TSV = ["#separator \\x09", "#fields\tts\tuid\tid.orig_h\tid.orig_p\tid.resp_h\tid.resp_p\tproto\tservice\tduration\torig_bytes\tresp_bytes\tconn_state\torig_pkts\torig_ip_bytes\tresp_pkts\tresp_ip_bytes",
       "#types\ttime\tstring\taddr\tport\taddr\tport\tenum\tstring\tinterval\tcount\tcount\tstring\tcount\tcount\tcount\tcount",
       "1.0\tCabc\t10.0.0.5\t51000\t93.184.216.34\t80\ttcp\thttp\t2.0\t300\t900\tSF\t5\t500\t6\t1100",
       "2.0\tCdef\t10.0.0.6\t51001\t10.0.0.1\t22\ttcp\t-\t-\t-\t-\tS0\t1\t60\t0\t0"]

def test_zeek_tsv_and_json():
    recs = zeek_ingest.parse(TSV)
    assert len(recs) == 2
    a, b = recs
    assert (a["srcip"], a["dstip"], a["proto"], a["service"], a["state"]) == ("10.0.0.5", "93.184.216.34", "tcp", "http", "FIN")
    assert a["dur"] == 2.0 and a["sbytes"] == 500 and a["dbytes"] == 1100 and a["spkts"] == 5 and a["dpkts"] == 6
    assert b["state"] == "INT" and b["service"] == "-" and b["dur"] > 0 and b["dbytes"] == 0
    j = zeek_ingest.parse(['{"id.orig_h":"1.2.3.4","id.resp_h":"5.6.7.8","proto":"udp","service":"dns","duration":0.5,"orig_pkts":1,"resp_pkts":1,"orig_ip_bytes":70,"resp_ip_bytes":120,"conn_state":"SF"}'])
    assert j[0]["service"] == "dns" and j[0]["state"] == "FIN"

def test_packet_flow_record():
    src, dst = ("10.0.0.5", 51000), ("93.184.216.34", 80)
    f = Flow(100.0, src, dst, "tcp", 64, 8192, 60, "S")
    f.add(100.1, False, 55, 4096, 60, "SA"); f.add(100.2, True, 64, 8192, 400, "PA"); f.add(100.9, False, 55, 4096, 1400, "FA")
    r = f.record(80)
    assert r["srcip"] == "10.0.0.5" and r["dstip"] == "93.184.216.34" and r["service"] == "http" and r["state"] == "FIN"
    assert (r["spkts"], r["dpkts"], r["sbytes"], r["dbytes"]) == (2, 2, 460, 1460) and abs(r["dur"] - 0.9) < 1e-6
    assert r["sttl"] == 64 and r["dttl"] == 55 and r["rate"] > 0

def test_time_conversion():
    os.environ["NETSHIELD_TZ"] = "Asia/Kolkata"
    assert timeutil.to_local("2026-10-06 09:00:00") == "2026-10-06 14:30:00 UTC+05:30"
    assert timeutil.to_local("2026-10-06T22:00:00") == "2026-10-07 03:30:00 UTC+05:30"
    assert timeutil.shift("2026-10-06 22:00:00", 330) == "2026-10-07 03:30:00"
    assert timeutil.offset_label(-300) == "UTC-05:00" and timeutil.offset_label(330) == "UTC+05:30"
    assert timeutil.to_local("not a time") == "not a time"
    del os.environ["NETSHIELD_TZ"]

def test_capturer_handshake_and_counters():
    cap = Capturer(idle=3.0, max_age=30.0)
    A, B, C = ("10.0.0.5", 51000), ("93.184.216.34", 443), ("93.184.216.99", 443)
    add_packet(cap.flows, cap.lock, 100.0, "tcp", A, B, 64, 8192, 60, "S", 1000)
    add_packet(cap.flows, cap.lock, 100.05, "tcp", B, A, 55, 4096, 60, "SA", 5000)
    add_packet(cap.flows, cap.lock, 100.07, "tcp", A, B, 64, 8192, 52, "A", 1001)
    add_packet(cap.flows, cap.lock, 100.5, "tcp", A, B, 64, 8192, 400, "PA", 1001)
    assert cap.pop_ready(now=101.0) == []                       # still active
    out = cap.pop_ready(now=110.0)                              # quiet for more than 3 s
    assert len(out) == 1
    r = out[0]
    assert abs(r["synack"] - 0.05) < 1e-6 and abs(r["ackdat"] - 0.02) < 1e-6 and abs(r["tcprtt"] - 0.07) < 1e-6
    assert r["stcpb"] == 1000 and r["dtcpb"] == 5000 and r["service"] == "ssl" and r["ct_srv_src"] == 1
    add_packet(cap.flows, cap.lock, 120.0, "tcp", A, C, 64, 8192, 60, "S", 7)
    r2 = cap.pop_ready(now=130.0)[0]
    assert r2["ct_srv_src"] == 2 and r2["ct_src_ltm"] == 2 and r2["ct_dst_ltm"] == 1

def test_capturer_flushes_long_connections():
    cap = Capturer(idle=3.0, max_age=30.0)
    A, B = ("10.0.0.5", 51000), ("1.1.1.1", 53)
    add_packet(cap.flows, cap.lock, 0.0, "udp", A, B, 64, 0, 80, "")
    add_packet(cap.flows, cap.lock, 40.0, "udp", B, A, 60, 0, 120, "")
    assert len(cap.pop_ready(now=41.0)) == 1 and cap.flows == {}      # older than max_age even though it is still active

if __name__ == "__main__":
    tests = [(k, v) for k, v in sorted(globals().items()) if k.startswith("test_")]
    for name, fn in tests:
        fn(); print("ok  ", name)
    print(f"{len(tests)} tests passed")
