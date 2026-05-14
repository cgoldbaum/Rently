// Tests para computeStatus de properties.service.ts
// La función determina el estado de una propiedad basándose en su contrato.

function computeStatus(contract) {
  if (!contract || !contract.tenant) return 'VACANT';
  const now = new Date();
  if (contract.endDate < now) return 'VACANT';
  const daysUntilEnd = (contract.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilEnd <= 30) return 'EXPIRING_SOON';
  return 'OCCUPIED';
}

const future = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};
const past = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

describe('computeStatus', () => {
  describe('sin contrato o sin inquilino', () => {
    it('retorna VACANT cuando el contrato es null', () => {
      expect(computeStatus(null)).toBe('VACANT');
    });

    it('retorna VACANT cuando el contrato no tiene inquilino', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(60), tenant: null })).toBe('VACANT');
    });

    it('retorna VACANT cuando tenant es undefined', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(60) })).toBe('VACANT');
    });
  });

  describe('contrato vencido', () => {
    it('retorna VACANT cuando el contrato expiró ayer', () => {
      expect(computeStatus({ startDate: past(120), endDate: past(1), tenant: {} })).toBe('VACANT');
    });

    it('retorna VACANT aunque haya inquilino si el contrato expiró', () => {
      expect(computeStatus({ startDate: past(365), endDate: past(30), tenant: { name: 'Juan' } })).toBe('VACANT');
    });
  });

  describe('contrato por vencer', () => {
    it('retorna EXPIRING_SOON cuando quedan menos de 30 días', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(15), tenant: {} })).toBe('EXPIRING_SOON');
    });

    it('retorna EXPIRING_SOON cuando quedan exactamente 30 días', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(30), tenant: {} })).toBe('EXPIRING_SOON');
    });

    it('retorna EXPIRING_SOON cuando queda 1 día', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(1), tenant: {} })).toBe('EXPIRING_SOON');
    });
  });

  describe('contrato vigente', () => {
    it('retorna OCCUPIED cuando quedan más de 30 días', () => {
      expect(computeStatus({ startDate: past(60), endDate: future(31), tenant: {} })).toBe('OCCUPIED');
    });

    it('retorna OCCUPIED cuando quedan 6 meses', () => {
      expect(computeStatus({ startDate: past(30), endDate: future(180), tenant: {} })).toBe('OCCUPIED');
    });
  });
});
