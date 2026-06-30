const LOCALE_MAP: Record<string, string> = {
  AR: 'es-AR',
  CL: 'es-CL',
  CO: 'es-CO',
  UY: 'es-UY',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
};

// Idioma activo de la app, sincronizado por la capa de i18n (ver i18n/index.ts).
// Determina el locale por defecto de fechas/números cuando no se pasa uno explícito.
let activeLanguage: 'es' | 'en' = 'es';

/** Locale por defecto según el idioma activo. */
function defaultLocale(): string {
  return activeLanguage === 'en' ? 'en-US' : 'es-AR';
}

/** Sincroniza el idioma activo usado para formatear fechas y números. */
export function setActiveLanguage(language: 'es' | 'en'): void {
  activeLanguage = language;
}

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatMoney(amount: number, currency = 'ARS', country?: string): string {
  const locale = country ? LOCALE_MAP[country] ?? defaultLocale() : defaultLocale();
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = Math.round(amount).toLocaleString(locale);
  return `${symbol} ${formatted}`;
}

export function formatDate(
  date: Date | string | number | null | undefined,
  locale?: string,
): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale ?? defaultLocale(), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(defaultLocale(), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateFull(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(defaultLocale(), {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Suma `months` meses preservando el día del mes y la hora (semántica de aniversario).
 * Si el día no existe en el mes destino (ej: 31 ene + 1 mes), se ajusta al último día
 * de ese mes. Para alinear al inicio de mes, componer con `monthStart`.
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const day = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return result;
}

export function monthStart(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getAppUrl(): string {
  const { API_URL, RENTLY_API_URL, NEXT_PUBLIC_API_URL, APP_URL, VERCEL_URL } = process.env;
  return API_URL ?? RENTLY_API_URL ?? NEXT_PUBLIC_API_URL ?? (APP_URL ? `${APP_URL}/api` : undefined) ?? (VERCEL_URL ? `https://${VERCEL_URL}/api` : 'http://localhost:4001');
}

export function getWebUrl(): string {
  const { APP_URL, FRONTEND_URL, NEXT_PUBLIC_APP_URL, VERCEL_URL } = process.env;
  return APP_URL ?? FRONTEND_URL ?? NEXT_PUBLIC_APP_URL ?? (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3001');
}
