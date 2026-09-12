from datetime import datetime
import statistics
import time

from scapy.all import sniff, IP, TCP, UDP


# ---------------------------------------------------------
# CICIDS2017 FEATURE NAMES
# ---------------------------------------------------------

FEATURE_NAMES = [
    "Destination Port",
    "Flow Duration",
    "Total Fwd Packets",
    "Total Backward Packets",
    "Total Length of Fwd Packets",
    "Total Length of Bwd Packets",
    "Fwd Packet Length Max",
    "Fwd Packet Length Min",
    "Fwd Packet Length Mean",
    "Fwd Packet Length Std",
    "Bwd Packet Length Max",
    "Bwd Packet Length Min",
    "Bwd Packet Length Mean",
    "Bwd Packet Length Std",
    "Flow Bytes/s",
    "Flow Packets/s",
    "Flow IAT Mean",
    "Flow IAT Std",
    "Flow IAT Max",
    "Flow IAT Min",
    "Fwd IAT Total",
    "Fwd IAT Mean",
    "Fwd IAT Std",
    "Fwd IAT Max",
    "Fwd IAT Min",
    "Bwd IAT Total",
    "Bwd IAT Mean",
    "Bwd IAT Std",
    "Bwd IAT Max",
    "Bwd IAT Min",
    "Fwd PSH Flags",
    "Bwd PSH Flags",
    "Fwd URG Flags",
    "Bwd URG Flags",
    "Fwd Header Length",
    "Bwd Header Length",
    "Fwd Packets/s",
    "Bwd Packets/s",
    "Min Packet Length",
    "Max Packet Length",
    "Packet Length Mean",
    "Packet Length Std",
    "Packet Length Variance",
    "FIN Flag Count",
    "SYN Flag Count",
    "RST Flag Count",
    "PSH Flag Count",
    "ACK Flag Count",
    "URG Flag Count",
    "CWE Flag Count",
    "ECE Flag Count",
    "Down/Up Ratio",
    "Average Packet Size",
    "Avg Fwd Segment Size",
    "Avg Bwd Segment Size",
    "Fwd Header Length.1",
    "Fwd Avg Bytes/Bulk",
    "Fwd Avg Packets/Bulk",
    "Fwd Avg Bulk Rate",
    "Bwd Avg Bytes/Bulk",
    "Bwd Avg Packets/Bulk",
    "Bwd Avg Bulk Rate",
    "Subflow Fwd Packets",
    "Subflow Fwd Bytes",
    "Subflow Bwd Packets",
    "Subflow Bwd Bytes",
    "Init_Win_bytes_forward",
    "Init_Win_bytes_backward",
    "act_data_pkt_fwd",
    "min_seg_size_forward",
    "Active Mean",
    "Active Std",
    "Active Max",
    "Active Min",
    "Idle Mean",
    "Idle Std",
    "Idle Max",
    "Idle Min",
]


# ---------------------------------------------------------
# HELPER FUNCTIONS
# ---------------------------------------------------------

def safe_mean(values):
    if not values:
        return 0.0

    return float(sum(values) / len(values))


def safe_std(values):
    if len(values) < 2:
        return 0.0

    return float(statistics.pstdev(values))


def safe_min(values):
    if not values:
        return 0.0

    return float(min(values))


def safe_max(values):
    if not values:
        return 0.0

    return float(max(values))


def safe_sum(values):
    return float(sum(values))


def inter_arrival_times(timestamps):
    if len(timestamps) < 2:
        return []

    return [
        max(
            0.0,
            float(
                timestamps[index]
                - timestamps[index - 1]
            ),
        )
        for index in range(1, len(timestamps))
    ]


def packet_protocol(packet):
    if TCP in packet:
        return "TCP"

    if UDP in packet:
        return "UDP"

    return "OTHER"


def packet_ports(packet):
    source_port = 0
    destination_port = 0

    if TCP in packet:
        source_port = int(packet[TCP].sport)
        destination_port = int(packet[TCP].dport)

    elif UDP in packet:
        source_port = int(packet[UDP].sport)
        destination_port = int(packet[UDP].dport)

    return source_port, destination_port


# ---------------------------------------------------------
# NETWORK FLOW
# ---------------------------------------------------------

