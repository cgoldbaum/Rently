// @ts-check
import { AppError } from '../dist/lib/AppError.js';

describe('AppError', () => {
  it('creates an error with status and message', () => {
    const err = new AppError('Test error', 400);
    expect(err.message).toBe('Test error');
    expect(err.status).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
  });

  it('throws and is catchable', () => {
    try {
      throw new AppError('Not found', 404);
    } catch (e) {
      expect(e instanceof AppError).toBeTrue();
      expect(e.status).toBe(404);
      expect(e.code).toBe('NOT_FOUND');
    }
  });

  it('defaults to 500 status and INTERNAL_ERROR', () => {
    const err = new AppError('Server error');
    expect(err.status).toBe(500);
    expect(err.code).toBe('INTERNAL_ERROR');
  });

  it('accepts a custom code', () => {
    const err = new AppError('Custom', 400, 'MY_CUSTOM_CODE');
    expect(err.code).toBe('MY_CUSTOM_CODE');
  });

  it('accepts details object', () => {
    const details = { field: 'email', reason: 'already exists' };
    const err = new AppError('Conflict', 409, 'DUPLICATE', details);
    expect(err.details).toEqual(details);
  });

  it('extends Error so instanceof Error works', () => {
    const err = new AppError('Test', 500);
    expect(err instanceof Error).toBeTrue();
  });

  it('has a name property of AppError', () => {
    const err = new AppError('Test', 500);
    expect(err.name).toBe('AppError');
  });

  it('maps 401 to UNAUTHORIZED', () => {
    const err = new AppError('Unauthorized', 401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('maps 403 to FORBIDDEN', () => {
    const err = new AppError('Forbidden', 403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('maps 409 to CONFLICT', () => {
    const err = new AppError('Conflict', 409);
    expect(err.code).toBe('CONFLICT');
  });
});
