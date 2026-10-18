"""Intrusion forecasting: damped Holt (double exponential smoothing) on hourly attack counts."""
import math

def forecast(series, steps=12, alpha=0.5, beta=0.2, phi=0.9):
    """series: counts per hour, oldest first. Returns (forecast list, 95% band half-width)."""
    s = [float(x) for x in series]
    if len(s) < 6:                                    # too little history: flat forecast from the mean
        m = sum(s) / len(s) if s else 0.0
        sd = math.sqrt(sum((x - m) ** 2 for x in s) / len(s)) if s else 0.0
        return [round(m, 2)] * steps, round(1.96 * sd, 2)
    level, trend, errs = s[0], s[1] - s[0], []
    for x in s[1:]:
        pred = level + phi * trend
        errs.append(x - pred)
        new = alpha * x + (1 - alpha) * pred
        trend = beta * (new - level) + (1 - beta) * phi * trend
        level = new
    sd = math.sqrt(sum(e * e for e in errs) / len(errs))
    out, damp = [], 0.0
    for h in range(1, steps + 1):
        damp += phi ** h
        out.append(round(max(0.0, level + damp * trend), 2))
    return out, round(1.96 * sd, 2)

def outlook(series, fc):
    """rising, stable or falling: the forecast average compared with the last 6 hours."""
    recent = [float(x) for x in series[-6:]] or [0.0]
    a, b = sum(recent) / len(recent), sum(fc) / len(fc)
    if b > a * 1.1 + 1: return "rising"
    if b < a * 0.9 - 1: return "falling"
    return "stable"