class NetworkFlow:

    def __init__(
        self,
        source_ip,
        destination_ip,
        source_port,
        destination_port,
        protocol,
    ):
        self.source_ip = source_ip
        self.destination_ip = destination_ip
        self.source_port = source_port
        self.destination_port = destination_port
        self.protocol = protocol

        self.start_time = None
        self.end_time = None

        self.forward_sizes = []
        self.backward_sizes = []

        self.forward_times = []
        self.backward_times = []

        self.all_sizes = []
        self.all_times = []

        self.fwd_header_lengths = []
        self.bwd_header_lengths = []

        self.fwd_psh_flags = 0
        self.bwd_psh_flags = 0

        self.fwd_urg_flags = 0
        self.bwd_urg_flags = 0

        self.fin_flag_count = 0
        self.syn_flag_count = 0
        self.rst_flag_count = 0
        self.psh_flag_count = 0
        self.ack_flag_count = 0
        self.urg_flag_count = 0
        self.cwe_flag_count = 0
        self.ece_flag_count = 0

        self.init_win_forward = 0
        self.init_win_backward = 0

        self.min_seg_size_forward = 0

    def add_packet(
        self,
        packet,
        timestamp,
        forward,
    ):
        packet_size = len(packet)

        timestamp = float(timestamp)

        if self.start_time is None:
            self.start_time = timestamp

        self.end_time = timestamp

        self.all_sizes.append(packet_size)
        self.all_times.append(timestamp)

        if forward:
            self.forward_sizes.append(packet_size)
            self.forward_times.append(timestamp)
        else:
            self.backward_sizes.append(packet_size)
            self.backward_times.append(timestamp)

        # -------------------------------------------------
        # IP HEADER
        # -------------------------------------------------

        if IP in packet:
            ip_header_length = int(
                packet[IP].ihl or 5
            ) * 4

            if forward:
                self.fwd_header_lengths.append(
                    ip_header_length
                )
            else:
                self.bwd_header_lengths.append(
                    ip_header_length
                )

        # -------------------------------------------------
        # TCP INFORMATION
        # -------------------------------------------------

        if TCP in packet:

            flags = int(packet[TCP].flags)

            # FIN
            if flags & 0x01:
                self.fin_flag_count += 1

            # SYN
            if flags & 0x02:
                self.syn_flag_count += 1

                if forward:
                    if self.init_win_forward == 0:
                        self.init_win_forward = int(
                            packet[TCP].window
                        )
                else:
                    if self.init_win_backward == 0:
                        self.init_win_backward = int(
                            packet[TCP].window
                        )

            # RST
            if flags & 0x04:
                self.rst_flag_count += 1

            # PSH
            if flags & 0x08:
                self.psh_flag_count += 1

                if forward:
                    self.fwd_psh_flags += 1
                else:
                    self.bwd_psh_flags += 1

            # ACK
            if flags & 0x10:
                self.ack_flag_count += 1

            # URG
            if flags & 0x20:
                self.urg_flag_count += 1

                if forward:
                    self.fwd_urg_flags += 1
                else:
                    self.bwd_urg_flags += 1

            # TCP header length
            tcp_header_length = int(
                packet[TCP].dataofs or 5
            ) * 4

            if forward:
                self.fwd_header_lengths.append(
                    tcp_header_length
                )
            else:
                self.bwd_header_lengths.append(
                    tcp_header_length
                )

            # Forward minimum segment size
            if (
                forward
                and self.min_seg_size_forward == 0
            ):
                payload_length = len(
                    bytes(packet[TCP].payload)
                )

                if payload_length > 0:
                    self.min_seg_size_forward = (
                        payload_length
                    )

    def to_feature_dict(self):

        if not self.all_times:
            return {
                feature: 0.0
                for feature in FEATURE_NAMES
            }

        # -------------------------------------------------
        # FLOW DURATION
        # -------------------------------------------------

        duration_seconds = max(
            0.0,
            float(
                self.end_time
                - self.start_time
            ),
        )

        duration_microseconds = (
            duration_seconds * 1_000_000
        )

        # -------------------------------------------------
        # PACKET COUNTS
        # -------------------------------------------------

        forward_count = len(
            self.forward_sizes
        )

        backward_count = len(
            self.backward_sizes
        )

        total_count = (
            forward_count
            + backward_count
        )

        # -------------------------------------------------
        # BYTE COUNTS
        # -------------------------------------------------

        total_forward_bytes = safe_sum(
            self.forward_sizes
        )

        total_backward_bytes = safe_sum(
            self.backward_sizes
        )

        total_bytes = (
            total_forward_bytes
            + total_backward_bytes
        )

        # -------------------------------------------------
        # INTER-ARRIVAL TIMES
        # -------------------------------------------------

        all_iat = inter_arrival_times(
            self.all_times
        )

        fwd_iat = inter_arrival_times(
            self.forward_times
        )

        bwd_iat = inter_arrival_times(
            self.backward_times
        )

        # -------------------------------------------------
        # RATE CALCULATIONS
        # -------------------------------------------------

        # For a one-packet flow or packets sharing the
        # exact same timestamp, duration is zero.
        # We return 0 for rates instead of inventing
        # a one-microsecond duration.

        if duration_seconds > 0:

            flow_bytes_per_second = (
                total_bytes
                / duration_seconds
            )

            flow_packets_per_second = (
                total_count
                / duration_seconds
            )

            fwd_packets_per_second = (
                forward_count
                / duration_seconds
            )

            bwd_packets_per_second = (
                backward_count
                / duration_seconds
            )

        else:

            flow_bytes_per_second = 0.0

            flow_packets_per_second = 0.0

            fwd_packets_per_second = 0.0

            bwd_packets_per_second = 0.0

        # -------------------------------------------------
        # PACKET STATISTICS
        # -------------------------------------------------

        packet_mean = safe_mean(
            self.all_sizes
        )

        packet_std = safe_std(
            self.all_sizes
        )

        packet_variance = (
            packet_std ** 2
        )

        forward_mean = safe_mean(
            self.forward_sizes
        )

        backward_mean = safe_mean(
            self.backward_sizes
        )

        # -------------------------------------------------
        # FLOW IAT
        # -------------------------------------------------

        flow_iat_mean = (
            safe_mean(all_iat)
            * 1_000_000
        )

        flow_iat_std = (
            safe_std(all_iat)
            * 1_000_000
        )

        flow_iat_max = (
            safe_max(all_iat)
            * 1_000_000
        )

        flow_iat_min = (
            safe_min(all_iat)
            * 1_000_000
        )

        # -------------------------------------------------
        # FORWARD IAT
        # -------------------------------------------------

        fwd_iat_total = (
            safe_sum(fwd_iat)
            * 1_000_000
        )

        fwd_iat_mean = (
            safe_mean(fwd_iat)
            * 1_000_000
        )

        fwd_iat_std = (
            safe_std(fwd_iat)
            * 1_000_000
        )

        fwd_iat_max = (
            safe_max(fwd_iat)
            * 1_000_000
        )

        fwd_iat_min = (
            safe_min(fwd_iat)
            * 1_000_000
        )

        # -------------------------------------------------
        # BACKWARD IAT
        # -------------------------------------------------

        bwd_iat_total = (
            safe_sum(bwd_iat)
            * 1_000_000
        )

        bwd_iat_mean = (
            safe_mean(bwd_iat)
            * 1_000_000
        )

        bwd_iat_std = (
            safe_std(bwd_iat)
            * 1_000_000
        )

        bwd_iat_max = (
            safe_max(bwd_iat)
            * 1_000_000
        )

        bwd_iat_min = (
            safe_min(bwd_iat)
            * 1_000_000
        )

        # -------------------------------------------------
        # FEATURE DICTIONARY
        # -------------------------------------------------

        feature_dict = {

            "Destination Port": float(
                self.destination_port
            ),

            "Flow Duration": float(
                duration_microseconds
            ),

            "Total Fwd Packets": float(
                forward_count
            ),

            "Total Backward Packets": float(
                backward_count
            ),

            "Total Length of Fwd Packets": float(
                total_forward_bytes
            ),

            "Total Length of Bwd Packets": float(
                total_backward_bytes
            ),

            "Fwd Packet Length Max": safe_max(
                self.forward_sizes
            ),

            "Fwd Packet Length Min": safe_min(
                self.forward_sizes
            ),

            "Fwd Packet Length Mean": forward_mean,

            "Fwd Packet Length Std": safe_std(
                self.forward_sizes
            ),

            "Bwd Packet Length Max": safe_max(
                self.backward_sizes
            ),

            "Bwd Packet Length Min": safe_min(
                self.backward_sizes
            ),

            "Bwd Packet Length Mean": backward_mean,

            "Bwd Packet Length Std": safe_std(
                self.backward_sizes
            ),

            "Flow Bytes/s": flow_bytes_per_second,

            "Flow Packets/s": flow_packets_per_second,

            "Flow IAT Mean": flow_iat_mean,

            "Flow IAT Std": flow_iat_std,

            "Flow IAT Max": flow_iat_max,

            "Flow IAT Min": flow_iat_min,

            "Fwd IAT Total": fwd_iat_total,

            "Fwd IAT Mean": fwd_iat_mean,

            "Fwd IAT Std": fwd_iat_std,

            "Fwd IAT Max": fwd_iat_max,

            "Fwd IAT Min": fwd_iat_min,

            "Bwd IAT Total": bwd_iat_total,

            "Bwd IAT Mean": bwd_iat_mean,

            "Bwd IAT Std": bwd_iat_std,

            "Bwd IAT Max": bwd_iat_max,

            "Bwd IAT Min": bwd_iat_min,

            "Fwd PSH Flags": float(
                self.fwd_psh_flags
            ),

            "Bwd PSH Flags": float(
                self.bwd_psh_flags
            ),

            "Fwd URG Flags": float(
                self.fwd_urg_flags
            ),

            "Bwd URG Flags": float(
                self.bwd_urg_flags
            ),

            "Fwd Header Length": safe_sum(
                self.fwd_header_lengths
            ),

            "Bwd Header Length": safe_sum(
                self.bwd_header_lengths
            ),

            "Fwd Packets/s": fwd_packets_per_second,

            "Bwd Packets/s": bwd_packets_per_second,

            "Min Packet Length": safe_min(
                self.all_sizes
            ),

            "Max Packet Length": safe_max(
                self.all_sizes
            ),

            "Packet Length Mean": packet_mean,

            "Packet Length Std": packet_std,

            "Packet Length Variance": packet_variance,

            "FIN Flag Count": float(
                self.fin_flag_count
            ),

            "SYN Flag Count": float(
                self.syn_flag_count
            ),

            "RST Flag Count": float(
                self.rst_flag_count
            ),

            "PSH Flag Count": float(
                self.psh_flag_count
            ),

            "ACK Flag Count": float(
                self.ack_flag_count
            ),

            "URG Flag Count": float(
                self.urg_flag_count
            ),

            "CWE Flag Count": float(
                self.cwe_flag_count
            ),

            "ECE Flag Count": float(
                self.ece_flag_count
            ),

            "Down/Up Ratio": (
                float(
                    backward_count
                    / forward_count
                )
                if forward_count > 0
                else 0.0
            ),

            "Average Packet Size": packet_mean,

            "Avg Fwd Segment Size": forward_mean,

            "Avg Bwd Segment Size": backward_mean,

            "Fwd Header Length.1": safe_sum(
                self.fwd_header_lengths
            ),

            # These cannot be reliably reconstructed
            # by this lightweight collector.

            "Fwd Avg Bytes/Bulk": 0.0,

            "Fwd Avg Packets/Bulk": 0.0,

            "Fwd Avg Bulk Rate": 0.0,

            "Bwd Avg Bytes/Bulk": 0.0,

            "Bwd Avg Packets/Bulk": 0.0,

            "Bwd Avg Bulk Rate": 0.0,

            "Subflow Fwd Packets": float(
                forward_count
            ),

            "Subflow Fwd Bytes": float(
                total_forward_bytes
            ),

            "Subflow Bwd Packets": float(
                backward_count
            ),

            "Subflow Bwd Bytes": float(
                total_backward_bytes
            ),

            "Init_Win_bytes_forward": float(
                self.init_win_forward
            ),

            "Init_Win_bytes_backward": float(
                self.init_win_backward
            ),

            "act_data_pkt_fwd": float(
                sum(
                    1
                    for size in self.forward_sizes
                    if size > 0
                )
            ),

            "min_seg_size_forward": float(
                self.min_seg_size_forward
            ),

            # Active/idle statistics are not reliably
            # reconstructable from this collector.

            "Active Mean": 0.0,

            "Active Std": 0.0,

            "Active Max": 0.0,

            "Active Min": 0.0,

            "Idle Mean": 0.0,

            "Idle Std": 0.0,

            "Idle Max": 0.0,

            "Idle Min": 0.0,
        }

        return {
            feature: float(
                feature_dict.get(
                    feature,
                    0.0,
                )
            )
            for feature in FEATURE_NAMES
        }

    def metadata(self):

        return {
            "source_ip": self.source_ip,

            "destination_ip": (
                self.destination_ip
            ),

            "source_port": (
                self.source_port
            ),

            "destination_port": (
                self.destination_port
            ),

            "protocol": self.protocol,

            "start_time": (
                datetime.fromtimestamp(
                    self.start_time
                ).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if self.start_time is not None
                else None
            ),

            "end_time": (
                datetime.fromtimestamp(
                    self.end_time
                ).strftime(
                    "%Y-%m-%d %H:%M:%S"
                )
                if self.end_time is not None
                else None
            ),

            "packet_count": len(
                self.all_sizes
            ),

            "byte_count": int(
                sum(self.all_sizes)
            ),
        }


