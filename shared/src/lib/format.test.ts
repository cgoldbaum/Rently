import { describe, it, expect } from 'vitest';
import { formatMoney, formatDate, formatDateShort, currencySymbol, addMonths, monthStart, getAppUrl, formatDateFull } from './format';

describe('currencySymbol', () => {
  it('returns $ for ARS', () => expect(currencySymbol('ARS')).toBe('$'));
  it('returns US$ for USD', () => expect(currencySymbol('USD')).toBe('US$'));
  it('returns the input for unknown currency', () => expect(currencySymbol('EUR')).toBe('EUR'));
});

describe('formatMoney', () => {
  it('formats ARS with $ prefix and thousands separator', () => {
    expect(formatMoney(1500, 'ARS')).toMatch(/^\$\s/);
    expect(formatMoney(1500, 'ARS')).toContain('1');
  });
  it('formats USD with US$ prefix', () => {
    expect(formatMoney(1500, 'USD')).toMatch(/^US\$/);
  });
  it('defaults to ARS currency', () => {
    expect(formatMoney(500)).toMatch(/^\$\s/);
  });
  it('handles zero', () => {
    expect(formatMoney(0)).toContain('0');
  });
  it('rounds to integer', () => {
    expect(formatMoney(99.9)).not.toContain('.');
  });
});

describe('formatDate', () => {
  it('formats a Date object correctly', () => {
    const result = formatDate(new Date(2026, 5, 14));
    expect(result).toContain('junio');
    expect(result).toContain('14');
    expect(result).toContain('2026');
  });
  it('formats an ISO string correctly', () => {
    const result = formatDate('2026-06-14T12:00:00Z');
    expect(result).toContain('14');
  });
  it('returns empty string for null', () => expect(formatDate(null)).toBe(''));
  it('returns empty string for undefined', () => expect(formatDate(undefined)).toBe(''));
  it('returns empty string for invalid date', () => expect(formatDate('not-a-date')).toBe(''));
});

describe('formatDateShort', () => {
  it('formats date as DD/MM/YYYY', () => {
    const d = new Date(2026, 5, 14);
    const result = formatDateShort(d);
    expect(result).toContain('14');
    expect(result).toContain('2026');
  });
  it('returns empty string for null', () => expect(formatDateShort(null)).toBe(''));
});

describe('addMonths', () => {
  it('adds months to a date', () => {
    const d = new Date(2026, 0, 15);
    const result = addMonths(d, 3);
    expect(result.getMonth()).toBe(3);
    expect(result.getDate()).toBe(1);
  });
  it('handles year wrap-around', () => {
    const d = new Date(2026, 10, 1);
    const result = addMonths(d, 3);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(1);
  });
  it('does not mutate the original date', () => {
    const d = new Date(2026, 0, 15);
    addMonths(d, 1);
    expect(d.getMonth()).toBe(0);
  });
});

describe('monthStart', () => {
  it('returns first day of the month', () => {
    const result = monthStart(new Date(2026, 5, 14));
    expect(result.getDate()).toBe(1);
    expect(result.getMonth()).toBe(5);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe('formatDateFull', () => {
  it('formats with weekday and timezone', () => {
    const result = formatDateFull('2026-06-14T12:00:00Z');
    expect(result).toContain('junio');
    expect(result).toContain('2026');
  });
  it('returns empty string for null', () => expect(formatDateFull(null)).toBe(''));
});
