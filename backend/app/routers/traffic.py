import random
import time
from datetime import datetime
from fastapi import APIRouter
from app.services.anomaly_detector import detector_service

router = APIRouter(prefix="/api/v1/traffic", tags=["Network Traffic & Security Metrics"])

@router.get("/live-metrics")
def get_live_metrics():
    """Generates real-time traffic statistics and system throughput for SOC dashboard."""
    now = datetime.now()
    throughput_mbps = round(random.uniform(45.0, 120.0), 2)
    packets_per_sec = random.randint(1200, 3500)
    active_connections = random.randint(140, 480)
    
    # Generate 5 sample live packets with predictions
    sample_packets = []
    protocols = ["TCP", "UDP", "ICMP"]
    services = ["HTTP", "HTTPS", "DNS", "SSH", "FTP"]
    attack_types = ["DoS Hulk", "DDoS Flood", "Port Scan", "Brute Force SSH", "SQL Injection", "Normal"]
    
    for i in range(5):
        is_sim_attack = random.random() < 0.25
        att_label = random.choice(attack_types[:-1]) if is_sim_attack else "Normal Traffic"
        
        sample_packets.append({
            "id": f"pkt-{random.randint(10000, 99999)}",
            "timestamp": now.strftime("%H:%M:%S"),
            "src_ip": f"192.168.1.{random.randint(10, 250)}",
            "dst_ip": f"10.0.0.{random.randint(1, 50)}",
            "protocol": random.choice(protocols),
            "service": random.choice(services),
            "bytes": random.randint(64, 4096),
            "is_anomaly": is_sim_attack,
            "threat_label": att_label,
            "risk_score": round(random.uniform(75.0, 99.0), 1) if is_sim_attack else round(random.uniform(1.0, 15.0), 1)
        })
        
    return {
        "timestamp": now.isoformat(),
        "metrics": {
            "throughput_mbps": throughput_mbps,
            "packets_per_sec": packets_per_sec,
            "active_connections": active_connections,
            "total_inspected_today": 1428500,
            "blocked_threats_today": 34120
        },
        "live_packets": sample_packets
    }

@router.get("/threat-stats")
def get_threat_stats():
    """Returns threat distribution and attack classification metrics."""
    return {
        "attack_distribution": [
            {"category": "DoS / DDoS", "count": 193745 + 128014, "percentage": 75.6},
            {"category": "Port Scanning", "count": 90694, "percentage": 21.3},
            {"category": "Brute Force (SSH/FTP)", "count": 9150, "percentage": 2.15},
            {"category": "Web Attacks (SQLi/XSS)", "count": 2143, "percentage": 0.5},
            {"category": "Botnet (ARES)", "count": 1948, "percentage": 0.45}
        ],
        "top_targets": [
            {"ip": "10.0.0.15 (Database Server)", "attacks": 4210},
            {"ip": "10.0.0.22 (Web Gateway)", "attacks": 3150},
            {"ip": "10.0.0.8 (Domain Controller)", "attacks": 1890}
        ]
    }
