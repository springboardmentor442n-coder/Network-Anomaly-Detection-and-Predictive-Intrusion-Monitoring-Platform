"""Human-readable naming for classification targets and classes."""

from __future__ import annotations

from typing import Any, Sequence

BINARY_POSITIVE_LABEL = "Attack"
BINARY_NEGATIVE_LABEL = "Normal"

_BINARY_TRUTHY = {"1", "1.0", "true", "attack", "anomaly", "malicious", "yes"}


def is_binary_target(target: str | None) -> bool:
    return (target or "").strip().lower() == "label"


def display_class(target: str | None, value: Any) -> str:
    """Map a raw model class into the name shown in the UI/reports."""
    if value is None:
        return ""
    if is_binary_target(target):
        text = str(value).strip().lower()
        if text in _BINARY_TRUTHY:
            return BINARY_POSITIVE_LABEL
        if text in {"0", "0.0", "false", "normal", "benign", "no"}:
            return BINARY_NEGATIVE_LABEL
        # Numeric classes other than 0/1 are still meaningful.
        return str(value)
    return str(value).strip()


def display_classes(target: str | None, classes: Sequence[Any]) -> list[str]:
    return [display_class(target, value) for value in classes]


def is_attack_label(target: str | None, value: Any) -> bool:
    if is_binary_target(target):
        return display_class(target, value) == BINARY_POSITIVE_LABEL
    return display_class(target, value).strip().lower() not in {"normal", ""}


def positive_class_index(target: str | None, classes: Sequence[Any]) -> int:
    """Index of the attack/positive class inside ``classes`` (binary target only)."""
    for position, value in enumerate(classes):
        if is_attack_label(target, value):
            return position
    return len(classes) - 1 if classes else 0
