// @ts-check
import { createContractSchema } from '../dist/modules/contracts/contracts.schema.js';

describe('createContractSchema (server-side)', () => {
  const valid = {
    startDate: '2026-01-01T00:00:00.000Z',
    endDate: '2027-01-01T00:00:00.000Z',
    initialAmount: 500,
    paymentDay: 15,
    indexType: 'IPC',
    adjustFrequency: 3,
    currency: 'USD',
  };

  it('accepts a valid contract', () => {
    const result = createContractSchema.safeParse(valid);
    expect(result.success).toBeTrue();
  });

  it('rejects paymentDay > 28', () => {
    const result = createContractSchema.safeParse({ ...valid, paymentDay: 31 });
    expect(result.success).toBeFalse();
  });

  it('rejects paymentDay < 1', () => {
    const result = createContractSchema.safeParse({ ...valid, paymentDay: 0 });
    expect(result.success).toBeFalse();
  });

  it('rejects initialAmount > 999,999,999', () => {
    const result = createContractSchema.safeParse({ ...valid, initialAmount: 1_000_000_000 });
    expect(result.success).toBeFalse();
  });

  it('rejects adjustFrequency > 24', () => {
    const result = createContractSchema.safeParse({ ...valid, adjustFrequency: 25 });
    expect(result.success).toBeFalse();
  });

  it('rejects negative initialAmount', () => {
    const result = createContractSchema.safeParse({ ...valid, initialAmount: -1 });
    expect(result.success).toBeFalse();
  });

  it('rejects invalid indexType', () => {
    const result = createContractSchema.safeParse({ ...valid, indexType: 'INVALID' });
    expect(result.success).toBeFalse();
  });

  it('accepts all valid indexTypes', () => {
    for (const idx of ['IPC', 'ICL', 'MANUAL']) {
      const result = createContractSchema.safeParse({ ...valid, indexType: idx });
      expect(result.success).withContext(`indexType ${idx}`).toBeTrue();
    }
  });

  it('allows partial update via updateContractSchema', async () => {
    const { updateContractSchema } = await import('../dist/modules/contracts/contracts.schema.js');
    const result = updateContractSchema.safeParse({ paymentDay: 20 });
    expect(result.success).toBeTrue();
  });
});
