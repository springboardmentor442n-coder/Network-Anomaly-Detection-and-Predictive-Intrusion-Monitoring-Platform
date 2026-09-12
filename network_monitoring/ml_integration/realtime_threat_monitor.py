import sys
import time
from pathlib import Path

from sqlalchemy.orm import Session


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
# PROJECT IMPORTS
# ---------------------------------------------------------

from database.database import SessionLocal

from backend.app.models.alert import Alert

from ml.prediction_service import (
    predict_network_flow,
)

from network_monitoring.ml_integration.realtime_flow_features import (
    RealTimeFlowAggregator,
)


# ---------------------------------------------------------
# ALERT THRESHOLD
# ---------------------------------------------------------

# Create an alert when:
#
# 1. The ML model predicts ATTACK
# OR
# 2. The anomaly detector reports YES
# OR
# 3. Risk level is HIGH or CRITICAL
#
# This keeps ordinary LOW-risk traffic out of the
# alert table.

ALERT_RISK_LEVELS = {
    "HIGH",
    "CRITICAL",
}


# ---------------------------------------------------------
# CREATE ALERT
# ---------------------------------------------------------

def create_alert_from_prediction(
    db: Session,
    result: dict,
    metadata: dict,
):
    """
    Store a real-time ML result as a security alert
    when the result indicates a meaningful threat.
    """

    prediction = result.get(
        "prediction",
        "BENIGN",
    )

    anomaly = result.get(
        "anomaly",
        "NO",
    )

    risk_level = result.get(
        "risk_level",
        "LOW",
    )

    should_create_alert = (
        prediction == "ATTACK"
        or anomaly == "YES"
        or risk_level in ALERT_RISK_LEVELS
    )

    if not should_create_alert:
        return None

    alert = Alert(
        prediction=prediction,

        attack_probability=float(
            result.get(
                "attack_probability",
                0,
            )
        ),

        attack_type=result.get(
            "attack_type",
            "BENIGN",
        ),

        attack_type_confidence=(
            float(
                result["attack_type_confidence"]
            )
            if result.get(
                "attack_type_confidence"
            ) is not None
            else None
        ),

        anomaly=anomaly,

        risk_score=float(
            result.get(
                "risk_score",
                0,
            )
        ),

        risk_level=risk_level,

        source=metadata.get(
            "source_ip"
        ),

        destination=metadata.get(
            "destination_ip"
        ),

        status="OPEN",
    )

    db.add(alert)

    db.commit()

    db.refresh(alert)

    return alert


# ---------------------------------------------------------
# REAL-TIME THREAT MONITOR
# ---------------------------------------------------------

def run_realtime_threat_monitor(
    duration=10,
):
    """
    Capture live flows, run the M2 ML pipeline,
    and create database alerts for suspicious flows.
    """

    print("=" * 70)

    print(
        "NetShield AI - "
        "Real-Time Threat Monitor"
    )

    print("=" * 70)

    print(
        f"Capturing network traffic for "
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
        f"Flows captured: "
        f"{len(records)}"
    )

    print("-" * 70)

    if not records:

        print(
            "No flows captured."
        )

        print("=" * 70)

        return

    db = SessionLocal()

    predictions_tested = 0

    successful_predictions = 0

    failed_predictions = 0

    alerts_created = 0

    benign_count = 0

    attack_count = 0

    anomaly_count = 0

    try:

        for index, original_record in enumerate(
            records,
            start=1,
        ):

            record = dict(
                original_record
            )

            metadata = record.pop(
                "_metadata",
                {},
            )

            predictions_tested += 1

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

                if prediction == "ATTACK":
                    attack_count += 1
                else:
                    benign_count += 1

                if anomaly == "YES":
                    anomaly_count += 1

                alert = (
                    create_alert_from_prediction(
                        db=db,
                        result=result,
                        metadata=metadata,
                    )
                )

                if alert is not None:

                    alerts_created += 1

                    print(
                        f"\nALERT #{alert.alert_id}"
                    )

                    print(
                        f"  Source: "
                        f"{metadata.get('source_ip')}"
                    )

                    print(
                        f"  Destination: "
                        f"{metadata.get('destination_ip')}"
                    )

                    print(
                        f"  Prediction: "
                        f"{prediction}"
                    )

                    print(
                        f"  Attack Type: "
                        f"{result['attack_type']}"
                    )

                    print(
                        f"  Probability: "
                        f"{result['attack_probability']}%"
                    )

                    print(
                        f"  Anomaly: "
                        f"{anomaly}"
                    )

                    print(
                        f"  Risk Score: "
                        f"{result['risk_score']}"
                    )

                    print(
                        f"  Risk Level: "
                        f"{risk_level}"
                    )

                    print(
                        f"  Status: "
                        f"{alert.status}"
                    )

                else:

                    print(
                        f"Flow #{index}: "
                        f"{prediction} | "
                        f"Anomaly={anomaly} | "
                        f"Risk={risk_level}"
                    )

            except Exception as error:

                failed_predictions += 1

                print(
                    f"\nFlow #{index} "
                    f"prediction failed:"
                )

                print(
                    f"  "
                    f"{type(error).__name__}: "
                    f"{error}"
                )

        print(
            "\n" + "=" * 70
        )

        print(
            "Real-Time Threat Monitoring Summary"
        )

        print("=" * 70)

        print(
            f"Flows captured: "
            f"{len(records)}"
        )

        print(
            f"Predictions tested: "
            f"{predictions_tested}"
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
            f"BENIGN flows: "
            f"{benign_count}"
        )

        print(
            f"ATTACK flows: "
            f"{attack_count}"
        )

        print(
            f"Anomalous flows: "
            f"{anomaly_count}"
        )

        print(
            f"Alerts created: "
            f"{alerts_created}"
        )

        print("=" * 70)

    finally:

        db.close()


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

if __name__ == "__main__":

    run_realtime_threat_monitor(
        duration=10
    )