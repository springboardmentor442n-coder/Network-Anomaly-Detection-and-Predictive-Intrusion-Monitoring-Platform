"""Creates a synthetic CICIDS2017-style CSV so the platform runs out-of-the-box (no Kaggle download needed)."""
import numpy as np, pandas as pd, os
rng = np.random.default_rng(42)
# class: (share, {feature: (mean_log, sigma)})  -- syn/ack are 0..1 flag ratios
P = {
 "Normal Traffic": (0.70, dict(dur=(11,2), fwd=(1.5,.8), bwd=(1.5,.8), fl=(5,1), bl=(5.5,1), bps=(9,1.5), pps=(3,1), syn=(.1,.2), ack=(.6,.3), win=(9,1))),
 "DoS":            (0.08, dict(dur=(14,1), fwd=(3,.6), bwd=(1,.6), fl=(2,.8), bl=(1,.8), bps=(10,1), pps=(2,1), syn=(.2,.2), ack=(.5,.3), win=(8,1))),
 "DDoS":           (0.08, dict(dur=(9,1), fwd=(1.2,.4), bwd=(0.2,.3), fl=(3,.5), bl=(0.5,.5), bps=(12,1), pps=(7,1), syn=(.9,.1), ack=(.1,.1), win=(8,.5))),
 "Port Scanning":  (0.06, dict(dur=(3,1), fwd=(.7,.3), bwd=(.3,.3), fl=(.5,.4), bl=(.2,.3), bps=(6,1), pps=(8,1), syn=(1,.05), ack=(0,.05), win=(10,.5))),
 "Brute Force":    (0.04, dict(dur=(12,.8), fwd=(2.5,.4), bwd=(2.3,.4), fl=(3.5,.4), bl=(4,.4), bps=(7,.6), pps=(4,.5), syn=(.05,.1), ack=(.9,.1), win=(8.5,.4))),
 "Web Attacks":    (0.025, dict(dur=(13,.6), fwd=(3.5,.4), bwd=(3,.5), fl=(6,.5), bl=(6.8,.4), bps=(8,.6), pps=(3.5,.5), syn=(.1,.1), ack=(.95,.05), win=(9.5,.3))),
 "Bots":           (0.015, dict(dur=(15,.5), fwd=(1.8,.3), bwd=(1.6,.3), fl=(4,.3), bl=(4.2,.3), bps=(5,.5), pps=(1,.4), syn=(.05,.05), ack=(.8,.1), win=(8.8,.3))),
}
def make(n):
    names = list(P); w = np.array([P[k][0] for k in names]); labels = rng.choice(names, n, p=w/w.sum())
    rows = []
    for lab in labels:
        f = P[lab][1]
        g = lambda k: float(np.exp(rng.normal(*f[k]))) if k not in ("syn", "ack") else float(np.clip(rng.normal(*f[k]), 0, 1))
        rows.append({"Destination Port": int(rng.choice([80, 443, 22, 21, 8080, 53, 3389])),
            "Flow Duration": g("dur"), "Total Fwd Packets": g("fwd"), "Total Backward Packets": g("bwd"),
            "Fwd Packet Length Mean": g("fl"), "Bwd Packet Length Mean": g("bl"),
            "Flow Bytes/s": g("bps"), "Flow Packets/s": g("pps"), "SYN Flag Count": g("syn"),
            "ACK Flag Count": g("ack"), "Init_Win_bytes_forward": g("win"), "Attack Type": lab})
    return pd.DataFrame(rows)
if __name__ == "__main__":
    os.makedirs("data", exist_ok=True)
    df = make(30000); df.to_csv("data/sample_traffic.csv", index=False)
    print("Wrote data/sample_traffic.csv", df.shape); print(df["Attack Type"].value_counts())
