// @ts-check
import { AppError } from '../dist/lib/AppError.js';

describe('AppError usage in property scenarios', () => {
  it('creates a 404 AppError for property not found', () => {
    const err = new AppError('Propiedad no encontrada', 404);
    expect(err.status).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Propiedad no encontrada');
  });

  it('creates a 403 AppError for unauthorized access', () => {
    const err = new AppError('No tienes permisos para acceder a esta propiedad', 403);
    expect(err.status).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });
});
