/** Caucus amounts are always NGN with two decimal places. */
export function formatCaucusNgn(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) {
    return '—';
  }
  return `₦${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatLagosDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) {
    return '—';
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return date.toLocaleString('en-GB', {
    timeZone: 'Africa/Lagos',
    ...(withTime
      ? { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      : { year: 'numeric', month: 'short', day: 'numeric' }),
  });
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function caucusMonthTitle(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-');
  const month = Number(monthStr);
  const year = Number(yearStr);
  if (!month || month < 1 || month > 12 || !year) {
    return monthKey;
  }
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export const CAUCUS_FIRST_MONTH = '2026-10';

/** Current calendar month in Africa/Lagos as `YYYY-MM`. */
export function lagosMonthKey(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  if (!year || !month) {
    return CAUCUS_FIRST_MONTH;
  }
  return `${year}-${month}`;
}

/** Selectable Caucus months from program start through current Lagos month (newest first). */
export function caucusSelectableMonthKeys(now = new Date()): string[] {
  const current = lagosMonthKey(now);
  const keys: string[] = [];
  let year = 2026;
  let month = 10;
  const [endYear, endMonth] = current.split('-').map(Number);
  while (year < endYear || (year === endYear && month <= endMonth)) {
    keys.push(`${year}-${String(month).padStart(2, '0')}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return keys.reverse();
}

export const CAUCUS_MONTH_STATUS_LABEL: Record<string, string> = {
  OPEN: 'Building',
  KEPT_ASIDE: 'Kept aside',
  PENDING_PAYOUT: 'Pending payout',
  PAID: 'Paid',
  ADDED_TO_NEXT: 'Added to the next month',
  NOT_PAYABLE: 'Not payable',
};

export const CAUCUS_EVENT_TYPE_LABEL: Record<string, string> = {
  ACTIVATED: 'Activated',
  DEACTIVATED: 'Deactivated',
  REINSTATED: 'Restored',
};
