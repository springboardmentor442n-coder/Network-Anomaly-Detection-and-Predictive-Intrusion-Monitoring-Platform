import urllib.request
import json
from datetime import datetime
from fastapi import APIRouter, HTTPException, File, UploadFile, Query
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from app.services.anomaly_detector import detector_service
from app.db import (
    record_attacks_batch,
    get_attack_history,
    mark_attack_actioned,
    clear_attack_history
)

router = APIRouter(prefix="/api/v1/detect", tags=["Anomaly Detection & XAI Features"])

class NetworkFlowInput(BaseModel):
    flow_duration: float = Field(default=120.0, description="Flow duration in microseconds")
    total_fwd_packets: float = Field(default=5.0)
    total_backward_packets: float = Field(default=4.0)
    total_length_of_fwd_packets: float = Field(default=350.0)
    total_length_of_bwd_packets: float = Field(default=800.0)
    flow_bytes_s: float = Field(default=9583.33)
    flow_packets_s: float = Field(default=75.0)
    proto: Optional[str] = Field(default="tcp")
    service: Optional[str] = Field(default="http")
    state: Optional[str] = Field(default="FIN")
    custom_features: Optional[Dict[str, Any]] = None

class FirewallRequest(BaseModel):
    ip_address: str

class WebhookRequest(BaseModel):
    webhook_url: str
    alert_id: str
    src_ip: str
    threat_type: str
    risk_score: float

@router.post("/predict")
def predict_anomaly(payload: NetworkFlowInput):
    """Submits payload for live prediction, risk score, and XAI feature drivers."""
    input_data = payload.dict()
    if payload.custom_features:
        input_data.update(payload.custom_features)
        
    result = detector_service.predict_unified(input_data)
    return {
        "status": "success",
        "data": result
    }

@router.post("/upload-pcap")
async def upload_pcap_file(file: UploadFile = File(...)):
    """Uploads a PCAP packet capture file, extracts flow metrics, records detected attacks to history, and returns analysis."""
    contents = await file.read()
    result = detector_service.parse_and_analyze_pcap(contents, file.filename)
    
    # Store detected malicious flows into persistent attack history
    attacks = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    analyzed_flows = result.get("analyzed_flows", [])
    
    for idx, flow in enumerate(analyzed_flows):
        if flow.get("prediction") == "ATTACK":
            driver_txt = "Velocity surge / heuristic anomaly"
            if flow.get("xai_drivers") and len(flow["xai_drivers"]) > 0:
                d = flow["xai_drivers"][0]
                driver_txt = f"{d.get('feature', '')}: {d.get('reason', '')}"
                
            attacks.append({
                "id": f"PCAP-{int(datetime.utcnow().timestamp())}-{idx+1}",
                "timestamp": now_str,
                "source_type": "PCAP",
                "filename": file.filename,
                "uploaded_by": "SOC Analyst",
                "src_ip": flow.get("src_ip", "0.0.0.0"),
                "dst_ip": flow.get("dst_ip", "0.0.0.0"),
                "protocol": flow.get("protocol", "TCP"),
                "threat_type": f"PCAP Forensic Anomaly ({flow.get('threat_level', 'CRITICAL')})",
                "risk_score": flow.get("risk_score", 90.0),
                "threat_level": flow.get("threat_level", "CRITICAL"),
                "driver_summary": driver_txt,
                "actioned": 0
            })
            
    if attacks:
        record_attacks_batch(attacks)

    return {
        "status": "success",
        "saved_to_history": len(attacks),
        "data": result
    }

@router.post("/upload-csv")
async def upload_csv_file(file: UploadFile = File(...)):
    """Uploads a CSV dataset file, runs batch AI inference, stores detected threats to persistent history, and returns analytics."""
    if not (file.filename.lower().endswith('.csv')):
        raise HTTPException(status_code=400, detail="Only CSV (.csv) files are supported.")
    contents = await file.read()
    result = detector_service.parse_and_predict_csv(contents, file.filename)
    
    # Store detected malicious rows into persistent attack history
    attacks = []
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    rows = result.get("rows", [])
    
    for idx, row in enumerate(rows):
        if row.get("prediction") == "ATTACK":
            driver_txt = f"{row.get('primary_driver', 'Feature Surge')}: {row.get('driver_reason', 'Surge above baseline')}"
            attacks.append({
                "id": f"CSV-{int(datetime.utcnow().timestamp())}-{idx+1}",
                "timestamp": now_str,
                "source_type": "CSV",
                "filename": file.filename,
                "uploaded_by": "SOC Analyst",
                "src_ip": row.get("src_ip", "0.0.0.0"),
                "dst_ip": row.get("dst_ip", "0.0.0.0"),
                "protocol": row.get("proto", "TCP"),
                "threat_type": f"Dual-Engine Anomaly ({row.get('threat_level', 'CRITICAL')})",
                "risk_score": row.get("risk_score", 90.0),
                "threat_level": row.get("threat_level", "CRITICAL"),
                "driver_summary": driver_txt,
                "actioned": 0
            })
            
    if attacks:
        record_attacks_batch(attacks)

    return {
        "status": "success",
        "saved_to_history": len(attacks),
        "data": result
    }

