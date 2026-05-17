// Demostración de Jasmine Spies con estilo Given / When / Then
// Dominio Rently: notificaciones al resolver un reclamo

function resolveClaimAndNotify(claim, ownerId, onResolved) {
  if (!claim) throw new Error('Reclamo no encontrado');
  if (claim.ownerId !== ownerId) throw new Error('No autorizado');
  if (claim.status === 'RESOLVED') throw new Error('El reclamo ya está resuelto');

  const resolved = { ...claim, status: 'RESOLVED', resolvedAt: new Date() };
  onResolved(resolved);
  return resolved;
}

// ── jasmine.createSpy() ────────────────────────────────────────────────────

describe('resolveClaimAndNotify', () => {

  describe('Given un reclamo OPEN y el propietario correcto', () => {
    let notifySpy;
    let claim;

    beforeEach(() => {
      notifySpy = jasmine.createSpy('onResolved');
      claim = { id: 'c-1', status: 'OPEN', ownerId: 'owner-1', title: 'Fuga de agua' };
    });

    describe('When se resuelve el reclamo', () => {
      it('Then invoca el callback exactamente una vez', () => {
        resolveClaimAndNotify(claim, 'owner-1', notifySpy);
        expect(notifySpy).toHaveBeenCalledTimes(1);
      });

      it('Then el callback recibe el reclamo con estado RESOLVED', () => {
        resolveClaimAndNotify(claim, 'owner-1', notifySpy);
        expect(notifySpy).toHaveBeenCalledWith(
          jasmine.objectContaining({ id: 'c-1', status: 'RESOLVED' })
        );
      });

      it('Then retorna el reclamo resuelto', () => {
        const result = resolveClaimAndNotify(claim, 'owner-1', notifySpy);
        expect(result.status).toBe('RESOLVED');
      });
    });
  });

  describe('Given un reclamo ya RESOLVED', () => {
    let notifySpy;

    beforeEach(() => {
      notifySpy = jasmine.createSpy('onResolved');
    });

    describe('When se intenta resolver nuevamente', () => {
      it('Then lanza un error y NO invoca el callback', () => {
        const claim = { id: 'c-2', status: 'RESOLVED', ownerId: 'owner-1' };
        expect(() => resolveClaimAndNotify(claim, 'owner-1', notifySpy)).toThrowError(
          'El reclamo ya está resuelto'
        );
        expect(notifySpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('Given un usuario que NO es el propietario', () => {
    let notifySpy;

    beforeEach(() => {
      notifySpy = jasmine.createSpy('onResolved');
    });

    describe('When intenta resolver el reclamo', () => {
      it('Then lanza un error y NO invoca el callback', () => {
        const claim = { id: 'c-3', status: 'OPEN', ownerId: 'owner-1' };
        expect(() => resolveClaimAndNotify(claim, 'intruso', notifySpy)).toThrowError(
          'No autorizado'
        );
        expect(notifySpy).not.toHaveBeenCalled();
      });
    });
  });
});

// ── spyOn() sobre objeto existente ────────────────────────────────────────

const emailService = {
  send: (to, subject) => `enviado a ${to}: ${subject}`,
};

describe('spyOn - rastreo de métodos en objetos existentes', () => {

  describe('Given el servicio de emails de Rently', () => {

    describe('When se usa spyOn con .and.returnValue()', () => {
      it('Then intercepta la llamada y devuelve el valor simulado', () => {
        spyOn(emailService, 'send').and.returnValue('mock-ok');
        const result = emailService.send('inquilino@gmail.com', 'Nuevo reclamo');
        expect(emailService.send).toHaveBeenCalledWith('inquilino@gmail.com', 'Nuevo reclamo');
        expect(result).toBe('mock-ok');
      });
    });

    describe('When se usa spyOn con .and.callThrough()', () => {
      it('Then registra la llamada pero ejecuta la implementación real', () => {
        spyOn(emailService, 'send').and.callThrough();
        const result = emailService.send('owner@gmail.com', 'Reclamo resuelto');
        expect(emailService.send).toHaveBeenCalled();
        expect(result).toBe('enviado a owner@gmail.com: Reclamo resuelto');
      });
    });
  });
});
