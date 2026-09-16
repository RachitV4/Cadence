import type { ToneKey } from '@/types';

// Keep these levels aligned with the generate-email edge function. The UI stores
// the continuous 0–100 value while the AI prompt receives the nearest tone anchor.
export const TONE_ANCHORS = [
  { level: 0, key: 'humble' as ToneKey, label: 'Humble' },
  { level: 10, key: 'humble' as ToneKey, label: 'Gentle' },
  { level: 25, key: 'casual_friendly' as ToneKey, label: 'Casual / Friendly' },
  { level: 40, key: 'modest' as ToneKey, label: 'Modest' },
  { level: 50, key: 'formal' as ToneKey, label: 'Formal' },
  { level: 60, key: 'formal' as ToneKey, label: 'Professional' },
  { level: 75, key: 'strict' as ToneKey, label: 'Firm' },
  { level: 85, key: 'strict' as ToneKey, label: 'Direct' },
  { level: 90, key: 'strict' as ToneKey, label: 'Strict' },
  { level: 100, key: 'strict' as ToneKey, label: 'Strict & Formal' },
] as const;

export function normalizeToneLevel(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getToneAnchor(level: number) {
  const normalized = normalizeToneLevel(level);
  // Reduce a continuous slider value to a stable vocabulary understood by the AI.
  return TONE_ANCHORS.reduce((nearest, anchor) =>
    Math.abs(anchor.level - normalized) < Math.abs(nearest.level - normalized) ? anchor : nearest,
  );
}

export function toneLevelFromKey(tone: ToneKey): number {
  return TONE_ANCHORS.find((anchor) => anchor.key === tone)?.level ?? 25;
}

export function describeToneLevel(level: number): string {
  const normalized = normalizeToneLevel(level);
  if (normalized <= 10) return 'Patient and accommodating, with very little pressure.';
  if (normalized <= 30) return 'Warm and conversational while keeping the request clear.';
  if (normalized <= 45) return 'Measured and understated, with a calm factual request.';
  if (normalized <= 65) return 'Professional and structured, with clear dates and obligations.';
  if (normalized <= 85) return 'Firm and direct, while remaining constructive.';
  return 'Strict and formal, with explicit expectations and next steps.';
}

export function getTonePreview(level: number): string {
  const normalized = normalizeToneLevel(level);
  if (normalized <= 10) return 'When convenient, could you please share an update on payment?';
  if (normalized <= 30) return 'Just checking in—could you let us know when payment is expected?';
  if (normalized <= 45) return 'Please share an update on the expected payment date.';
  if (normalized <= 65) return 'Please confirm the payment date for this outstanding invoice.';
  if (normalized <= 85) return 'Please confirm payment by the stated deadline.';
  return 'Payment is overdue; please confirm immediate settlement or a firm payment date.';
}