# ---------------------------------------------------------
# REAL-TIME FLOW AGGREGATOR
# ---------------------------------------------------------

class RealTimeFlowAggregator:

    def __init__(self):
        self.flows = {}

    def _get_flow_key(self, packet):

        if IP not in packet:
            return None

        protocol = packet_protocol(
            packet
        )

        source_ip = packet[IP].src
        destination_ip = packet[IP].dst

        source_port, destination_port = (
            packet_ports(packet)
        )

        forward_key = (
            source_ip,
            destination_ip,
            source_port,
            destination_port,
            protocol,
        )

        backward_key = (
            destination_ip,
            source_ip,
            destination_port,
            source_port,
            protocol,
        )

        if forward_key in self.flows:
            return forward_key, True

        if backward_key in self.flows:
            return backward_key, False

        self.flows[forward_key] = NetworkFlow(
            source_ip=source_ip,
            destination_ip=destination_ip,
            source_port=source_port,
            destination_port=destination_port,
            protocol=protocol,
        )

        return forward_key, True

    def process_packet(self, packet):

        if IP not in packet:
            return

        result = self._get_flow_key(
            packet
        )

        if result is None:
            return

        flow_key, forward = result

        flow = self.flows[
            flow_key
        ]

        timestamp = float(
            getattr(
                packet,
                "time",
                time.time(),
            )
        )

        flow.add_packet(
            packet=packet,
            timestamp=timestamp,
            forward=forward,
        )

    def capture(self, duration=10):

        self.flows = {}

        sniff(
            timeout=duration,
            prn=self.process_packet,
            store=False,
        )

        return list(
            self.flows.values()
        )

    def get_feature_records(self):

        records = []

        for flow in self.flows.values():

            if not flow.all_sizes:
                continue

            record = flow.to_feature_dict()

            record["_metadata"] = (
                flow.metadata()
            )

            records.append(record)

        return records


