from dataclasses import asdict, dataclass
from datetime import date
from typing import Any


PENDING = "pending"
FULFILLED = "fulfilled"
MISSED = "missed"
CANCELLED = "cancelled"

VALID_STATUSES = {
    PENDING,
    FULFILLED,
    MISSED,
    CANCELLED,
}


@dataclass
class PaymentPromise:
    promise_id: str
    client_id: str
    invoice_id: str
    promised_date: date
    promised_amount: float | None = None
    status: str = PENDING
    source: str = "unknown"
    notes: str = ""
    created_at: date | None = None
    fulfilled_at: date | None = None
    missed_at: date | None = None

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)

        for field in (
            "promised_date",
            "created_at",
            "fulfilled_at",
            "missed_at",
        ):
            if data[field] is not None:
                data[field] = data[field].isoformat()

        return data


def parse_date(value: date | str) -> date:
    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                "Date must use YYYY-MM-DD format."
            ) from exc

    raise TypeError(
        "Date must be a datetime.date object or YYYY-MM-DD string."
    )


def validate_status(status: str) -> str:
    status = status.strip().lower()

    if status not in VALID_STATUSES:
        raise ValueError(
            f"Invalid payment promise status: {status}"
        )

    return status


def create_payment_promise(
    promise_id: str,
    client_id: str,
    invoice_id: str,
    promised_date: date | str,
    promised_amount: float | None = None,
    source: str = "unknown",
    notes: str = "",
    created_at: date | str | None = None,
) -> PaymentPromise:
    if not promise_id:
        raise ValueError("promise_id is required.")

    if not client_id:
        raise ValueError("client_id is required.")

    if not invoice_id:
        raise ValueError("invoice_id is required.")

    if promised_amount is not None and promised_amount < 0:
        raise ValueError("promised_amount cannot be negative.")

    parsed_promised_date = parse_date(promised_date)

    parsed_created_at = (
        parse_date(created_at)
        if created_at is not None
        else date.today()
    )

    if parsed_promised_date < parsed_created_at:
        raise ValueError(
            "promised_date cannot be earlier than created_at."
        )

    return PaymentPromise(
        promise_id=promise_id,
        client_id=client_id,
        invoice_id=invoice_id,
        promised_date=parsed_promised_date,
        promised_amount=promised_amount,
        status=PENDING,
        source=source,
        notes=notes,
        created_at=parsed_created_at,
    )


def is_active(promise: PaymentPromise) -> bool:
    return promise.status == PENDING


def is_terminal(promise: PaymentPromise) -> bool:
    return promise.status in {
        FULFILLED,
        MISSED,
        CANCELLED,
    }


def days_until_promise(
    promise: PaymentPromise,
    current_date: date | str,
) -> int:
    current_date = parse_date(current_date)
    return (promise.promised_date - current_date).days


def is_due_today(
    promise: PaymentPromise,
    current_date: date | str,
) -> bool:
    return days_until_promise(promise, current_date) == 0


def is_overdue(
    promise: PaymentPromise,
    current_date: date | str,
) -> bool:
    return days_until_promise(promise, current_date) < 0


def check_payment_promise(
    promise: PaymentPromise,
    current_date: date | str,
    payment_received: bool,
    payment_date: date | str | None = None,
) -> str:
    if promise.status == CANCELLED:
        return CANCELLED

    if payment_received:
        return FULFILLED

    if is_overdue(promise, current_date):
        return MISSED

    return PENDING


def update_payment_promise_status(
    promise: PaymentPromise,
    current_date: date | str,
    payment_received: bool,
    payment_date: date | str | None = None,
) -> PaymentPromise:
    current_date = parse_date(current_date)

    new_status = check_payment_promise(
        promise=promise,
        current_date=current_date,
        payment_received=payment_received,
        payment_date=payment_date,
    )

    if new_status == FULFILLED:
        promise.fulfilled_at = (
            parse_date(payment_date)
            if payment_date is not None
            else current_date
        )

    elif new_status == MISSED:
        promise.missed_at = current_date

    promise.status = new_status

    return promise


def cancel_payment_promise(
    promise: PaymentPromise,
    cancelled_on: date | str | None = None,
) -> PaymentPromise:
    if promise.status == FULFILLED:
        raise ValueError(
            "A fulfilled payment promise cannot be cancelled."
        )

    if promise.status == MISSED:
        raise ValueError(
            "A missed payment promise cannot be cancelled."
        )

    promise.status = CANCELLED

    return promise


def generate_follow_up(
    promise: PaymentPromise,
) -> dict[str, Any] | None:
    if promise.status != MISSED:
        return None

    return {
        "type": "missed_payment_promise",
        "severity": "high",
        "promise_id": promise.promise_id,
        "client_id": promise.client_id,
        "invoice_id": promise.invoice_id,
        "title": "Payment promise missed",
        "message": (
            f"The client promised payment by "
            f"{promise.promised_date.strftime('%d %b %Y')}, "
            "but no payment has been detected."
        ),
        "recommended_action": (
            "Follow up with the client regarding the missed payment."
        ),
    }


def generate_upcoming_reminder(
    promise: PaymentPromise,
    current_date: date | str,
    reminder_window_days: int = 1,
) -> dict[str, Any] | None:
    if promise.status != PENDING:
        return None

    if reminder_window_days < 0:
        raise ValueError(
            "reminder_window_days cannot be negative."
        )

    days_remaining = days_until_promise(
        promise,
        current_date,
    )

    if days_remaining > reminder_window_days:
        return None

    if days_remaining < 0:
        return None

    if days_remaining == 0:
        message = (
            "The client's promised payment date is today. "
            "Payment has not yet been detected."
        )
    else:
        message = (
            f"The client's promised payment is due in "
            f"{days_remaining} day(s)."
        )

    return {
        "type": "upcoming_payment_promise",
        "severity": "medium",
        "promise_id": promise.promise_id,
        "client_id": promise.client_id,
        "invoice_id": promise.invoice_id,
        "title": "Payment promise approaching",
        "message": message,
        "recommended_action": (
            "Monitor the invoice and be prepared to follow up "
            "if payment is not received."
        ),
    }


def track_payment_promise(
    promise: PaymentPromise,
    current_date: date | str,
    payment_received: bool,
    payment_date: date | str | None = None,
    reminder_window_days: int = 1,
) -> dict[str, Any]:
    update_payment_promise_status(
        promise=promise,
        current_date=current_date,
        payment_received=payment_received,
        payment_date=payment_date,
    )

    return {
        "promise": promise.to_dict(),
        "follow_up": generate_follow_up(promise),
        "upcoming_reminder": generate_upcoming_reminder(
            promise=promise,
            current_date=current_date,
            reminder_window_days=reminder_window_days,
        ),
    }