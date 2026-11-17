const LAGOS_TZ = 'Africa/Lagos';

/** Calendar date in Africa/Lagos as `YYYY-MM-DD` for API query params. */
export function formatLagosYmd(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: LAGOS_TZ });
}

export function lagosTodayYmd(now = new Date()): string {
  return formatLagosYmd(now);
}

function lagosWeekdayIndex(now: Date): number {
  const short = now.toLocaleDateString('en-US', {
    timeZone: LAGOS_TZ,
    weekday: 'short',
  });
  const map: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  return map[short] ?? 0;
}

function addDaysToYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return formatLagosYmd(utc);
}

/** Monday through today (inclusive), Lagos calendar. */
export function lagosWeekRangeYmd(now = new Date()): { from: string; to: string } {
  const to = lagosTodayYmd(now);
  const daysFromMonday = lagosWeekdayIndex(now);
  return { from: addDaysToYmd(to, -daysFromMonday), to };
}

/** First day of month through today (inclusive), Lagos calendar. */
export function lagosMonthRangeYmd(now = new Date()): { from: string; to: string } {
  const to = lagosTodayYmd(now);
  const [year, month] = to.split('-');
  return { from: `${year}-${month}-01`, to };
}

export function ymdToDate(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}