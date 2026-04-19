import { differenceInDays, format, isPast } from 'date-fns';
import { getT } from '../../i18n';

export function formatDate(timestamp: number): string {
  // yyyy/MM/dd is universally readable across all supported languages
  return format(new Date(timestamp), 'yyyy/MM/dd');
}

export function daysUntilExpiry(expiryTimestamp: number): number {
  return differenceInDays(new Date(expiryTimestamp), new Date());
}

export function isExpired(expiryTimestamp: number): boolean {
  return isPast(new Date(expiryTimestamp));
}

export function getExpiryStatus(expiryTimestamp: number | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiryTimestamp) return 'none';
  const days = daysUntilExpiry(expiryTimestamp);
  if (days < 0) return 'expired';
  if (days <= 7) return 'soon';
  return 'ok';
}

export function getExpiryLabel(expiryTimestamp: number | null): string {
  const t = getT();
  if (!expiryTimestamp) return t('expiry.noExpiry');
  const days = daysUntilExpiry(expiryTimestamp);
  if (days < 0) return t('expiry.expired', { days: Math.abs(days) });
  if (days === 0) return t('expiry.today');
  if (days === 1) return t('expiry.tomorrow');
  if (days <= 7) return t('expiry.soon', { days });
  return t('expiry.date', { date: formatDate(expiryTimestamp) });
}
