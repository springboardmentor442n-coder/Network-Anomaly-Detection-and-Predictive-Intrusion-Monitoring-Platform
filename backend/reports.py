"""Escaped, printable analyst report generated from saved scan summaries."""

import html


def render_report(record, metadata):
    summary = record.get("summary") or {}
    esc = lambda x: html.escape(str(x))
    rows = "".join(
        f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>"
        for k, v in summary.items()
        if not isinstance(v, (dict, list))
    )
    models = "".join(
        f"<tr><td>{esc(name)}</td><td>{m['macro_f1']:.4f}</td><td>{m['weighted_f1']:.4f}</td><td>{m['attack_recall']:.4f}</td><td>{m['false_positive_rate']:.4f}</td><td>{m['batch_latency_p95_ms']:.2f}</td></tr>"
        for name, m in metadata.get("models", {}).items()
    )
    distributions = ""
    for title, key in [
        ("Risk distribution", "risk_distribution"),
        ("Predicted attack classes", "attack_types"),
        ("Protocol counts", "protocols"),
        ("Top predicted attack sources", "top_sources"),
        ("Attack capture time buckets", "attack_timeline"),
    ]:
        distributions += (
            f"<h2>{title}</h2><table><tbody>"
            + "".join(
                f"<tr><td>{esc(k)}</td><td>{esc(v)}</td></tr>"
                for k, v in summary.get(key, {}).items()
            )
            + "</tbody></table>"
        )
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><title>TraceVigil Scan Report</title><style>body{{font:14px/1.7 Arial,sans-serif;color:#1c3044;max-width:950px;margin:35px auto;padding:25px}}h1{{font-size:30px}}h2{{margin-top:30px;font-size:18px}}table{{border-collapse:collapse;width:100%;font-size:12px}}td,th{{padding:8px;border-bottom:1px solid #d5dde4;text-align:left}}th{{background:#edf3f5}}small{{color:#597080}}button{{padding:10px 18px}}@media print{{button{{display:none}}body{{margin:0;padding:0}}h2{{break-after:avoid}}tr{{break-inside:avoid}}}}</style></head><body><button onclick="window.print()">Print or Save as PDF</button><h1>TraceVigil AI Security Analysis Report</h1><p>Scan {esc(record['id'])}<br/>Analyst {esc(record['owner'])}<br/>Source {esc(record['source'])}<br/>Started {esc(record['created'])}<br/>Status {esc(record['status'])}</p><h2>Scope and interpretation</h2><p>{esc(metadata.get('scope',''))}</p><p>Risk is a human-defined priority out of 100. It is not a probability of compromise. Confidence is uncalibrated. CSV scanning is not live packet capture or future intrusion forecasting.</p><h2>Processing results</h2><table>{rows}</table><h2>Classifier holdout comparison</h2><table><thead><tr><th>Model</th><th>Macro F1</th><th>Weighted F1</th><th>Attack recall</th><th>False positive rate</th><th>P95 batch ms</th></tr></thead><tbody>{models}</tbody></table><p>Training rows: {esc(metadata.get('train_rows'))}; holdout rows: {esc(metadata.get('test_rows'))}. Per-class caps change sample prevalence. Rare class supports remain small. These are model holdout metrics, not accuracy computed from the scanned file.</p>{distributions}<h2>Scoring policy</h2><p>round(configured severity × classifier confidence). Low 0-25, Medium 26-50, High 51-75, Critical 76-100. Review flags include disagreement, low confidence and unusual behaviour. Grouped incidents retain occurrence counts and maximum observed priority.</p><small>Generated from persisted scan data. Successful saved rows are available as NDJSON. A stopped or failed scan is incomplete.</small></body></html>"""
