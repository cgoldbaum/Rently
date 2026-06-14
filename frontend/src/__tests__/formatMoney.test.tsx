import { formatMoney } from '@rently/shared';

describe('formatMoney (shared integration)', () => {
  it('formats ARS amount', () => {
    const result = formatMoney(1500, 'ARS');
    expect(result).toContain('$');
    expect(result).toContain('1');
  });

  it('formats USD amount', () => {
    const result = formatMoney(1500, 'USD');
    expect(result).toContain('US$');
  });

  it('handles zero', () => {
    const result = formatMoney(0);
    expect(result).toContain('0');
  });

  it('rounds decimal amounts', () => {
    const result = formatMoney(99.99, 'USD');
    expect(result).not.toContain('.');
  });
});
