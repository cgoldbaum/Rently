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

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatMoney(amount: number, currency = 'ARS', country?: string): string {
  const locale = country ? LOCALE_MAP[country] ?? 'es-AR' : 'es-AR';
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const formatted = Math.round(amount).toLocaleString(locale);
  return `${symbol} ${formatted}`;
}

export function formatDate(
  date: Date | string | number | null | undefined,
  locale = 'es-AR',
): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatDateFull(date: Date | string | number | null | undefined): string {
  if (date == null) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
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
