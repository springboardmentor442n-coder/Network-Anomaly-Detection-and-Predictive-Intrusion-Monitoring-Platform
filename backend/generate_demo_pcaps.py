import os
import time
from scapy.all import wrpcap, Ether, IP, TCP, UDP, DNS, DNSQR, Raw

def create_demo_pcaps(output_dir: str):
    os.makedirs(output_dir, exist_ok=True)
    base_time = time.time() - 600

    # =========================================================================
    # 1. Normal Web & DNS Browsing PCAP (BENIGN Traffic)
    # =========================================================================
    normal_pkts = []
    
    # Flow 1: Client 192.168.1.100 -> DNS Server 8.8.8.8
    p1 = Ether()/IP(src="192.168.1.100", dst="8.8.8.8")/UDP(sport=54321, dport=53)/DNS(rd=1, qd=DNSQR(qname="portal.company.internal"))
    p1.time = base_time + 0.05
    normal_pkts.append(p1)
    
    p2 = Ether()/IP(src="8.8.8.8", dst="192.168.1.100")/UDP(sport=53, dport=54321)/DNS(qr=1, qd=DNSQR(qname="portal.company.internal"))
    p2.time = base_time + 0.12
    normal_pkts.append(p2)

    # Flow 2: Client 192.168.1.100 -> Web Server 10.0.0.80 (Standard HTTP Session)
    # SYN
    p3 = Ether()/IP(src="192.168.1.100", dst="10.0.0.80")/TCP(sport=49152, dport=80, flags="S", seq=1000)
    p3.time = base_time + 0.20
    normal_pkts.append(p3)
    # SYN-ACK
    p4 = Ether()/IP(src="10.0.0.80", dst="192.168.1.100")/TCP(sport=80, dport=49152, flags="SA", seq=2000, ack=1001)
    p4.time = base_time + 0.24
    normal_pkts.append(p4)
    # ACK
    p5 = Ether()/IP(src="192.168.1.100", dst="10.0.0.80")/TCP(sport=49152, dport=80, flags="A", seq=1001, ack=2001)
    p5.time = base_time + 0.26
    normal_pkts.append(p5)
    # HTTP GET
    http_payload = b"GET /dashboard HTTP/1.1\r\nHost: portal.company.internal\r\nUser-Agent: EnterpriseBrowser/1.0\r\n\r\n"
    p6 = Ether()/IP(src="192.168.1.100", dst="10.0.0.80")/TCP(sport=49152, dport=80, flags="PA", seq=1001, ack=2001)/Raw(load=http_payload)
    p6.time = base_time + 0.35
    normal_pkts.append(p6)
    # HTTP 200 Response
    http_resp = b"HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<h1>Welcome SOC Analyst</h1>"
    p7 = Ether()/IP(src="10.0.0.80", dst="192.168.1.100")/TCP(sport=80, dport=49152, flags="PA", seq=2001, ack=1001 + len(http_payload))/Raw(load=http_resp)
    p7.time = base_time + 0.45
    normal_pkts.append(p7)
    # FIN-ACK closure
    p8 = Ether()/IP(src="192.168.1.100", dst="10.0.0.80")/TCP(sport=49152, dport=80, flags="FA", seq=1001 + len(http_payload), ack=2001 + len(http_resp))
    p8.time = base_time + 2.10
    normal_pkts.append(p8)

    normal_path = os.path.join(output_dir, "demo_normal_traffic.pcap")
    wrpcap(normal_path, normal_pkts)
    print(f"Created: {normal_path} ({len(normal_pkts)} packets)")

    # =========================================================================
    # 2. DDoS SYN Flood Attack PCAP (ATTACK / CRITICAL Risk)
    # =========================================================================
    ddos_pkts = []
    attacker_ip = "198.51.100.45"
    victim_ip = "10.0.0.1"
    
    t = base_time
    # 160 rapid SYN packets sent in rapid succession
    for i in range(160):
        pkt = Ether()/IP(src=attacker_ip, dst=victim_ip)/TCP(sport=30000 + i, dport=80, flags="S", seq=10000 + i)
        pkt.time = t
        ddos_pkts.append(pkt)
        t += 0.0002

    ddos_path = os.path.join(output_dir, "demo_ddos_syn_flood.pcap")
    wrpcap(ddos_path, ddos_pkts)
    print(f"Created: {ddos_path} ({len(ddos_pkts)} packets)")

    # =========================================================================
    # 3. Recon Port Scanning Attack PCAP (ATTACK / Reconnaissance)
    # =========================================================================
    scan_pkts = []
    scanner_ip = "172.16.0.88"
    target_server = "192.168.1.50"
    
    # 65 ports probed rapidly (>50 packet threshold)
    t = base_time
    for port in range(20, 85):
        pkt = Ether()/IP(src=scanner_ip, dst=target_server)/TCP(sport=45000 + (port % 1000), dport=port, flags="S", seq=5000 + port)
        pkt.time = t
        scan_pkts.append(pkt)
        t += 0.005

    scan_path = os.path.join(output_dir, "demo_port_scan_recon.pcap")
    wrpcap(scan_path, scan_pkts)
    print(f"Created: {scan_path} ({len(scan_pkts)} packets)")

    # =========================================================================
    # 4. Mixed Enterprise Traffic PCAP (Multi-Flow SOC Simulation)
    # =========================================================================
    # Combines normal browsing + port scan probe + DDoS burst
    mixed_pkts = normal_pkts + scan_pkts + ddos_pkts[:80]
    # Sort chronologically by time
    mixed_pkts.sort(key=lambda p: float(p.time))
    
    mixed_path = os.path.join(output_dir, "demo_mixed_enterprise_soc.pcap")
    wrpcap(mixed_path, mixed_pkts)
    print(f"Created: {mixed_path} ({len(mixed_pkts)} packets)")

if __name__ == "__main__":
    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sample_pcaps"))
    create_demo_pcaps(out_dir)
