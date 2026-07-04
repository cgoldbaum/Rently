import fs from 'fs/promises';
import { AppError } from '../../lib/AppError';
import { extractUploadedDocumentText } from '../../lib/documentText';

type ContractImportSuggestions = {
  startDate?: string;
  endDate?: string;
  initialAmount?: string;
  currency?: 'ARS' | 'USD';
  paymentDay?: string;
  indexType?: 'IPC' | 'ICL' | 'MANUAL';
  adjustFrequency?: string;
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
};

type ContractImportResult = {
  suggestions: ContractImportSuggestions;
  confidence: number;
  textPreview: string;
  warnings: string[];
};

const DATE_RE = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\b/g;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

function toIsoDate(day: string, month: string, year: string) {
  const fullYear = year.length === 2 ? `20${year}` : year;
  const yyyy = Number(fullYear);
  const mm = Number(month);
  const dd = Number(day);
  if (yyyy < 1900 || yyyy > 2100 || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
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
    /(?:canon|alquiler|precio|renta|mensual)[^\d$u]{0,80}(?:\$|usd|u\$s|d[o\u00f3]lares?|pesos?)?\s*([0-9][0-9.,]*)/i,
    /(?:\$|ars|pesos?)\s*([0-9][0-9.,]*)/i,
    /(?:usd|u\$s|d[o\u00f3]lares?)\s*([0-9][0-9.,]*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const amount = match?.[1] ? normalizeAmount(match[1]) : undefined;
    if (amount) return amount;
  }
  return undefined;
}

function extractCurrency(text: string): 'ARS' | 'USD' | undefined {
  if (/\b(usd|u\$s|d[o\u00f3]lares?)\b/i.test(text)) return 'USD';
  if (/\b(ars|pesos?|\$)\b/i.test(text)) return 'ARS';
  return undefined;
}

function extractPaymentDay(text: string) {
  const patterns = [
    /(?:d[i\u00ed]a de pago|pago[^.\n]{0,30}d[i\u00ed]a|vencimiento[^.\n]{0,30}d[i\u00ed]a)\D{0,20}(\d{1,2})/i,
    /(?:del|entre el)\s+1\s+(?:al|y el)\s+(\d{1,2})\s+de cada mes/i,
    /(?:hasta el d[i\u00ed]a|antes del d[i\u00ed]a)\s+(\d{1,2})/i,
  ];
  for (const pattern of patterns) {
    const value = Number(text.match(pattern)?.[1]);
    if (value >= 1 && value <= 28) return String(value);
  }
  return undefined;
}

function extractIndexType(text: string): 'IPC' | 'ICL' | 'MANUAL' | undefined {
  if (/\bICL\b|[i\u00ed]ndice\s+de\s+contratos\s+de\s+locaci[o\u00f3]n/i.test(text)) return 'ICL';
  if (/\bIPC\b|[i\u00ed]ndice\s+de\s+precios\s+al\s+consumidor/i.test(text)) return 'IPC';
  if (/ajuste\s+manual|sin\s+ajuste|precio\s+fijo/i.test(text)) return 'MANUAL';
  return undefined;
}

function extractAdjustFrequency(text: string) {
  const lower = text.toLowerCase();
  if (/mensual/.test(lower)) return '1';
  if (/bimestral/.test(lower)) return '2';
  if (/trimestral/.test(lower)) return '3';
  if (/cuatrimestral/.test(lower)) return '4';
  if (/semestral/.test(lower)) return '6';
  if (/anual/.test(lower)) return '12';

  const match = lower.match(/cada\s+(\d{1,2})\s+mes(?:es)?/);
  const months = Number(match?.[1]);
  if (months >= 1 && months <= 24) return String(months);
  return undefined;
}

function extractTenantName(text: string) {
  const match = text.match(/(?:locatari[oa]|inquilin[oa])\s*:?[\s\n]+([A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1][A-Z\u00c1\u00c9\u00cd\u00d3\u00da\u00d1a-z\u00e1\u00e9\u00ed\u00f3\u00fa\u00f1'\s]{4,80})/);
  return match?.[1]?.replace(/\s+/g, ' ').trim();
}

function extractTenantPhone(text: string) {
  const match = text.match(/(?:tel[e\u00e9]fono|celular|contacto)\D{0,20}(\+?[\d\s().-]{7,20})/i);
  return match?.[1]?.replace(/\s+/g, ' ').trim();
}

function compactSuggestions(suggestions: ContractImportSuggestions) {
  return Object.fromEntries(Object.entries(suggestions).filter(([, value]) => value != null && value !== '')) as ContractImportSuggestions;
}

function buildSuggestions(text: string): ContractImportSuggestions {
  const dates = extractDates(text);
  const indexType = extractIndexType(text);
  return compactSuggestions({
    startDate: dates[0],
    endDate: dates[1],
    initialAmount: extractAmount(text),
    currency: extractCurrency(text),
    paymentDay: extractPaymentDay(text),
    indexType,
    adjustFrequency: indexType === 'MANUAL' ? '0' : extractAdjustFrequency(text),
    tenantName: extractTenantName(text),
    tenantEmail: text.match(EMAIL_RE)?.[0],
    tenantPhone: extractTenantPhone(text),
  });
}

function confidenceFor(suggestions: ContractImportSuggestions) {
  const required = ['startDate', 'endDate', 'initialAmount', 'paymentDay', 'indexType'] as const;
  const found = required.filter((field) => Boolean(suggestions[field])).length;
  return Math.round((found / required.length) * 100);
}

export async function previewContractImport(file: Express.Multer.File): Promise<ContractImportResult> {
  try {
    const text = await extractUploadedDocumentText(file, {
      pdfExtractionFailed: 'contractImport.pdfExtractionFailed',
      ocrFailed: 'contractImport.ocrFailed',
    });
    if (text.length < 20) {
      throw new AppError('contractImport.textTooShort', 422);
    }

    const suggestions = buildSuggestions(text);
    return {
      suggestions,
      confidence: confidenceFor(suggestions),
      textPreview: text.slice(0, 1200),
      warnings: Object.keys(suggestions).length ? [] : ['contractImport.noFieldsDetected'],
    };
  } finally {
    await fs.unlink(file.path).catch(() => {});
  }
}
