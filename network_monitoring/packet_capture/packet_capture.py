from datetime import datetime
from scapy.all import sniff, IP, TCP, UDP, ICMP


def analyze_packet(packet):
    """Extract useful information from a captured packet."""

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    source_ip = "N/A"
    destination_ip = "N/A"
    protocol = "OTHER"
    source_port = "N/A"
    destination_port = "N/A"

    if IP in packet:
        source_ip = packet[IP].src
        destination_ip = packet[IP].dst

        if TCP in packet:
            protocol = "TCP"
            source_port = packet[TCP].sport
            destination_port = packet[TCP].dport

        elif UDP in packet:
            protocol = "UDP"
            source_port = packet[UDP].sport
            destination_port = packet[UDP].dport

        elif ICMP in packet:
            protocol = "ICMP"

        else:
            protocol = packet[IP].proto

    packet_size = len(packet)

    return {
        "timestamp": timestamp,
        "source_ip": source_ip,
        "destination_ip": destination_ip,
        "protocol": protocol,
        "source_port": source_port,
        "destination_port": destination_port,
        "packet_size": packet_size,
    }


def packet_callback(packet):
    """Process and display each captured packet."""

    data = analyze_packet(packet)

    print(
        f"[{data['timestamp']}] "
        f"{data['source_ip']} -> {data['destination_ip']} | "
        f"{data['protocol']} | "
        f"{data['source_port']} -> {data['destination_port']} | "
        f"{data['packet_size']} bytes"
    )


def start_capture(packet_count=20):
    """Capture a fixed number of packets."""

    print("=" * 70)
    print("NetShield AI - Network Packet Monitoring")
    print("=" * 70)
    print(f"Starting packet capture...")
    print(f"Packets to capture: {packet_count}")
    print("Press Ctrl+C to stop early.")
    print("-" * 70)

    sniff(
        count=packet_count,
        prn=packet_callback,
        store=False
    )

    print("-" * 70)
    print("Packet capture completed.")
    print("=" * 70)


if __name__ == "__main__":
    start_capture(20)