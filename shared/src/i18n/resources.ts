import esCommon from './locales/es/common.json';
import esSettings from './locales/es/settings.json';
import esDomain from './locales/es/domain.json';
import esAuth from './locales/es/auth.json';
import esZod from './locales/es/zod.json';
import esClaims from './locales/es/claims.json';
import esPortal from './locales/es/portal.json';
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDomain from './locales/en/domain.json';
import enAuth from './locales/en/auth.json';
import enZod from './locales/en/zod.json';
import enClaims from './locales/en/claims.json';
import enPortal from './locales/en/portal.json';

/** Idiomas soportados por la aplicación. El primero es el fallback. */
export const SUPPORTED_LANGUAGES = ['es', 'en'] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

/** Idioma por defecto cuando no se puede resolver el del sistema. */
export const DEFAULT_LANGUAGE: Language = 'es';

/** Preferencia almacenada: un idioma fijo o "seguir el sistema". */
export type LanguagePreference = 'system' | Language;

/** Namespace por defecto para `t('clave')` sin prefijo. */
export const DEFAULT_NS = 'common';

export const resources = {
  es: { common: esCommon, settings: esSettings, domain: esDomain, auth: esAuth, zod: esZod, claims: esClaims, portal: esPortal },
  en: { common: enCommon, settings: enSettings, domain: enDomain, auth: enAuth, zod: enZod, claims: enClaims, portal: enPortal },
} as const;

/** Lista de namespaces disponibles (derivada de los recursos en español). */
export const NAMESPACES = Object.keys(resources.es) as Array<keyof (typeof resources)['es']>;
