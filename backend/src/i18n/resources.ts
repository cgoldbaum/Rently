import esZod from './locales/es/zod.json';
import enZod from './locales/en/zod.json';
import esErrors from './locales/es/errors.json';
import enErrors from './locales/en/errors.json';
import esNotify from './locales/es/notify.json';
import enNotify from './locales/en/notify.json';

export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = 'es';

export const DEFAULT_NS = 'zod';

export const NAMESPACES = ['zod', 'errors', 'notify'] as const;

export const resources = {
  es: { zod: esZod, errors: esErrors, notify: esNotify },
  en: { zod: enZod, errors: enErrors, notify: enNotify },
} as const;