@router.get("/attack-history")
def get_attack_history_records(
    source_type: Optional[str] = Query(None, description="Filter by PCAP or CSV"),
    search: Optional[str] = Query(None, description="Search by IP, threat name, or filename"),
    limit: int = Query(500, ge=1, le=2000)
):
    """Fetches persistent history of attacks detected from uploaded PCAP and CSV files."""
    records = get_attack_history(source_type=source_type, limit=limit, search=search)
    all_records = get_attack_history(limit=5000)
    
    total_count = len(all_records)
    pcap_count = sum(1 for r in all_records if r.get("source_type") == "PCAP")
    csv_count = sum(1 for r in all_records if r.get("source_type") == "CSV")
    actioned_count = sum(1 for r in all_records if r.get("actioned") == 1)

    return {
        "status": "success",
        "counts": {
            "total": total_count,
            "pcap": pcap_count,
            "csv": csv_count,
            "actioned": actioned_count,
            "active": total_count - actioned_count
        },
        "records": records
    }

@router.post("/attack-history/{attack_id}/action")
def update_attack_action_status(attack_id: str, actioned: bool = True):
    """Marks an attack history record as actioned/mitigated (e.g. after firewall block)."""
    success = mark_attack_actioned(attack_id, actioned=actioned)
    if not success:
        raise HTTPException(status_code=404, detail="Attack record not found")
    return {"status": "success", "attack_id": attack_id, "actioned": actioned}

@router.delete("/attack-history")
def clear_all_attack_history(source_type: Optional[str] = Query(None)):
    """Clears persistent attack history (optionally filtered by PCAP or CSV)."""
    deleted_count = clear_attack_history(source_type=source_type)
    return {"status": "success", "deleted_count": deleted_count}

@router.get("/sample-csv")
def get_sample_csv():
    """Generates a downloadable sample CSV containing benign and simulated malicious flows for testing."""
    csv_header = "Source IP,Destination IP,Protocol,Flow Duration,Total Fwd Packets,Flow Bytes/s,Flow Packets/s\n"
    sample_rows = [
        "192.168.1.105,10.0.0.15,TCP,120.5,6,9820.0,72.0",
        "192.168.1.189,10.0.0.8,TCP,8.2,140,5820400.0,3890.0",
        "192.168.1.44,10.0.0.2,UDP,45.0,2,820.0,25.0",
        "192.168.1.202,10.0.0.15,TCP,15.0,95,3400000.0,2400.0",
        "192.168.1.12,10.0.0.22,TCP,350.0,8,12400.0,40.0",
        "192.168.1.250,10.0.0.1,ICMP,2.0,1,64.0,10.0",
        "192.168.1.99,10.0.0.15,TCP,4.5,210,8900000.0,5200.0"
    ]
    csv_content = csv_header + "\n".join(sample_rows)
    from fastapi.responses import Response
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=netshield_sample_flows.csv"}
    )

@router.post("/firewall-rules")
def generate_firewall_rules(req: FirewallRequest):
    """Generates automated firewall scripts (iptables, ufw, pfSense, PowerShell) for a blocked IP."""
    rules = detector_service.generate_firewall_rules(req.ip_address)
    return {
        "status": "success",
        "ip_address": req.ip_address,
        "rules": rules
    }

@router.post("/trigger-webhook")
def trigger_webhook(req: WebhookRequest):
    """Dispatches real-time threat alert payload to Slack / Discord / Webhook.site webhooks."""
    payload = {
        "text": f"🚨 *NetShield AI Alert*: Critical threat detected from `{req.src_ip}`! Type: *{req.threat_type}* (Risk: {req.risk_score}/100)",
        "content": f"🚨 **NetShield AI Alert**: Critical threat detected from `{req.src_ip}`! Type: **{req.threat_type}** (Risk: {req.risk_score}/100)",
        "alert_id": req.alert_id,
        "src_ip": req.src_ip,
        "threat_type": req.threat_type,
        "risk_score": req.risk_score,
        "timestamp": datetime.utcnow().isoformat()
    }
    dispatch_status = "delivered"
    dispatch_error = None

    try:
        req_data = json.dumps(payload).encode("utf-8")
        http_req = urllib.request.Request(
            req.webhook_url,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "NetShield-AI-Sentinel/1.0"
            }
        )
        with urllib.request.urlopen(http_req, timeout=6) as resp:
            status_code = resp.getcode()
    except Exception as exc:
        dispatch_status = "simulated_dispatch_note"
        dispatch_error = str(exc)

    return {
        "status": "success",
        "dispatch_status": dispatch_status,
        "dispatch_error": dispatch_error,
        "message": f"Webhook alert payload dispatched to {req.webhook_url[:35]}...",
        "payload": payload
    }
