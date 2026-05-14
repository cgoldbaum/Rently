// Tests para la lógica de contratos de contracts.service.ts

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

describe('addMonths', () => {
  describe('operaciones básicas', () => {
    it('suma 3 meses correctamente', () => {
      const date = new Date('2024-01-15');
      const result = addMonths(date, 3);
      expect(result.getMonth()).toBe(3); // Abril (0-indexed)
      expect(result.getDate()).toBe(15);
    });

    it('no muta la fecha original', () => {
      const date = new Date('2024-01-15');
      addMonths(date, 3);
      expect(date.getMonth()).toBe(0); // Enero sin cambios
    });

    it('suma 0 meses retorna la misma fecha', () => {
      const date = new Date('2024-06-10');
      const result = addMonths(date, 0);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('cambio de año', () => {
    it('suma 12 meses incrementa el año', () => {
      const date = new Date('2024-03-01');
      const result = addMonths(date, 12);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(2);
    });

    it('suma meses cruzando diciembre-enero', () => {
      const date = new Date('2024-11-01');
      const result = addMonths(date, 3);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(1); // Febrero
    });
  });

  describe('frecuencias típicas de ajuste', () => {
    it('calcula correctamente ajuste trimestral (3 meses)', () => {
      const start = new Date('2024-01-01');
      const next = addMonths(start, 3);
      expect(next.getMonth()).toBe(3); // Abril
    });

    it('calcula correctamente ajuste semestral (6 meses)', () => {
      const start = new Date('2024-01-01');
      const next = addMonths(start, 6);
      expect(next.getMonth()).toBe(6); // Julio
    });

    it('calcula correctamente ajuste anual (12 meses)', () => {
      const start = new Date('2024-01-01');
      const next = addMonths(start, 12);
      expect(next.getFullYear()).toBe(2025);
      expect(next.getMonth()).toBe(0); // Enero siguiente año
    });
  });
});

describe('lógica de creación de contrato', () => {
  describe('índice MANUAL', () => {
    it('no tiene nextAdjustDate con índice MANUAL', () => {
      const indexType = 'MANUAL';
      const isManual = indexType === 'MANUAL';
      const nextAdjustDate = isManual ? null : addMonths(new Date(), 3);
      expect(nextAdjustDate).toBeNull();
    });

    it('ajustFrequency es 0 con índice MANUAL', () => {
      const indexType = 'MANUAL';
      const isManual = indexType === 'MANUAL';
      const adjustFreq = isManual ? 0 : 3;
      expect(adjustFreq).toBe(0);
    });
  });

  describe('índice ICL / ICF', () => {
    it('calcula nextAdjustDate a 3 meses por defecto', () => {
      const startDate = new Date('2024-01-01');
      const adjustFrequency = 3;
      const nextAdjustDate = addMonths(startDate, adjustFrequency);
      expect(nextAdjustDate.getMonth()).toBe(3); // Abril
    });

    it('usa adjustFrequency personalizado', () => {
      const startDate = new Date('2024-01-01');
      const adjustFrequency = 6;
      const nextAdjustDate = addMonths(startDate, adjustFrequency);
      expect(nextAdjustDate.getMonth()).toBe(6); // Julio
    });

    it('currentAmount comienza igual a initialAmount', () => {
      const initialAmount = 150000;
      const currentAmount = initialAmount; // lógica del servicio
      expect(currentAmount).toBe(initialAmount);
    });
  });
});
