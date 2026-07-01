import esCommon from './locales/es/common.json';
import esSettings from './locales/es/settings.json';
import esDomain from './locales/es/domain.json';
import esAuth from './locales/es/auth.json';
import esZod from './locales/es/zod.json';
import esClaims from './locales/es/claims.json';
import esPortal from './locales/es/portal.json';
import esPayments from './locales/es/payments.json';
import esProperties from './locales/es/properties.json';
import esContracts from './locales/es/contracts.json';
import esPhotos from './locales/es/photos.json';
import esChat from './locales/es/chat.json';
import esDashboard from './locales/es/dashboard.json';
import esReports from './locales/es/reports.json';
import esPerformance from './locales/es/performance.json';
import esProfessionals from './locales/es/professionals.json';
import esMpDemo from './locales/es/mpDemo.json';
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDomain from './locales/en/domain.json';
import enAuth from './locales/en/auth.json';
import enZod from './locales/en/zod.json';
import enClaims from './locales/en/claims.json';
import enPortal from './locales/en/portal.json';
import enPayments from './locales/en/payments.json';
import enProperties from './locales/en/properties.json';
import enContracts from './locales/en/contracts.json';
import enPhotos from './locales/en/photos.json';
import enChat from './locales/en/chat.json';
import enDashboard from './locales/en/dashboard.json';
import enReports from './locales/en/reports.json';
import enPerformance from './locales/en/performance.json';
import enProfessionals from './locales/en/professionals.json';
import enMpDemo from './locales/en/mpDemo.json';

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
  es: { common: esCommon, settings: esSettings, domain: esDomain, auth: esAuth, zod: esZod, claims: esClaims, portal: esPortal, payments: esPayments, properties: esProperties, contracts: esContracts, photos: esPhotos, chat: esChat, dashboard: esDashboard, reports: esReports, performance: esPerformance, professionals: esProfessionals, mpDemo: esMpDemo },
  en: { common: enCommon, settings: enSettings, domain: enDomain, auth: enAuth, zod: enZod, claims: enClaims, portal: enPortal, payments: enPayments, properties: enProperties, contracts: enContracts, photos: enPhotos, chat: enChat, dashboard: enDashboard, reports: enReports, performance: enPerformance, professionals: enProfessionals, mpDemo: enMpDemo },
} as const;

/** Lista de namespaces disponibles (derivada de los recursos en español). */
export const NAMESPACES = Object.keys(resources.es) as Array<keyof (typeof resources)['es']>;
