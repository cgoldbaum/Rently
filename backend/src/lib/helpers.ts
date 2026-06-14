const CURRENCY_SYMBOLS: Record<string, string> = {
  ARS: '$',
  USD: 'US$',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

export function getAppUrl(): string {
  const { API_URL, RENTLY_API_URL, APP_URL, VERCEL_URL } = process.env;
  return API_URL ?? RENTLY_API_URL ?? (APP_URL ? `${APP_URL}/api` : undefined) ?? (VERCEL_URL ? `https://${VERCEL_URL}/api` : 'http://localhost:4001');
}

export function getWebUrl(): string {
  const { APP_URL, FRONTEND_URL, VERCEL_URL } = process.env;
  return APP_URL ?? FRONTEND_URL ?? (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:3001');
}
