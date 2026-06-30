import type { TFunction } from 'i18next';

/**
 * Forma mínima de un issue de Zod v4 que necesitamos para traducir.
 * Tipamos en forma laxa para no acoplarnos a los tipos internos de zod/v4/core.
 */
interface ZodRawIssue {
  code?: string;
  origin?: string;
  format?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  input?: unknown;
  /** Para issues `custom`: clave i18n bajo `zod:custom.*` (ver validations.ts). */
  params?: { i18n?: string } & Record<string, unknown>;
}

type ZodErrorMapResult = { message: string } | string | undefined;

/**
 * Construye un `customError` map de Zod que traduce los mensajes por defecto
 * usando el namespace `zod` de i18next. Los mensajes inline en los schemas
 * (`.min(8, 'texto')`) siguen teniendo prioridad; este map sólo cubre los
 * issues sin mensaje explícito. La función `t` debe estar ligada a la
 * instancia de i18n para reflejar el idioma activo en cada llamada.
 */
export function createZodErrorMap(t: TFunction): (issue: ZodRawIssue) => ZodErrorMapResult {
  return (issue) => {
    const origin = typeof issue.origin === 'string' ? issue.origin : 'default';
    switch (issue.code) {
      case 'invalid_type':
        // `undefined` como input suele significar "campo faltante/requerido".
        if (issue.input === undefined) return t('zod:required');
        return t('zod:invalid_type');
      case 'too_small':
        // `min(1)` sobre strings se usa como "campo requerido": mejor UX que un
        // mensaje de longitud.
        if (origin === 'string' && Number(issue.minimum) === 1) return t('zod:required');
        return t(`zod:too_small.${origin}`, {
          minimum: Number(issue.minimum),
          defaultValue: t('zod:too_small.default'),
        });
      case 'too_big':
        return t(`zod:too_big.${origin}`, {
          maximum: Number(issue.maximum),
          defaultValue: t('zod:too_big.default'),
        });
      case 'invalid_format': {
        const fmt = typeof issue.format === 'string' ? issue.format : 'default';
        return t(`zod:invalid_format.${fmt}`, { defaultValue: t('zod:invalid_format.default') });
      }
      case 'custom': {
        // Mensajes de `.refine()`/`superRefine` que pasan `params.i18n` con la
        // subclave bajo `zod:custom.*`.
        const key = issue.params?.i18n;
        if (typeof key === 'string') {
          return t(`zod:custom.${key}`, { defaultValue: t('zod:default') });
        }
        return undefined;
      }
      default:
        // Sin mensaje => Zod usa su texto por defecto. Devolvemos `undefined`
        // para no pisar mensajes inline ni códigos que aún no traducimos.
        return undefined;
    }
  };
}
