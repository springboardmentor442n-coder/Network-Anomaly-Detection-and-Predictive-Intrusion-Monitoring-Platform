import threading
import time

from database.database import SessionLocal

from backend.app.models.alert import Alert

from ml.prediction_service import predict_network_flow

from network_monitoring.ml_integration.realtime_flow_features import (
    RealTimeFlowAggregator,
)


class RealtimeMonitorService:
    """
    Background service for continuously capturing network
    flows, running ML predictions, and creating alerts.
    """

    def __init__(
        self,
        capture_duration=10,
        pause_between_captures=1,
    ):
        self.capture_duration = capture_duration
        self.pause_between_captures = (
            pause_between_captures
        )

        self.running = False
        self.thread = None

        self.total_flows = 0
        self.total_predictions = 0
        self.total_alerts = 0

        self.last_cycle_started = None
        self.last_cycle_completed = None

    # -----------------------------------------------------
    # ALERT CREATION
    # -----------------------------------------------------

    def create_alert(
        self,
        db,
        result,
        metadata,
    ):
        """
        Create a database alert when the ML result
        indicates an anomaly or significant risk.
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
            or risk_level in {
                "HIGH",
                "CRITICAL",
            }
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
                    result[
                        "attack_type_confidence"
                    ]
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

        self.total_alerts += 1

        return alert

    # -----------------------------------------------------
    # SINGLE MONITORING CYCLE
    # -----------------------------------------------------

    def run_cycle(self):
        """
        Capture one batch of live traffic and process
        all generated flow records through the ML pipeline.
        """

        self.last_cycle_started = time.time()

        aggregator = (
            RealTimeFlowAggregator()
        )

        aggregator.capture(
            duration=self.capture_duration
        )

        records = (
            aggregator.get_feature_records()
        )

        self.total_flows += len(
            records
        )

        db = SessionLocal()

        try:

            for original_record in records:

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

                    self.total_predictions += 1

                    self.create_alert(
                        db=db,
                        result=result,
                        metadata=metadata,
                    )

                except Exception as error:

                    print(
                        "Real-time prediction error:"
                    )

                    print(
                        f"{type(error).__name__}: "
                        f"{error}"
                    )

        finally:

            db.close()

        self.last_cycle_completed = (
            time.time()
        )

        return {
            "flows_processed": len(
                records
            ),

            "total_flows_processed": (
                self.total_flows
            ),

            "total_predictions": (
                self.total_predictions
            ),

            "total_alerts": (
                self.total_alerts
            ),

            "last_cycle_started": (
                self.last_cycle_started
            ),

            "last_cycle_completed": (
                self.last_cycle_completed
            ),
        }

    # -----------------------------------------------------
    # BACKGROUND LOOP
    # -----------------------------------------------------

    def _monitor_loop(self):
        """
        Continuously run monitoring cycles until stopped.
        """

        print(
            "NetShield AI real-time monitor started."
        )

        while self.running:

            try:

                summary = self.run_cycle()

                print(
                    "Monitoring cycle completed: "
                    f"{summary['flows_processed']} flows, "
                    f"{summary['total_predictions']} total predictions, "
                    f"{summary['total_alerts']} total alerts."
                )

            except Exception as error:

                print(
                    "Real-time monitoring cycle failed:"
                )

                print(
                    f"{type(error).__name__}: "
                    f"{error}"
                )

            if self.running:

                time.sleep(
                    self.pause_between_captures
                )

        print(
            "NetShield AI real-time monitor stopped."
        )

    # -----------------------------------------------------
    # START
    # -----------------------------------------------------

    def start(self):
        """
        Start the monitor in a background thread.
        """

        if self.running:

            return {
                "status": "already_running",
            }

        self.running = True

        self.thread = threading.Thread(
            target=self._monitor_loop,
            name="NetShieldRealtimeMonitor",
            daemon=True,
        )

        self.thread.start()

        return {
            "status": "started",
        }

    # -----------------------------------------------------
    # STOP
    # -----------------------------------------------------

    def stop(self):
        """
        Stop the background monitor.
        """

        if not self.running:

            return {
                "status": "already_stopped",
            }

        self.running = False

        if (
            self.thread is not None
            and self.thread.is_alive()
        ):

            self.thread.join(
                timeout=2
            )

        self.thread = None

        return {
            "status": "stopped",
        }

    # -----------------------------------------------------
    # STATUS
    # -----------------------------------------------------

    def status(self):
        """
        Return the current monitoring status.
        """

        return {
            "running": self.running,

            "capture_duration_seconds": (
                self.capture_duration
            ),

            "pause_between_captures_seconds": (
                self.pause_between_captures
            ),

            "total_flows_processed": (
                self.total_flows
            ),

            "total_predictions": (
                self.total_predictions
            ),

            "total_alerts": (
                self.total_alerts
            ),

            "thread_alive": (
                self.thread is not None
                and self.thread.is_alive()
            ),
        }


# ---------------------------------------------------------
# SINGLE SHARED SERVICE INSTANCE
# ---------------------------------------------------------

monitor_service = RealtimeMonitorService(
    capture_duration=10,
    pause_between_captures=1,
)


# ---------------------------------------------------------
# MANUAL TEST
# ---------------------------------------------------------

if __name__ == "__main__":

    service = RealtimeMonitorService(
        capture_duration=10,
        pause_between_captures=1,
    )

    print("=" * 70)

    print(
        "NetShield AI - "
        "Background Real-Time Monitor Test"
    )

    print("=" * 70)

    print(
        "Starting background monitoring."
    )

    print(
        "Press Ctrl+C to stop."
    )

    print("-" * 70)

    service.start()

    try:

        while service.running:

            time.sleep(2)

            print(
                service.status()
            )

    except KeyboardInterrupt:

        print(
            "\nStopping monitor..."
        )

        service.stop()

        print(
            "Monitor stopped."
        )