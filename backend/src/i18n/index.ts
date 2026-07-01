import i18next, { type i18n as I18nInstance, type TFunction } from 'i18next';
import {
  resources,
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  type Language,
} from './resources';
import { createZodErrorMap } from './zodErrorMap';

export { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE };
export type { Language };
export { createZodErrorMap };

function isSupported(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

export function resolveLanguage(acceptLanguage: string | undefined): Language {
  if (!acceptLanguage) return DEFAULT_LANGUAGE;
  const base = acceptLanguage.slice(0, 2).toLowerCase();
  return isSupported(base) ? base : DEFAULT_LANGUAGE;
}

/** Idioma efectivo de un usuario (campo `language`, con fallback al default). */
export function languageOf(user: { language?: string | null } | null | undefined): Language {
  const lang = user?.language;
  return lang && isSupported(lang) ? lang : DEFAULT_LANGUAGE;
}

function createInstance(lng: Language): I18nInstance {
  const instance = i18next.createInstance();
  instance.init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: ['zod', 'errors', 'notify'],
    defaultNS: 'zod',
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  return instance;
}

const instances: Record<string, I18nInstance> = {};
for (const lang of SUPPORTED_LANGUAGES) {
  instances[lang] = createInstance(lang);
}

export function getT(lng: Language): TFunction {
  const instance = instances[lng];
  return instance.t.bind(instance);
}
