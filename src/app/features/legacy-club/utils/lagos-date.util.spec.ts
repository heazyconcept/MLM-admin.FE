import { describe, expect, it } from 'vitest';
import {
  formatLagosYmd,
  lagosMonthRangeYmd,
  lagosWeekRangeYmd,
} from './lagos-date.util';

describe('lagos-date.util', () => {
  it('formats YYYY-MM-DD in Africa/Lagos', () => {
    const instant = new Date('2026-12-01T23:30:00.000Z');
    const ymd = formatLagosYmd(instant);
    expect(ymd).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns month range from first of month through today', () => {
    const now = new Date('2026-12-15T12:00:00.000Z');
    const { from, to } = lagosMonthRangeYmd(now);
    expect(from.endsWith('-01')).toBe(true);
    expect(from.slice(0, 7)).toBe(to.slice(0, 7));
    expect(from <= to).toBe(true);
  });

  it('returns week range starting Monday through today', () => {
    const wednesday = new Date('2026-12-16T12:00:00.000Z');
    const { from, to } = lagosWeekRangeYmd(wednesday);
    expect(from <= to).toBe(true);
    const fromDay = new Date(`${from}T12:00:00.000Z`).getUTCDay();
    expect([1, 2, 3, 4, 5, 6, 0]).toContain(fromDay);
  });
});