import { BillType, isBillType } from '@/types/api';

/** Returns the parsed bill type, or `null` when the raw value is unknown. */
export function findBillType(value: string | undefined | null): BillType | null {
  return isBillType(value) ? value : null;
}

/**
 * Parses a user typed amount ("1 250,50", "1250.5") into a finite number with
 * two decimals. Returns `null` for empty / non numeric / non positive input so
 * callers can surface a validation message instead of `NaN`.
 */
export function parseAmount(raw: string): number | null {
  const normalised = raw.trim().replace(/\s/g, '').replace(/,/g, '.');
  if (normalised.length === 0) return null;

  const value = Number(normalised);
  if (!Number.isFinite(value) || value <= 0) return null;

  return Math.round(value * 100) / 100;
}

/** Rounds a decimal amount to 2 digits, keeping the value finite. */
export function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100) / 100;
}

/** Coerces unknown API values into a finite number. */
export function toFiniteNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function clampLimit(raw: unknown, fallback = 10, max = 100): number {
  const parsed = toFiniteNumber(raw, fallback);
  const integer = Math.trunc(parsed);
  if (integer <= 0) return fallback;
  return Math.min(integer, max);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function toOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}