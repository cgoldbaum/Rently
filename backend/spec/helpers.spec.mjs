// @ts-check
import { currencySymbol, addMonths, getAppUrl, periodKey } from '../dist/lib/helpers.js';

describe('helpers.currencySymbol', () => {
  it('returns $ for ARS', () => {
    expect(currencySymbol('ARS')).toBe('$');
  });

  it('returns US$ for USD', () => {
    expect(currencySymbol('USD')).toBe('US$');
  });

  it('returns the input string for unknown currency', () => {
    expect(currencySymbol('EUR')).toBe('EUR');
  });
});

describe('helpers.addMonths', () => {
  it('adds months within same year', () => {
    const d = new Date(2026, 0, 15);
    const result = addMonths(d, 3);
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2026);
  });

  it('handles year wrap-around', () => {
    const d = new Date(2026, 10, 1);
    const result = addMonths(d, 3);
    expect(result.getFullYear()).toBe(2027);
    expect(result.getMonth()).toBe(1);
  });

  it('preserves the day of month (anniversary)', () => {
    const d = new Date(2026, 5, 15);
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(6);
    expect(result.getDate()).toBe(15);
  });

  it('clamps to the last day when the target month is shorter', () => {
    const d = new Date(2026, 0, 31); // 31 ene
    const result = addMonths(d, 1);
    expect(result.getMonth()).toBe(1); // feb
    expect(result.getDate()).toBe(28); // 2026 no es bisiesto
  });

  it('preserves the time of day', () => {
    const d = new Date(2026, 0, 20, 14, 30, 45);
    const result = addMonths(d, 1);
    expect(result.getDate()).toBe(20);
    expect(result.getHours()).toBe(14);
    expect(result.getMinutes()).toBe(30);
    expect(result.getSeconds()).toBe(45);
  });

  it('does not mutate the original date', () => {
    const d = new Date(2026, 0, 15);
    const copy = new Date(d);
    addMonths(d, 1);
    expect(d.getTime()).toBe(copy.getTime());
  });

  it('handles negative months', () => {
    const d = new Date(2026, 5, 1);
    const result = addMonths(d, -3);
    expect(result.getMonth()).toBe(2);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe('helpers.periodKey', () => {
  it('formats as YYYY-MM with zero-padded month', () => {
    expect(periodKey(new Date(2026, 0, 15))).toBe('2026-01');
  });

  it('handles December (month index 11)', () => {
    expect(periodKey(new Date(2026, 11, 1))).toBe('2026-12');
  });

  it('does not zero-pad the year and pads single-digit months', () => {
    expect(periodKey(new Date(2026, 8, 9))).toBe('2026-09');
  });

  it('uses LOCAL components, so a local first-of-month at midnight stays in that month', () => {
    // Con `toISOString().slice(0,7)` en zonas UTC-3 (AR) esto caería en el mes
    // anterior. periodKey usa getMonth() local, así que debe quedar en junio.
    expect(periodKey(new Date(2026, 5, 1, 0, 30))).toBe('2026-06');
  });

  it('is stable across the day (ignores time of day)', () => {
    expect(periodKey(new Date(2026, 2, 20, 23, 59, 59))).toBe('2026-03');
  });
});

describe('helpers.getAppUrl', () => {
  it('returns a URL string', () => {
    const url = getAppUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
