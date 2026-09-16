import type { Locale } from '@/lib/i18n/messages';

const INTL_LOCALES: Record<Locale, string> = { vi: 'vi-VN', en: 'en-US' };

export function toIntlLocale(locale: Locale): string {
  return INTL_LOCALES[locale] ?? 'vi-VN';
}

export function formatNumber(value: number, locale: Locale): string {
  if (!Number.isFinite(value)) return '0';
  return new Intl.NumberFormat(toIntlLocale(locale), {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatCurrency(value: number, locale: Locale, currency = 'BDSD'): string {
  return `${formatNumber(value, locale)} ${currency}`;
}

export function formatDateTime(
  value: string | number | Date | undefined | null,
  locale: Locale,
): string {
  if (value === undefined || value === null) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat(toIntlLocale(locale), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
