"""Generate SMALL, clearly-labelled synthetic traffic files.

These files exist so the application and its automated tests can be exercised
end-to-end without shipping the official UNSW-NB15 dataset (which is large and
is not redistributed with this repository).

!!! The generated data is NOT UNSW-NB15. It follows the same column schema so
!!! the pipeline can be validated, but any accuracy/recall numbers produced from
!!! it are meaningless as research results. Never present them as UNSW-NB15
!!! performance.

Usage (from the ``backend/`` directory, with the virtualenv active):

    python scripts/make_sample_data.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pandas as pd

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent
SAMPLE_DIR = PROJECT_ROOT / "data" / "sample"

# UNSW-NB15 column order (49 columns including the two targets).
NUMERIC_COLUMNS = [
    "id",
    "dur",
    "spkts",
    "dpkts",
    "sbytes",
    "dbytes",
    "rate",
    "sttl",
    "dttl",
    "sload",
    "dload",
    "sloss",
    "dloss",
    "sinpkt",
    "dinpkt",
    "sjit",
    "djit",
    "swin",
    "stcpb",
    "dtcpb",
    "dwin",
    "tcprtt",
    "synack",
    "ackdat",
    "smean",
    "dmean",
    "trans_depth",
    "response_body_len",
    "ct_srv_src",
    "ct_state_ttl",
    "ct_dst_ltm",
    "ct_src_dport_ltm",
    "ct_dst_sport_ltm",
    "ct_dst_src_ltm",
    "is_ftp_login",
    "ct_ftp_cmd",
    "ct_flw_http_mthd",
    "ct_src_ltm",
    "ct_srv_dst",
    "is_sm_ips_ports",
]
CATEGORICAL_COLUMNS = ["proto", "service", "state"]

ATTACK_CATEGORIES = [
    "Normal",
    "Generic",
    "Exploits",
    "Fuzzers",
    "DoS",
    "Reconnaissance",
    "Analysis",
    "Backdoor",
    "Shellcode",
    "Worms",
]
CATEGORY_WEIGHTS = [0.36, 0.20, 0.14, 0.09, 0.07, 0.06, 0.03, 0.02, 0.02, 0.01]

PROTOCOLS = ["tcp", "udp", "arp", "ospf", "icmp", "ipv6", "sctp", "udp"]
SERVICES = ["-", "http", "dns", "ftp", "smtp", "ssh", "ssl", "ftp-data", "pop3", "snmp", "irc"]
STATES = ["FIN", "CON", "INT", "REQ", "RST", "ECO", "no", "urn", "ACC", "CLO"]


def _column_names() -> list[str]:
    return NUMERIC_COLUMNS + CATEGORICAL_COLUMNS + ["attack_cat", "label"]


def generate(rows: int, seed: int, with_labels: bool = True) -> pd.DataFrame:
    rng = np.random.default_rng(seed)

    if with_labels:
        categories = rng.choice(
            ATTACK_CATEGORIES, size=rows, p=np.array(CATEGORY_WEIGHTS) / sum(CATEGORY_WEIGHTS)
        )
    else:
        categories = np.where(rng.random(rows) < 0.4, "Attack", "Normal")
    is_attack = np.array([c != "Normal" for c in categories])
    attack_strength = rng.uniform(0.6, 2.4, size=rows)

    frame = pd.DataFrame(index=np.arange(rows))
    frame["id"] = np.arange(1, rows + 1)

    frame["dur"] = np.where(
        is_attack,
        rng.lognormal(mean=0.6, sigma=0.9, size=rows),
        rng.lognormal(mean=-0.5, sigma=0.7, size=rows),
    ).round(6)

    frame["spkts"] = np.where(
        is_attack,
        rng.integers(4, 180, size=rows) * attack_strength,
        rng.integers(1, 18, size=rows),
    ).astype(int)
    frame["dpkts"] = np.where(
        is_attack,
        rng.integers(2, 150, size=rows) * attack_strength,
        rng.integers(1, 15, size=rows),
    ).astype(int)
    frame["sbytes"] = (frame["spkts"] * rng.integers(40, 900, size=rows)).astype(int)
    frame["dbytes"] = (frame["dpkts"] * rng.integers(40, 900, size=rows)).astype(int)
    frame["rate"] = ((frame["spkts"] + frame["dpkts"]) / frame["dur"].clip(lower=1e-6)).round(4)

    frame["sttl"] = rng.choice([31, 62, 254, 0], size=rows, p=[0.45, 0.35, 0.15, 0.05])
    frame["dttl"] = rng.choice([29, 62, 252, 0], size=rows, p=[0.4, 0.4, 0.15, 0.05])
    frame["sload"] = (frame["sbytes"] / frame["dur"].clip(lower=1e-6)).round(2)
    frame["dload"] = (frame["dbytes"] / frame["dur"].clip(lower=1e-6)).round(2)
    frame["sloss"] = np.where(is_attack, rng.integers(0, 12, size=rows), rng.integers(0, 3, size=rows))
    frame["dloss"] = np.where(is_attack, rng.integers(0, 10, size=rows), rng.integers(0, 3, size=rows))
    frame["sinpkt"] = (frame["dur"] / frame["spkts"].clip(lower=1) * 1000).round(3)
    frame["dinpkt"] = (frame["dur"] / frame["dpkts"].clip(lower=1) * 1000).round(3)
    frame["sjit"] = rng.lognormal(0.0, 0.6, size=rows).round(4)
    frame["djit"] = rng.lognormal(0.0, 0.6, size=rows).round(4)
    frame["swin"] = rng.choice([255, 0, 8192, 65535], size=rows)
    frame["stcpb"] = rng.integers(0, 4_000_000_000, size=rows)
    frame["dtcpb"] = rng.integers(0, 4_000_000_000, size=rows)
    frame["dwin"] = rng.choice([255, 0, 8192, 65535], size=rows)
    frame["tcprtt"] = rng.lognormal(0.0, 0.8, size=rows).round(5)
    frame["synack"] = rng.lognormal(0.0, 0.8, size=rows).round(5)
    frame["ackdat"] = rng.lognormal(0.0, 0.8, size=rows).round(5)
    frame["smean"] = rng.integers(30, 1500, size=rows)
    frame["dmean"] = rng.integers(30, 1500, size=rows)
    frame["trans_depth"] = rng.integers(0, 4, size=rows)
    frame["response_body_len"] = rng.integers(0, 5000, size=rows)

    # "ct_*" counters: the key separators for attack traffic.
    frame["ct_srv_src"] = np.where(is_attack, rng.integers(2, 30, size=rows), rng.integers(1, 6, size=rows))
    frame["ct_state_ttl"] = np.where(is_attack, rng.integers(1, 8, size=rows), rng.integers(0, 3, size=rows))
    frame["ct_dst_ltm"] = np.where(is_attack, rng.integers(1, 25, size=rows), rng.integers(1, 4, size=rows))
    frame["ct_src_dport_ltm"] = np.where(is_attack, rng.integers(1, 15, size=rows), rng.integers(1, 3, size=rows))
    frame["ct_dst_sport_ltm"] = np.where(is_attack, rng.integers(1, 15, size=rows), rng.integers(1, 3, size=rows))
    frame["ct_dst_src_ltm"] = np.where(is_attack, rng.integers(1, 40, size=rows), rng.integers(1, 5, size=rows))
    frame["is_ftp_login"] = rng.choice([0, 1], size=rows, p=[0.95, 0.05])
    frame["ct_ftp_cmd"] = rng.choice([0, 1, 2], size=rows, p=[0.85, 0.1, 0.05])
    frame["ct_flw_http_mthd"] = np.where(is_attack, rng.integers(0, 6, size=rows), rng.integers(0, 3, size=rows))
    frame["ct_src_ltm"] = np.where(is_attack, rng.integers(1, 20, size=rows), rng.integers(1, 4, size=rows))
    frame["ct_srv_dst"] = np.where(is_attack, rng.integers(2, 35, size=rows), rng.integers(1, 5, size=rows))
    frame["is_sm_ips_ports"] = rng.choice([0, 1], size=rows, p=[0.97, 0.03])

    frame["proto"] = np.where(
        is_attack,
        rng.choice(PROTOCOLS, size=rows, p=[0.72, 0.18, 0.03, 0.02, 0.02, 0.01, 0.01, 0.01]),
        rng.choice(PROTOCOLS, size=rows, p=[0.5, 0.42, 0.03, 0.01, 0.02, 0.01, 0.005, 0.005]),
    )
    frame["service"] = rng.choice(SERVICES, size=rows, p=[0.22, 0.2, 0.14, 0.08, 0.08, 0.07, 0.08, 0.05, 0.03, 0.03, 0.02])
    frame["state"] = np.where(
        is_attack,
        rng.choice(STATES, size=rows, p=[0.3, 0.2, 0.15, 0.1, 0.1, 0.05, 0.04, 0.03, 0.02, 0.01]),
        rng.choice(STATES, size=rows, p=[0.25, 0.4, 0.1, 0.08, 0.05, 0.04, 0.03, 0.03, 0.01, 0.01]),
    )

    # Inject a small amount of missing data so the missing-value analysis is exercised.
    for column, fraction in (("ct_flw_http_mthd", 0.03), ("ct_ftp_cmd", 0.02), ("smean", 0.01)):
        mask = rng.random(rows) < fraction
        frame.loc[mask, column] = np.nan

    if with_labels:
        frame["attack_cat"] = categories
        frame["label"] = is_attack.astype(int)

    # Duplicate ~1% of rows to exercise the duplicate-row analysis.
    duplicate_count = max(1, int(rows * 0.01))
    duplicates = frame.sample(n=duplicate_count, random_state=seed)
    frame = pd.concat([frame, duplicates], ignore_index=True)

    return frame[_column_names() if with_labels else [c for c in frame.columns]]


def main() -> int:
    SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

    outputs = [
        ("SAMPLE_synthetic_training-set.csv", 900, 20261015, True),
        ("SAMPLE_synthetic_testing-set.csv", 380, 777001, True),
        ("SAMPLE_synthetic_traffic.csv", 150, 424242, False),
    ]

    for filename, rows, seed, with_labels in outputs:
        frame = generate(rows, seed, with_labels=with_labels)
        path = SAMPLE_DIR / filename
        frame.to_csv(path, index=False)
        print(f"wrote {path.relative_to(PROJECT_ROOT)}  ({frame.shape[0]} rows x {frame.shape[1]} cols)")

    print("\nREMINDER: this is synthetic data, not UNSW-NB15. See data/README.md")
    return 0


if __name__ == "__main__":
    sys.exit(main())
