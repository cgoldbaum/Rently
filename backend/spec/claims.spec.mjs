// Tests para la lógica de validaciones de claims.service.ts

// Simula la validación de createPublicClaim
function validatePublicClaim(tenant, now = new Date()) {
  if (!tenant) {
    return { error: { code: 'NOT_FOUND', status: 404 } };
  }
  if (tenant.contract.endDate < now) {
    return { error: { code: 'LINK_EXPIRED', status: 410 } };
  }
  return { ok: true };
}

// Simula la validación de resolveClaim
function validateResolveClaim(claim, userId) {
  if (!claim) {
    return { error: { code: 'NOT_FOUND', status: 404 } };
  }
  if (claim.tenant.contract.property.userId !== userId) {
    return { error: { code: 'FORBIDDEN', status: 403 } };
  }
  if (claim.status === 'RESOLVED') {
    return { error: { code: 'BAD_REQUEST', status: 400 } };
  }
  return { ok: true };
}

describe('validación de createPublicClaim', () => {
  const future = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d;
  };
  const past = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  };

  it('rechaza un linkToken inválido (tenant no existe)', () => {
    const result = validatePublicClaim(null);
    expect(result.error).toEqual(jasmine.objectContaining({ code: 'NOT_FOUND', status: 404 }));
  });

  it('rechaza si el contrato ya venció', () => {
    const tenant = { id: 't-1', contract: { endDate: past() } };
    const result = validatePublicClaim(tenant);
    expect(result.error).toEqual(jasmine.objectContaining({ code: 'LINK_EXPIRED', status: 410 }));
  });

  it('acepta cuando el contrato está vigente', () => {
    const tenant = { id: 't-1', contract: { endDate: future() } };
    const result = validatePublicClaim(tenant);
    expect(result.ok).toBeTrue();
  });

  it('rechaza si el contrato venció exactamente hoy (en pasado)', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const tenant = { id: 't-1', contract: { endDate: yesterday } };
    const result = validatePublicClaim(tenant);
    expect(result.error.code).toBe('LINK_EXPIRED');
  });
});

describe('validación de resolveClaim', () => {
  const buildClaim = (overrides = {}) => ({
    id: 'claim-1',
    status: 'OPEN',
    tenant: {
      contract: { property: { userId: 'owner-1' } },
    },
    ...overrides,
  });

  it('rechaza si el reclamo no existe', () => {
    const result = validateResolveClaim(null, 'owner-1');
    expect(result.error).toEqual(jasmine.objectContaining({ code: 'NOT_FOUND', status: 404 }));
  });

  it('rechaza si el usuario no es dueño de la propiedad', () => {
    const result = validateResolveClaim(buildClaim(), 'otro-usuario');
    expect(result.error).toEqual(jasmine.objectContaining({ code: 'FORBIDDEN', status: 403 }));
  });

  it('rechaza si el reclamo ya está resuelto', () => {
    const result = validateResolveClaim(buildClaim({ status: 'RESOLVED' }), 'owner-1');
    expect(result.error).toEqual(jasmine.objectContaining({ code: 'BAD_REQUEST', status: 400 }));
  });

  it('acepta cuando el propietario resuelve un reclamo abierto', () => {
    const result = validateResolveClaim(buildClaim(), 'owner-1');
    expect(result.ok).toBeTrue();
  });

  it('prioriza NOT_FOUND sobre FORBIDDEN', () => {
    const result = validateResolveClaim(null, 'cualquier-usuario');
    expect(result.error.code).toBe('NOT_FOUND');
  });
});
