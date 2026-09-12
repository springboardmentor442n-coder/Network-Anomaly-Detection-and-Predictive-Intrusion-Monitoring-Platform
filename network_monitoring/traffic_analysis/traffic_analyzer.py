from collections import Counter
from datetime import datetime
import time

from scapy.all import sniff, IP, TCP, UDP, ICMP


class TrafficAnalyzer:
    def __init__(self):
        self.reset()

    def reset(self):
        """Reset all traffic statistics for a new capture."""

        self.total_packets = 0
        self.total_bytes = 0
        self.protocol_counts = Counter()
        self.source_ips = Counter()
        self.destination_ips = Counter()
        self.packet_sizes = []

    def process_packet(self, packet):
        """Process one captured packet and update traffic statistics."""

        self.total_packets += 1

        packet_size = len(packet)
        self.total_bytes += packet_size
        self.packet_sizes.append(packet_size)

        if IP not in packet:
            self.protocol_counts["OTHER"] += 1
            return

        source_ip = packet[IP].src
        destination_ip = packet[IP].dst

        self.source_ips[source_ip] += 1
        self.destination_ips[destination_ip] += 1

        if TCP in packet:
            protocol = "TCP"
        elif UDP in packet:
            protocol = "UDP"
        elif ICMP in packet:
            protocol = "ICMP"
        else:
            protocol = "OTHER"

        self.protocol_counts[protocol] += 1

    def get_report(self, duration):
        """Generate a traffic analytics report."""

        average_packet_size = (
            self.total_bytes / self.total_packets
            if self.total_packets > 0
            else 0
        )

        packets_per_second = (
            self.total_packets / duration
            if duration > 0
            else 0
        )

        bytes_per_second = (
            self.total_bytes / duration
            if duration > 0
            else 0
        )

        return {
            "timestamp": datetime.now().strftime(
                "%Y-%m-%d %H:%M:%S"
            ),
            "capture_duration_seconds": round(
                duration,
                2,
            ),
            "total_packets": self.total_packets,
            "total_bytes": self.total_bytes,
            "average_packet_size": round(
                average_packet_size,
                2,
            ),
            "packets_per_second": round(
                packets_per_second,
                2,
            ),
            "bytes_per_second": round(
                bytes_per_second,
                2,
            ),
            "protocol_counts": dict(
                self.protocol_counts
            ),
            "top_source_ips": self.source_ips.most_common(
                5
            ),
            "top_destination_ips": self.destination_ips.most_common(
                5
            ),
        }

    def capture_and_analyze(self, duration=5):
        """
        Capture live traffic for the specified duration
        and return the analytics report.
        """

        self.reset()

        start_time = time.time()

        sniff(
            timeout=duration,
            prn=self.process_packet,
            store=False,
        )

        elapsed_time = time.time() - start_time

        return self.get_report(elapsed_time)

    def print_report(self, report):
        """Display the traffic analytics report."""

        print("\n" + "=" * 70)
        print("NetShield AI - Traffic Analytics Report")
        print("=" * 70)

        print(
            f"Timestamp:              "
            f"{report['timestamp']}"
        )

        print(
            f"Capture duration:       "
            f"{report['capture_duration_seconds']} seconds"
        )

        print(
            f"Total packets:          "
            f"{report['total_packets']}"
        )

        print(
            f"Total bytes:            "
            f"{report['total_bytes']}"
        )

        print(
            f"Average packet size:    "
            f"{report['average_packet_size']} bytes"
        )

        print(
            f"Packets per second:     "
            f"{report['packets_per_second']}"
        )

        print(
            f"Bytes per second:       "
            f"{report['bytes_per_second']}"
        )

        print("\nProtocol Distribution")
        print("-" * 70)

        for protocol, count in sorted(
            report["protocol_counts"].items(),
            key=lambda item: item[1],
            reverse=True,
        ):
            print(
                f"{protocol:<15} {count}"
            )

        print("\nTop Source IPs")
        print("-" * 70)

        for ip, count in report["top_source_ips"]:
            print(
                f"{ip:<25} {count} packets"
            )

        print("\nTop Destination IPs")
        print("-" * 70)

        for ip, count in report["top_destination_ips"]:
            print(
                f"{ip:<25} {count} packets"
            )

        print("=" * 70)


def start_traffic_analysis(duration=15):
    """Capture packets for a fixed duration and analyze traffic."""

    analyzer = TrafficAnalyzer()

    print("=" * 70)
    print("NetShield AI - Live Traffic Analytics")
    print("=" * 70)

    print(
        f"Capturing live traffic for "
        f"{duration} seconds..."
    )

    print(
        "Generate some normal network activity "
        "during the capture."
    )

    print("-" * 70)

    report = analyzer.capture_and_analyze(
        duration
    )

    analyzer.print_report(report)


if __name__ == "__main__":
    start_traffic_analysis(15)