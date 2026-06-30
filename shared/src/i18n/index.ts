import i18next, { type i18n as I18nInstance, type Module, type NewableModule } from 'i18next';
import { z } from 'zod';
import {
  resources,
  DEFAULT_NS,
  DEFAULT_LANGUAGE,
  NAMESPACES,
  SUPPORTED_LANGUAGES,
  type Language,
  type LanguagePreference,
} from './resources';
import { createZodErrorMap } from './zodErrorMap';
import { setActiveLanguage } from '../lib/format';

export {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  DEFAULT_NS,
  NAMESPACES,
  resources,
};
export type { Language, LanguagePreference };
export { createZodErrorMap };

function isSupported(value: string): value is Language {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/**
 * Resuelve el idioma efectivo a partir de la preferencia del usuario y el
 * idioma del sistema (ej. `navigator.language` o `expo-localization`).
 * - `'es' | 'en'` => se respeta tal cual.
 * - `'system'`    => se toma la base del idioma del sistema, con fallback al default.
 */
export function resolveLanguage(
  preference: LanguagePreference,
  systemLanguage: string | null | undefined,
): Language {
  if (preference !== 'system') return preference;
  const base = (systemLanguage ?? '').slice(0, 2).toLowerCase();
  return isSupported(base) ? base : DEFAULT_LANGUAGE;
}

type AnyModule = Module | NewableModule<Module>;

/**
 * Crea una instancia de i18next aislada (no el singleton) configurada con los
 * recursos compartidos. `shared` se mantiene agnóstico del framework: cada app
 * inyecta sus plugins (p. ej. `initReactI18next`). Al cambiar de idioma se
 * sincronizan el formato de fechas/moneda y el error map de Zod.
 */
export function createI18n(lng: Language, plugins: AnyModule[] = []): I18nInstance {
  const instance = i18next.createInstance();
  for (const plugin of plugins) instance.use(plugin);
  instance.init({
    resources,
    lng,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: DEFAULT_NS,
    ns: NAMESPACES as unknown as string[],
    interpolation: { escapeValue: false },
    returnNull: false,
  });

  setActiveLanguage(lng);
  applyZodErrorMap(instance);
  instance.on('languageChanged', (next: string) => {
    if (isSupported(next)) setActiveLanguage(next);
  });

  return instance;
}

/**
 * Configura el `customError` global de Zod para traducir mensajes por defecto
 * con el idioma activo de la instancia de i18n provista. Debe llamarse en cada
 * runtime (web, mobile, backend) para que `z.config` afecte a su propio `z`.
 */
export function applyZodErrorMap(instance: I18nInstance): void {
  const errorMap = createZodErrorMap(instance.t.bind(instance));
  type ZodConfigArg = NonNullable<Parameters<typeof z.config>[0]>;
  z.config({ customError: errorMap as ZodConfigArg['customError'] });
}
