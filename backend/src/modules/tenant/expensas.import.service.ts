import fs from 'fs/promises';
import { AppError } from '../../lib/AppError';
import { extractUploadedDocumentText } from '../../lib/documentText';

type ExpenseImportSuggestions = {
  period?: string;
  amount?: string;
  currency?: 'ARS' | 'USD';
  dueDate?: string;
  issuer?: string;
  receiptNumber?: string;
  notes?: string;
};

type ExpenseImportResult = {
  suggestions: ExpenseImportSuggestions;
  confidence: number;
  textPreview: string;
  warnings: string[];
};

const DATE_RE = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;
const MONTHS: Record<string, string> = {
  enero: '01',
  febrero: '02',
  marzo: '03',
  abril: '04',
  mayo: '05',
  junio: '06',
  julio: '07',
  agosto: '08',
  septiembre: '09',
  setiembre: '09',
  octubre: '10',
  noviembre: '11',
  diciembre: '12',
};

function toIsoDate(day: string, month: string, year: string) {
  const fullYear = year.length === 2 ? `20${year}` : year;
  const yyyy = Number(fullYear);
  const mm = Number(month);
  const dd = Number(day);
  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return undefined;
  return `${String(yyyy).padStart(4, '0')}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function extractDates(text: string) {
  const dates: string[] = [];
  for (const match of text.matchAll(DATE_RE)) {
    const date = toIsoDate(match[1], match[2], match[3]);
    if (date && !dates.includes(date)) dates.push(date);
  }
  return dates;
}

function normalizeAmount(raw: string) {
  const cleaned = raw.replace(/[^\d,.]/g, '');
  if (!cleaned) return undefined;
  const withoutThousands = cleaned.replace(/\.(?=\d{3}(\D|$))/g, '');
  const normalized = withoutThousands.replace(',', '.');
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount <= 0) return undefined;
  return String(Math.round(amount * 100) / 100);
}

function extractAmount(text: string) {
  const patterns = [
    /(?:total\s+(?:a\s+pagar)?|importe\s+total|saldo|monto)[^\d$u]{0,80}(?:\$|ars|pesos?|usd|u\$s)?\s*([0-9][0-9.,]*)/i,
    /(?:\$|ars|pesos?)\s*([0-9][0-9.,]*)/i,
    /(?:usd|u\$s)\s*([0-9][0-9.,]*)/i,
  ];
  for (const pattern of patterns) {
    const amount = normalizeAmount(text.match(pattern)?.[1] ?? '');
    if (amount) return amount;
  }
  return undefined;
}

function extractCurrency(text: string): 'ARS' | 'USD' | undefined {
  if (/\b(usd|u\$s|d[oó]lares?)\b/i.test(text)) return 'USD';
  if (/\b(ars|pesos?|\$)\b/i.test(text)) return 'ARS';
  return undefined;
}

function extractPeriod(text: string) {
  const numeric = text.match(/(?:per[ií]odo|mes|liquidaci[oó]n)[^\d]{0,30}(\d{1,2})[\/.-](\d{4})/i);
  if (numeric) {
    const month = Number(numeric[1]);
    if (month >= 1 && month <= 12) return `${numeric[2]}-${String(month).padStart(2, '0')}`;
  }

  const named = text.match(
    /(?:per[ií]odo|mes|liquidaci[oó]n)?[^a-zA-Záéíóúñ]{0,20}(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+(?:de\s+)?(20\d{2})/i,
  );
  if (named) return `${named[2]}-${MONTHS[named[1].toLowerCase()]}`;

  const dates = extractDates(text);
  return dates[0]?.slice(0, 7);
}

function extractDueDate(text: string) {
  const due = text.match(/(?:vencimiento|vence|fecha\s+de\s+vto\.?)[^\d]{0,30}(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/i);
  if (due) return toIsoDate(due[1], due[2], due[3]);
  return extractDates(text)[0];
}

function extractIssuer(text: string) {
  const patterns = [
    /(?:administraci[oó]n|admin\.?|consorcio)\s*:?[\s\n]+([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 .,&'-]{3,80})/,
    /^([A-ZÁÉÍÓÚÑ0-9][A-ZÁÉÍÓÚÑa-záéíóúñ0-9 .,&'-]{5,80})/m,
  ];
  for (const pattern of patterns) {
    const value = text.match(pattern)?.[1]?.replace(/\s+/g, ' ').trim();
    if (value && !/factura|liquidaci[oó]n|comprobante/i.test(value)) return value;
  }
  return undefined;
}

function extractReceiptNumber(text: string) {
  const match = text.match(/(?:comprobante|factura|recibo|liquidaci[oó]n|nro\.?|n[°º])[^\dA-Z]{0,20}([A-Z0-9-]{4,30})/i);
  return match?.[1]?.trim();
}

function extractNotes(text: string) {
  const concepts = ['ordinarias', 'extraordinarias', 'fondo de reserva', 'intereses', 'aysa', 'abl'];
  const found = concepts.filter((concept) => new RegExp(concept, 'i').test(text));
  return found.length ? found.join(', ') : undefined;
}

function compactSuggestions(suggestions: ExpenseImportSuggestions) {
  return Object.fromEntries(Object.entries(suggestions).filter(([, value]) => value != null && value !== '')) as ExpenseImportSuggestions;
}

function buildSuggestions(text: string): ExpenseImportSuggestions {
  return compactSuggestions({
    period: extractPeriod(text),
    amount: extractAmount(text),
    currency: extractCurrency(text) ?? 'ARS',
    dueDate: extractDueDate(text),
    issuer: extractIssuer(text),
    receiptNumber: extractReceiptNumber(text),
    notes: extractNotes(text),
  });
}

function confidenceFor(suggestions: ExpenseImportSuggestions) {
  const required = ['period', 'amount', 'dueDate'] as const;
  const found = required.filter((field) => Boolean(suggestions[field])).length;
  return Math.round((found / required.length) * 100);
}

export async function previewExpenseReceiptImport(file: Express.Multer.File): Promise<ExpenseImportResult> {
  try {
    const text = await extractUploadedDocumentText(file, {
      pdfExtractionFailed: 'expensas.pdfExtractionFailed',
      ocrFailed: 'expensas.ocrFailed',
    });
    if (text.length < 10) {
      throw new AppError('expensas.textTooShort', 422);
    }

    const suggestions = buildSuggestions(text);
    return {
      suggestions,
      confidence: confidenceFor(suggestions),
      textPreview: text.slice(0, 1000),
      warnings: Object.keys(suggestions).length ? [] : ['expensas.noFieldsDetected'],
    };
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}
