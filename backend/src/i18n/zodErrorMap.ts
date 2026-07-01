import type { TFunction } from 'i18next';

interface ZodRawIssue {
  code?: string;
  origin?: string;
  format?: string;
  minimum?: number | bigint;
  maximum?: number | bigint;
  input?: unknown;
  params?: { i18n?: string } & Record<string, unknown>;
}

type ZodErrorMapResult = { message: string } | string | undefined | null;

export function createZodErrorMap(t: TFunction): (issue: ZodRawIssue) => ZodErrorMapResult {
  return (issue) => {
    const origin = typeof issue.origin === 'string' ? issue.origin : 'default';
    switch (issue.code) {
      case 'invalid_type':
        if (issue.input === undefined) return t('required');
        return t('invalid_type');
      case 'too_small':
        if (origin === 'string' && Number(issue.minimum) === 1) return t('required');
        return t(`too_small.${origin}`, {
          minimum: Number(issue.minimum),
          defaultValue: t('too_small.default'),
        });
      case 'too_big':
        return t(`too_big.${origin}`, {
          maximum: Number(issue.maximum),
          defaultValue: t('too_big.default'),
        });
      case 'invalid_format': {
        const fmt = typeof issue.format === 'string' ? issue.format : 'default';
        return t(`invalid_format.${fmt}`, { defaultValue: t('invalid_format.default') });
      }
      case 'custom': {
        const key = issue.params?.i18n;
        if (typeof key === 'string') {
          return t(`custom.${key}`, { defaultValue: t('default') });
        }
        return undefined;
      }
      default:
        return undefined;
    }
  };
}
