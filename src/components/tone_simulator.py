from dataclasses import asdict, dataclass
from typing import Any


MIN_TONE = 0
MAX_TONE = 100

TONE_ANCHORS = {
    0: "Warm & Humble",
    25: "Friendly",
    50: "Professional",
    75: "Firm",
    100: "Strict & Formal",
}

TONE_CHARACTERISTICS = {
    "Warm & Humble": ("warm", "humble", "empathetic", "low pressure"),
    "Friendly": ("friendly", "approachable", "polite", "lightly assertive"),
    "Professional": ("professional", "clear", "neutral", "balanced"),
    "Firm": ("firm", "direct", "assertive", "clear expectations"),
    "Strict & Formal": (
        "formal",
        "strict",
        "highly direct",
        "explicit expectations",
    ),
}


@dataclass
class ClientHistory:
    average_payment_delay_days: float = 0
    missed_payment_promises: int = 0
    invoices_paid_on_time: int = 0
    total_invoices: int = 0


@dataclass
class ToneRecommendation:
    tone_level: int
    tone_label: str
    reason: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class ToneSimulationResult:
    tone_level: int
    tone_label: str
    recommended_tone_level: int
    recommended_tone_label: str
    prompt: str
    preserved_facts: list[str]
    user_overridden: bool

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def validate_tone_level(value: int | float) -> int:
    try:
        level = round(float(value))
    except (TypeError, ValueError) as exc:
        raise ValueError("Tone level must be between 0 and 100.") from exc

    if not MIN_TONE <= level <= MAX_TONE:
        raise ValueError("Tone level must be between 0 and 100.")

    return level


def get_tone_label(level: int | float) -> str:
    level = validate_tone_level(level)
    anchors = sorted(TONE_ANCHORS)
    nearest = min(anchors, key=lambda anchor: abs(anchor - level))
    return TONE_ANCHORS[nearest]


def get_tone_position(level: int | float) -> str:
    level = validate_tone_level(level)
    anchors = sorted(TONE_ANCHORS)

    if level in TONE_ANCHORS:
        return TONE_ANCHORS[level]

    for left, right in zip(anchors, anchors[1:]):
        if left < level < right:
            return (
                f"Between {TONE_ANCHORS[left]} "
                f"and {TONE_ANCHORS[right]}"
            )

    return TONE_ANCHORS[100]


def recommend_tone(history: ClientHistory) -> ToneRecommendation:
    if history.missed_payment_promises >= 3:
        level = 90
        reason = "The client has repeatedly missed payment promises."

    elif history.missed_payment_promises >= 1:
        level = 80
        reason = "The client has missed a payment promise."

    elif history.average_payment_delay_days >= 7:
        level = 65
        reason = "The client has a history of frequent late payments."

    elif history.average_payment_delay_days >= 3:
        level = 45
        reason = "The client usually pays a few days late."

    elif (
        history.total_invoices > 0
        and history.invoices_paid_on_time / history.total_invoices >= 0.8
    ):
        level = 30
        reason = "The client has a strong history of paying on time."

    else:
        level = 50
        reason = "There is not enough history to justify a different tone."

    return ToneRecommendation(
        tone_level=level,
        tone_label=get_tone_label(level),
        reason=reason,
    )


def clean_facts(facts: list[str] | None) -> list[str]:
    if not facts:
        return []

    result = []

    for fact in facts:
        if not isinstance(fact, str):
            continue

        fact = fact.strip()

        if fact and fact not in result:
            result.append(fact)

    return result


def build_tone_instruction(level: int | float) -> str:
    level = validate_tone_level(level)
    label = get_tone_label(level)
    position = get_tone_position(level)
    characteristics = ", ".join(TONE_CHARACTERISTICS[label])

    return (
        f"Tone level: {level}/100. "
        f"Position: {position}. "
        f"Characteristics: {characteristics}."
    )


def build_generation_prompt(
    email: str,
    tone_level: int | float,
    preserved_facts: list[str] | None = None,
    allow_subject_change: bool = True,
    allow_signoff_change: bool = True,
) -> str:
    if not email.strip():
        raise ValueError("Email cannot be empty.")

    facts = clean_facts(preserved_facts)
    fact_text = "\n".join(f"- {fact}" for fact in facts) or "- None provided."

    subject_rule = (
        "The subject may change with the tone, but keep invoice numbers "
        "and other factual identifiers unchanged."
        if allow_subject_change
        else "Keep the subject unchanged."
    )

    signoff_rule = (
        "The sign-off may change to suit the tone."
        if allow_signoff_change
        else "Keep the sign-off unchanged."
    )

    return f"""
Rewrite the following accounts-receivable email at the requested tone.

{build_tone_instruction(tone_level)}

Rules:
- Preserve all facts exactly.
- Do not invent dates, amounts, promises, disputes, deadlines, or payment status.
- Do not change invoice numbers or other identifiers.
- Do not change the requested commercial action.
- Change only communication style, assertiveness, wording, and urgency.
- Never use threats, insults, manipulation, or unsupported claims.
- {subject_rule}
- {signoff_rule}

Facts that must remain unchanged:
{fact_text}

Original email:
---BEGIN---
{email.strip()}
---END---

Return the subject and body.
""".strip()


def simulate_tone(
    email: str,
    tone_level: int | float,
    client_history: ClientHistory | None = None,
    preserved_facts: list[str] | None = None,
    allow_signoff_change: bool = True,
) -> ToneSimulationResult:
    history = client_history or ClientHistory()
    level = validate_tone_level(tone_level)
    recommendation = recommend_tone(history)
    facts = clean_facts(preserved_facts)

    prompt = build_generation_prompt(
        email=email,
        tone_level=level,
        preserved_facts=facts,
        allow_subject_change=True,
        allow_signoff_change=allow_signoff_change,
    )

    return ToneSimulationResult(
        tone_level=level,
        tone_label=get_tone_label(level),
        recommended_tone_level=recommendation.tone_level,
        recommended_tone_label=recommendation.tone_label,
        prompt=prompt,
        preserved_facts=facts,
        user_overridden=level != recommendation.tone_level,
    )


def validate_output(
    facts: list[str],
    generated_text: str,
) -> dict[str, Any]:
    missing = [
        fact
        for fact in facts
        if fact.lower() not in generated_text.lower()
    ]

    return {
        "valid": not missing,
        "missing_facts": missing,
    }


def get_slider_metadata() -> list[dict[str, Any]]:
    return [
        {
            "level": level,
            "label": label,
        }
        for level, label in TONE_ANCHORS.items()
    ]