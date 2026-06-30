const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

/** Fecha en formato dd/mm/aaaa (es-AR, con padding). Espejo de `formatDateShort` en @rently/shared. */
export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Suma `months` meses preservando el día del mes y la hora (semántica de aniversario:
 * si activás el 20, el período termina el 20 del mes siguiente). Si el día no existe en
 * el mes destino (ej: 31 ene + 1 mes), se ajusta al último día de ese mes (28/29 feb).
 * Para alinear al inicio de mes, componer con `monthStart` antes de llamar.
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

/**
 * Clave de período canónica `YYYY-MM`, calculada en hora LOCAL (no UTC).
 * Usar SIEMPRE esto para construir/consultar `Payment.period`, de modo que el
 * scheduler, el registro de pago del inquilino y los lookups hablen el mismo
 * formato y el índice único `@@unique([contractId, period])` realmente deduplique.
 *
 * No usar `toISOString().slice(0, 7)`: en zonas con offset negativo (AR, UTC-3)
 * el corte en UTC puede caer en el mes anterior cerca del cambio de mes.
 */
export function periodKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function getAppUrl(): string {
  const { API_URL, RENTLY_API_URL, APP_URL, VERCEL_URL } = process.env;
  return API_URL ?? RENTLY_API_URL ?? (APP_URL ? `${APP_URL}/api` : undefined) ?? (VERCEL_URL ? `https://${VERCEL_URL}/api` : 'http://localhost:4001');
}

export function getWebUrl(): string {
  const { APP_URL, FRONTEND_URL, VERCEL_URL } = process.env;
  return APP_URL ?? FRONTEND_URL ?? (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3001');
}

/** URL base de la API, con soporte para puerto custom en desarrollo. */
export function getApiUrl(): string {
  const localApiUrl = `http://localhost:${process.env.PORT || 4000}`;
  if (process.env.API_URL === 'http://localhost:4000' && process.env.PORT && process.env.PORT !== '4000') {
    return localApiUrl;
  }
  return process.env.API_URL || localApiUrl;
}

export function isLocalUrl(url: string): boolean {
  return url.includes('localhost') || url.includes('127.0.0.1');
}

export function getPaymentsMode(): string {
  return (process.env.PAYMENTS_MODE || 'mock').toLowerCase();
}
