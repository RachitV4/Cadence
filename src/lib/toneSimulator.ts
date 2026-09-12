import type { ToneKey } from '@/types';

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
  return TONE_ANCHORS.reduce((nearest, anchor) =>
    Math.abs(anchor.level - normalized) < Math.abs(nearest.level - normalized) ? anchor : nearest,
  );
}

export function toneLevelFromKey(tone: ToneKey): number {
  return TONE_ANCHORS.find((anchor) => anchor.key === tone)?.level ?? 25;
}