# ---------------------------------------------------------
# COMMAND-LINE TEST
# ---------------------------------------------------------

def run_flow_capture(duration=10):

    print("=" * 70)

    print(
        "NetShield AI - "
        "Real-Time Flow Feature Builder"
    )

    print("=" * 70)

    print(
        f"Capturing live traffic for "
        f"{duration} seconds..."
    )

    print(
        "Generate normal network activity "
        "during the capture."
    )

    print("-" * 70)

    aggregator = RealTimeFlowAggregator()

    start_time = time.time()

    flows = aggregator.capture(
        duration=duration
    )

    elapsed_time = (
        time.time() - start_time
    )

    records = (
        aggregator.get_feature_records()
    )

    print("-" * 70)

    print(
        f"Capture duration: "
        f"{elapsed_time:.2f} seconds"
    )

    print(
        f"Total flows created: "
        f"{len(flows)}"
    )

    print(
        f"ML-ready flow records: "
        f"{len(records)}"
    )

    print("-" * 70)

    for index, record in enumerate(
        records[:10],
        start=1,
    ):

        metadata = record[
            "_metadata"
        ]

        print(
            f"\nFlow #{index}"
        )

        print(
            f"  "
            f"{metadata['source_ip']}:"
            f"{metadata['source_port']}"
            f" -> "
            f"{metadata['destination_ip']}:"
            f"{metadata['destination_port']}"
        )

        print(
            f"  Protocol: "
            f"{metadata['protocol']}"
        )

        print(
            f"  Packets: "
            f"{metadata['packet_count']}"
        )

        print(
            f"  Bytes: "
            f"{metadata['byte_count']}"
        )

        print(
            f"  Flow Duration: "
            f"{record['Flow Duration']:.2f} "
            f"microseconds"
        )

        print(
            f"  Flow Packets/s: "
            f"{record['Flow Packets/s']:.2f}"
        )

        print(
            f"  Flow Bytes/s: "
            f"{record['Flow Bytes/s']:.2f}"
        )

    print(
        "\n" + "=" * 70
    )

    print(
        "Flow feature extraction completed."
    )

    print(
        "=" * 70
    )


if __name__ == "__main__":
    run_flow_capture(10)