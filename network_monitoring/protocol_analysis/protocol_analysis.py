from collections import Counter
from datetime import datetime
import time

from scapy.all import (
    sniff,
    IP,
    TCP,
    UDP,
    ICMP,
    DNS,
    ARP,
)


class ProtocolAnalyzer:
    def __init__(self):
        self.total_packets = 0
        self.protocol_counts = Counter()

    def identify_protocol(self, packet):
        """Identify the most specific protocol present in a packet."""

        if ARP in packet:
            return "ARP"

        if DNS in packet:
            return "DNS"

        if ICMP in packet:
            return "ICMP"

        if TCP in packet:
            destination_port = packet[TCP].dport
            source_port = packet[TCP].sport

            if destination_port == 80 or source_port == 80:
                return "HTTP"

            if destination_port == 443 or source_port == 443:
                return "HTTPS"

            return "TCP"

        if UDP in packet:
            destination_port = packet[UDP].dport
            source_port = packet[UDP].sport

            if destination_port == 53 or source_port == 53:
                return "DNS"

            return "UDP"

        if IP in packet:
            return "IP"

        return "OTHER"

    def process_packet(self, packet):
        """Process one packet and update protocol statistics."""

        self.total_packets += 1

        protocol = self.identify_protocol(packet)
        self.protocol_counts[protocol] += 1

    def print_report(self, duration):
        """Display the protocol analysis report."""

        print("\n" + "=" * 70)
        print("NetShield AI - Protocol Analysis Report")
        print("=" * 70)

        print(
            f"Timestamp:          "
            f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        )
        print(f"Capture duration:   {duration:.2f} seconds")
        print(f"Total packets:      {self.total_packets}")

        print("\nProtocol Distribution")
        print("-" * 70)

        for protocol, count in self.protocol_counts.most_common():
            percentage = (
                count / self.total_packets * 100
                if self.total_packets > 0
                else 0
            )

            print(
                f"{protocol:<15} "
                f"{count:>6} packets "
                f"({percentage:>6.2f}%)"
            )

        print("=" * 70)


def start_protocol_analysis(duration=15):
    """Capture live traffic and analyze protocols."""

    analyzer = ProtocolAnalyzer()

    print("=" * 70)
    print("NetShield AI - Live Protocol Analysis")
    print("=" * 70)
    print(f"Capturing live traffic for {duration} seconds...")
    print("Generate some normal network activity during the capture.")
    print("-" * 70)

    start_time = time.time()

    sniff(
        timeout=duration,
        prn=analyzer.process_packet,
        store=False
    )

    elapsed_time = time.time() - start_time

    analyzer.print_report(elapsed_time)


if __name__ == "__main__":
    start_protocol_analysis(15)