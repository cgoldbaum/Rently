import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createI18n, resolveLanguage, applyZodErrorMap } from './index';
import { resources, SUPPORTED_LANGUAGES } from './resources';
import { registerSchema, loginSchema, getFieldErrors } from '../lib/validations';

/** Aplana las claves de un objeto anidado: { a: { b: 1 } } => ['a.b']. */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) => {
    const full = prefix ? `${prefix}.${key}` : key;
    return value && typeof value === 'object'
      ? flattenKeys(value as Record<string, unknown>, full)
      : [full];
  });
}

describe('paridad de claves entre idiomas', () => {
  const namespaces = Object.keys(resources.es) as Array<keyof typeof resources.es>;

  for (const ns of namespaces) {
    it(`'${ns}' tiene las mismas claves en es y en`, () => {
      const esKeys = flattenKeys(resources.es[ns]).sort();
      const enKeys = flattenKeys(resources.en[ns]).sort();
      expect(enKeys).toEqual(esKeys);
    });
  }
});

describe('resolveLanguage', () => {
  it('respeta una preferencia explícita', () => {
    expect(resolveLanguage('en', 'es-AR')).toBe('en');
    expect(resolveLanguage('es', 'en-US')).toBe('es');
  });

  it('usa el idioma del sistema cuando la preferencia es "system"', () => {
    expect(resolveLanguage('system', 'en-US')).toBe('en');
    expect(resolveLanguage('system', 'es-AR')).toBe('es');
  });

  it('cae al idioma por defecto ante un sistema no soportado o vacío', () => {
    expect(resolveLanguage('system', 'fr-FR')).toBe('es');
    expect(resolveLanguage('system', null)).toBe('es');
    expect(resolveLanguage('system', undefined)).toBe('es');
  });
});

describe('createI18n', () => {
  it('traduce common:loading en cada idioma', () => {
    const es = createI18n('es');
    const en = createI18n('en');
    expect(es.t('common:loading')).toBe('Cargando...');
    expect(en.t('common:loading')).toBe('Loading...');
  });

  it('cambia de idioma en caliente', async () => {
    const i18n = createI18n('es');
    expect(i18n.t('common:save')).toBe('Guardar');
    await i18n.changeLanguage('en');
    expect(i18n.t('common:save')).toBe('Save');
  });

  it('una clave faltante devuelve la clave sin romper', () => {
    const i18n = createI18n('es');
    expect(i18n.t('common:__nope__')).toBe('__nope__');
  });
});

describe('SUPPORTED_LANGUAGES', () => {
  it('incluye es y en', () => {
    expect(SUPPORTED_LANGUAGES).toContain('es');
    expect(SUPPORTED_LANGUAGES).toContain('en');
  });
});

describe('zod error map', () => {
  it('traduce el mensaje por defecto de too_small según el idioma activo', () => {
    const i18n = createI18n('en');
    applyZodErrorMap(i18n);
    const result = z.string().min(3).safeParse('a');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Must be at least 3 characters');
    }
  });

  it('min(1) sobre string se traduce como requerido', () => {
    applyZodErrorMap(createI18n('en'));
    const result = loginSchema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(getFieldErrors(result.error).password).toBe('This field is required');
    }
  });

  it('traduce un .refine() custom (password mayúscula) en EN y ES', () => {
    const input = { name: 'John', email: 'a@b.com', password: 'lowercase1', confirmPassword: 'lowercase1' };

    applyZodErrorMap(createI18n('en'));
    const en = registerSchema.safeParse(input);
    expect(en.success).toBe(false);
    if (!en.success) {
      expect(getFieldErrors(en.error).password).toBe('Password must include at least one uppercase letter');
    }

    applyZodErrorMap(createI18n('es'));
    const es = registerSchema.safeParse(input);
    expect(es.success).toBe(false);
    if (!es.success) {
      expect(getFieldErrors(es.error).password).toBe('La contraseña debe incluir al menos una mayúscula');
    }
  });
});
