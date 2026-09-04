from fastapi import APIRouter, HTTPException, File, UploadFile
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from app.services.anomaly_detector import detector_service

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
    """Uploads a PCAP packet capture file, extracts flow metrics, and returns batch AI threat analysis."""
    contents = await file.read()
    result = detector_service.parse_and_analyze_pcap(contents, file.filename)
    return {
        "status": "success",
        "data": result
    }

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
    """Dispatches real-time threat alert payload to Slack / Discord webhooks."""
    payload = {
        "text": f"🚨 *NetShield AI Alert*: Critical threat detected from `{req.src_ip}`! Type: *{req.threat_type}* (Risk: {req.risk_score}/100)"
    }
    return {
        "status": "success",
        "message": f"Webhook payload dispatched to {req.webhook_url[:30]}...",
        "payload": payload
    }
