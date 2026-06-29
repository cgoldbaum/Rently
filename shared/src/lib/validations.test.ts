import { describe, it, expect } from 'vitest';
import { propertySchema, contractSchema, tenantSchema, paymentSchema, loginSchema, registerSchema, claimSchema, getFieldErrors } from './validations';

describe('propertySchema', () => {
  it('validates a correct property', () => {
    const result = propertySchema.safeParse({
      name: 'Depto 3A',
      address: 'Thames 1842, CABA',
      country: 'AR',
      type: 'APARTMENT',
      surface: 58,
      antiquity: 10,
      description: 'Un lindo departamento',
    });
    expect(result.success).toBe(true);
  });

  it('accepts the GARAGE (cochera) and DUPLEX property types', () => {
    for (const type of ['GARAGE', 'DUPLEX'] as const) {
      const result = propertySchema.safeParse({
        name: 'Cochera 12',
        address: 'Thames 1842, CABA',
        country: 'AR',
        type,
        surface: 20,
        description: '',
      });
      expect(result.success).toBe(true);
    }
  });

  it('rejects an unknown property type', () => {
    const result = propertySchema.safeParse({
      name: 'Algo',
      address: 'Thames 1842, CABA',
      country: 'AR',
      type: 'CASTLE',
      surface: 20,
      description: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects surface over 99,999', () => {
    const result = propertySchema.safeParse({
      address: 'Thames 1842, CABA',
      country: 'AR',
      type: 'APARTMENT',
      surface: 100000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects address shorter than 5 chars', () => {
    const result = propertySchema.safeParse({
      address: 'Abc',
      country: 'AR',
      type: 'APARTMENT',
      surface: 50,
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid country', () => {
    const result = propertySchema.safeParse({
      address: 'Thames 1842',
      country: 'XX',
      type: 'APARTMENT',
      surface: 50,
    });
    expect(result.success).toBe(false);
  });

  it('allows optional antiquity', () => {
    const result = propertySchema.safeParse({
      name: 'Depto Test',
      address: 'Thames 1842, CABA',
      country: 'AR',
      type: 'APARTMENT',
      surface: 50,
      description: 'Un depto céntrico',
    });
    expect(result.success).toBe(true);
  });

  it('rejects name over 80 chars', () => {
    const result = propertySchema.safeParse({
      name: 'A'.repeat(81),
      address: 'Thames 1842, CABA',
      country: 'AR',
      type: 'APARTMENT',
      surface: 50,
    });
    expect(result.success).toBe(false);
  });
});

describe('contractSchema', () => {
  const validContract = {
    startDate: '2026-01-01',
    endDate: '2027-01-01',
    initialAmount: 500,
    currency: 'USD',
    paymentDay: 15,
    indexType: 'IPC',
    adjustFrequency: 3,
  };

  it('validates a correct contract', () => {
    const result = contractSchema.safeParse(validContract);
    expect(result.success).toBe(true);
  });

  it('rejects end date before start date', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      startDate: '2027-01-01',
      endDate: '2026-01-01',
    });
    expect(result.success).toBe(false);
  });

  it('rejects paymentDay over 28', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      paymentDay: 31,
    });
    expect(result.success).toBe(false);
  });

  it('rejects paymentDay under 1', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      paymentDay: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects initialAmount over 999,999,999', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      initialAmount: 1_000_000_000,
    });
    expect(result.success).toBe(false);
  });

  it('rejects adjustFrequency over 24', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      adjustFrequency: 25,
    });
    expect(result.success).toBe(false);
  });

  it('allows MANUAL indexType with no adjustFrequency', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      indexType: 'MANUAL',
      adjustFrequency: undefined,
    });
    expect(result.success).toBe(true);
  });

  it('requires contract to last at least 1 month', () => {
    const result = contractSchema.safeParse({
      ...validContract,
      startDate: '2026-06-15',
      endDate: '2026-06-20',
    });
    expect(result.success).toBe(false);
  });
});

describe('tenantSchema', () => {
  it('validates a correct tenant', () => {
    const result = tenantSchema.safeParse({
      name: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      phone: '+54 11 1234-5678',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short name', () => {
    const result = tenantSchema.safeParse({
      name: 'Ab',
      email: 'juan@ejemplo.com',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = tenantSchema.safeParse({
      name: 'Juan Pérez',
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });
});

describe('paymentSchema', () => {
  it('validates a correct payment', () => {
    const result = paymentSchema.safeParse({
      period: '2026-06',
      amount: 500,
      currency: 'USD',
      dueDate: '2026-06-15',
      method: 'Transferencia',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid period format', () => {
    const result = paymentSchema.safeParse({
      period: '2026-13',
      amount: 500,
      currency: 'USD',
      dueDate: '2026-06-15',
      method: 'Transferencia',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative amount', () => {
    const result = paymentSchema.safeParse({
      period: '2026-06',
      amount: -1,
      currency: 'USD',
      dueDate: '2026-06-15',
      method: 'Transferencia',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('validates correct login data', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'mypassword',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({
      password: 'mypassword',
    });
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  it('validates correct registration', () => {
    const result = registerSchema.safeParse({
      name: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      password: 'Secure1A',
      confirmPassword: 'Secure1A',
    });
    expect(result.success).toBe(true);
  });

  it('rejects mismatched passwords', () => {
    const result = registerSchema.safeParse({
      name: 'Juan Pérez',
      email: 'juan@ejemplo.com',
      password: 'Secure1A',
      confirmPassword: 'Different1A',
    });
    expect(result.success).toBe(false);
  });
});

describe('claimSchema', () => {
  it('validates a correct claim', () => {
    const result = claimSchema.safeParse({
      title: 'La canilla pierde agua',
      description: 'La canilla del baño principal pierde agua desde hace una semana.',
      priority: 'HIGH',
    });
    expect(result.success).toBe(true);
  });

  it('rejects short title', () => {
    const result = claimSchema.safeParse({
      title: 'ABC',
      description: 'Descripción con al menos 10 caracteres.',
    });
    expect(result.success).toBe(false);
  });

  it('rejects short description', () => {
    const result = claimSchema.safeParse({
      title: 'Título válido para reclamo',
      description: 'Corto',
    });
    expect(result.success).toBe(false);
  });
});

describe('getFieldErrors', () => {
  it('extracts field errors from ZodError', () => {
    const result = propertySchema.safeParse({
      address: '',
      country: 'AR',
      type: 'APARTMENT',
      surface: -1,
    });
    if (!result.success) {
      const errors = getFieldErrors(result.error);
      expect(Object.keys(errors).length).toBeGreaterThan(0);
      expect(errors.address).toBeDefined();
    }
  });
});
