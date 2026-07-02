// @ts-check
import { createPropertySchema, updatePropertySchema } from '../dist/modules/properties/properties.schema.js';

describe('createPropertySchema (server-side)', () => {
  const valid = {
    address: 'Av. Libertador 1234',
    type: 'APARTMENT',
    surface: 55,
  };

  it('accepts a valid property without parentPropertyId', () => {
    const result = createPropertySchema.safeParse(valid);
    expect(result.success).toBeTrue();
  });

  it('accepts a GARAGE with a valid parentPropertyId (cuid)', () => {
    const result = createPropertySchema.safeParse({
      ...valid,
      type: 'GARAGE',
      surface: 12,
      parentPropertyId: 'cl9x8z1a20000pb08vqe4g8h1',
    });
    expect(result.success).toBeTrue();
  });

  it('accepts a parentPropertyId with a readable seed-style id (not a CUID)', () => {
    const result = createPropertySchema.safeParse({ ...valid, type: 'GARAGE', parentPropertyId: 'prop-demo-1' });
    expect(result.success).toBeTrue();
  });

  it('rejects an empty parentPropertyId', () => {
    const result = createPropertySchema.safeParse({ ...valid, parentPropertyId: '' });
    expect(result.success).toBeFalse();
  });

  it('allows explicit null parentPropertyId to unlink on update', () => {
    const result = updatePropertySchema.safeParse({ parentPropertyId: null });
    expect(result.success).toBeTrue();
  });

  it('allows partial update via updatePropertySchema without parentPropertyId', () => {
    const result = updatePropertySchema.safeParse({ name: 'Edificio Libertador' });
    expect(result.success).toBeTrue();
  });
});
