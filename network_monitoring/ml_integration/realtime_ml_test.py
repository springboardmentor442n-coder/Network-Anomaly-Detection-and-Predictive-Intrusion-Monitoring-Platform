import sys
import time
from pathlib import Path


# ---------------------------------------------------------
# PROJECT ROOT
# ---------------------------------------------------------

PROJECT_ROOT = Path(
    __file__
).resolve().parents[2]

if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(
        0,
        str(PROJECT_ROOT),
    )


# ---------------------------------------------------------
# IMPORT ML PREDICTION SERVICE
# ---------------------------------------------------------

from ml.prediction_service import (
    predict_network_flow,
)


# ---------------------------------------------------------
# IMPORT REAL-TIME FLOW AGGREGATOR
# ---------------------------------------------------------

from network_monitoring.ml_integration.realtime_flow_features import (
    RealTimeFlowAggregator,
)


# ---------------------------------------------------------
# REAL-TIME ML TEST
# ---------------------------------------------------------

def run_realtime_ml_test(duration=10):

    print("=" * 70)

    print(
        "NetShield AI - "
        "Real-Time ML Integration Test"
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

    aggregator = (
        RealTimeFlowAggregator()
    )

    start_time = time.time()

    aggregator.capture(
        duration=duration
    )

    elapsed_time = (
        time.time()
        - start_time
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
        f"Flow records generated: "
        f"{len(records)}"
    )

    print("-" * 70)

    if not records:

        print(
            "No network flows were captured."
        )

        print("=" * 70)

        return

    prediction_counts = {
        "BENIGN": 0,
        "ATTACK": 0,
    }

    anomaly_counts = {
        "NO": 0,
        "YES": 0,
    }

    risk_counts = {
        "LOW": 0,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0,
    }

    successful_predictions = 0

    failed_predictions = 0

    # -----------------------------------------------------
    # TEST FIRST 10 FLOWS
    # -----------------------------------------------------

    flows_to_test = records[:10]

    for index, original_record in enumerate(
        flows_to_test,
        start=1,
    ):

        # Make a copy so the original record remains
        # unchanged.

        record = dict(
            original_record
        )

        metadata = record.pop(
            "_metadata",
            {},
        )

        try:

            result = (
                predict_network_flow(
                    record
                )
            )

            successful_predictions += 1

            prediction = result[
                "prediction"
            ]

            anomaly = result[
                "anomaly"
            ]

            risk_level = result[
                "risk_level"
            ]

            prediction_counts[
                prediction
            ] = (
                prediction_counts.get(
                    prediction,
                    0,
                )
                + 1
            )

            anomaly_counts[
                anomaly
            ] = (
                anomaly_counts.get(
                    anomaly,
                    0,
                )
                + 1
            )

            risk_counts[
                risk_level
            ] = (
                risk_counts.get(
                    risk_level,
                    0,
                )
                + 1
            )

            print(
                f"\nFlow #{index}"
            )

            print(
                f"  Source: "
                f"{metadata.get('source_ip')}:"
                f"{metadata.get('source_port')}"
            )

            print(
                f"  Destination: "
                f"{metadata.get('destination_ip')}:"
                f"{metadata.get('destination_port')}"
            )

            print(
                f"  Protocol: "
                f"{metadata.get('protocol')}"
            )

            print(
                f"  Packets: "
                f"{metadata.get('packet_count')}"
            )

            print(
                f"  Bytes: "
                f"{metadata.get('byte_count')}"
            )

            print(
                f"  Prediction: "
                f"{result['prediction']}"
            )

            print(
                f"  Attack Probability: "
                f"{result['attack_probability']}%"
            )

            print(
                f"  Attack Type: "
                f"{result['attack_type']}"
            )

            print(
                f"  Attack Type Confidence: "
                f"{result['attack_type_confidence']}"
            )

            print(
                f"  Anomaly: "
                f"{result['anomaly']}"
            )

            print(
                f"  Risk Score: "
                f"{result['risk_score']}/100"
            )

            print(
                f"  Risk Level: "
                f"{result['risk_level']}"
            )

        except Exception as error:

            failed_predictions += 1

            print(
                f"\nFlow #{index}"
            )

            print(
                "  Prediction failed:"
            )

            print(
                f"  {type(error).__name__}: "
                f"{error}"
            )

    # -----------------------------------------------------
    # SUMMARY
    # -----------------------------------------------------

    print(
        "\n" + "=" * 70
    )

    print(
        "Real-Time ML Test Summary"
    )

    print("=" * 70)

    print(
        f"Flows captured: "
        f"{len(records)}"
    )

    print(
        f"Flows tested: "
        f"{len(flows_to_test)}"
    )

    print(
        f"Successful predictions: "
        f"{successful_predictions}"
    )

    print(
        f"Failed predictions: "
        f"{failed_predictions}"
    )

    print(
        "\nPrediction counts:"
    )

    for prediction, count in (
        prediction_counts.items()
    ):

        print(
            f"  {prediction:<10} "
            f"{count}"
        )

    print(
        "\nAnomaly counts:"
    )

    for anomaly, count in (
        anomaly_counts.items()
    ):

        print(
            f"  {anomaly:<10} "
            f"{count}"
        )

    print(
        "\nRisk levels:"
    )

    for risk_level, count in (
        risk_counts.items()
    ):

        print(
            f"  {risk_level:<10} "
            f"{count}"
        )

    print("=" * 70)


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

if __name__ == "__main__":

    run_realtime_ml_test(
        duration=10
    )