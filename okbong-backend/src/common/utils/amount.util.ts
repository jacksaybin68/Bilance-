/** Rounds a monetary value to 2 decimals (guards against float drift). */
export function roundAmount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
