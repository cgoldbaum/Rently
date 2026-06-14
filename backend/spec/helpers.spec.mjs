// @ts-check
import { currencySymbol, addMonths, getAppUrl } from '../dist/lib/helpers.js';

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

  it('always returns day 1 of the month', () => {
    const d = new Date(2026, 5, 15);
    const result = addMonths(d, 1);
    expect(result.getDate()).toBe(1);
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

describe('helpers.getAppUrl', () => {
  it('returns a URL string', () => {
    const url = getAppUrl();
    expect(typeof url).toBe('string');
    expect(url.length).toBeGreaterThan(0);
  });
});
