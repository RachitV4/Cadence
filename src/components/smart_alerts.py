from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import date
from typing import Any


PRE_OVERDUE_WINDOW_DAYS = 3
PAYMENT_DELAY_RISK_THRESHOLD_DAYS = 3

PAID_STATUSES = {
    "paid",
    "settled",
    "completed",
}

PENDING_MILESTONE_STATUSES = {
    "pending",
    "incomplete",
    "not approved",
    "not accepted",
    "delayed",
}


@dataclass(frozen=True)
class Alert:
    alert_type: str
    severity: str
    title: str
    message: str
    recommended_action: str
    client_id: str
    invoice_id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def _normalise(value: Any) -> str:
    return "" if value is None else str(value).strip().lower()


def _parse_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError:
            return None

    return None


def _is_paid(invoice: dict[str, Any]) -> bool:
    return _normalise(invoice.get("status")) in PAID_STATUSES


def _is_milestone_dependent(contract: dict[str, Any]) -> bool:
    condition = _normalise(contract.get("payment_condition"))

    return (
        "milestone" in condition
        or "acceptance" in condition
    )


def _is_milestone_pending(contract: dict[str, Any]) -> bool:
    status = _normalise(contract.get("milestone_status"))
    return status in PENDING_MILESTONE_STATUSES


def _payment_risk_alert(
    invoice: dict[str, Any],
    client_history: dict[str, Any],
    current_date: date,
) -> Alert | None:
    due_date = _parse_date(invoice.get("due_date"))

    if due_date is None:
        return None

    try:
        average_delay = float(
            client_history.get(
                "average_payment_delay_days",
                0,
            )
        )
    except (TypeError, ValueError):
        return None

    days_until_due = (due_date - current_date).days

    if days_until_due < 0:
        return None

    if days_until_due > PRE_OVERDUE_WINDOW_DAYS:
        return None

    if average_delay < PAYMENT_DELAY_RISK_THRESHOLD_DAYS:
        return None

    client_id = str(invoice.get("client_id", ""))
    invoice_id = str(invoice.get("id", ""))

    if days_until_due == 0:
        timing = "The invoice is due today."
    elif days_until_due == 1:
        timing = "The invoice is due tomorrow."
    else:
        timing = f"The invoice is due in {days_until_due} days."

    return Alert(
        alert_type="payment_risk",
        severity="medium",
        title="Payment risk detected",
        message=(
            f"This client typically pays {average_delay:g} days late. "
            f"{timing}"
        ),
        recommended_action=(
            "Consider sending a friendly pre-emptive payment check-in."
        ),
        client_id=client_id,
        invoice_id=invoice_id,
    )


def _milestone_dependency_alert(
    invoice: dict[str, Any],
    contract: dict[str, Any],
) -> Alert | None:
    if not _is_milestone_dependent(contract):
        return None

    if not _is_milestone_pending(contract):
        return None

    client_id = str(invoice.get("client_id", ""))
    invoice_id = str(invoice.get("id", ""))

    return Alert(
        alert_type="milestone_dependency",
        severity="high",
        title="Payment may be delayed",
        message=(
            "Payment depends on milestone approval, "
            "but the required milestone is still pending."
        ),
        recommended_action=(
            "Check the milestone status before escalating the invoice."
        ),
        client_id=client_id,
        invoice_id=invoice_id,
    )


def generate_smart_alerts(
    invoice: dict[str, Any],
    client_history: dict[str, Any],
    contract: dict[str, Any],
    current_date: date | None = None,
) -> list[Alert]:
    """
    Generate proactive alerts for an invoice.

    Required invoice fields:
        id
        client_id
        due_date
        status

    Required client history:
        average_payment_delay_days

    Relevant contract fields:
        payment_condition
        milestone_status
    """
    current_date = current_date or date.today()

    if _is_paid(invoice):
        return []

    alerts: list[Alert] = []

    payment_risk = _payment_risk_alert(
        invoice=invoice,
        client_history=client_history,
        current_date=current_date,
    )

    if payment_risk:
        alerts.append(payment_risk)

    milestone_alert = _milestone_dependency_alert(
        invoice=invoice,
        contract=contract,
    )

    if milestone_alert:
        alerts.append(milestone_alert)

    return alerts