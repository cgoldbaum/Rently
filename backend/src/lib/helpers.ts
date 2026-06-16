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

export function getAppUrl(): string {
  const { API_URL, RENTLY_API_URL, APP_URL, VERCEL_URL } = process.env;
  return API_URL ?? RENTLY_API_URL ?? (APP_URL ? `${APP_URL}/api` : undefined) ?? (VERCEL_URL ? `https://${VERCEL_URL}/api` : 'http://localhost:4001');
}

export function getWebUrl(): string {
  const { APP_URL, FRONTEND_URL, VERCEL_URL } = process.env;
  return APP_URL ?? FRONTEND_URL ?? (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3001');
}
