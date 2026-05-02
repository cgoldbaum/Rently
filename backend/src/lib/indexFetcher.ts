import { IndexType, Country } from '@prisma/client';
import * as https from 'https';
import ExcelJS from 'exceljs';

const TTL_MS = 60 * 60 * 1000; // 1 hour

const cache = new Map<string, { value: number | null; expiresAt: number }>();

function getCached(key: string): number | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCached(key: string, value: number | null): void {
  cache.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

// ─── Argentina ───────────────────────────────────────────────────────────────

async function fetchIndexVariationArgentina(indexType: IndexType): Promise<number | null> {
  try {
    const seriesId =
      indexType === 'IPC'
        ? '148.3_INIVELGENERAL_DICI_M_26'
        : '145.7_ICLI_0_M_27';

    const url = `https://apis.datos.gob.ar/series/api/series/?ids=${seriesId}&limit=2&sort=desc&format=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    const [latest, previous]: [string, number][] = json?.data ?? [];
    if (!latest || !previous || previous[1] === 0) return null;

    return ((latest[1] - previous[1]) / previous[1]) * 100;
  } catch {
    return null;
  }
}

// ─── Chile ───────────────────────────────────────────────────────────────────
// Source: mindicador.cl (free public API, no auth required)
// Returns the monthly IPC % variation directly in serie[0].valor

async function fetchIndexVariationChile(): Promise<number | null> {
  try {
    const url = 'https://mindicador.cl/api/ipc';
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = (await res.json()) as any;
    const serie: { fecha: string; valor: number }[] = json?.serie ?? [];
    if (!serie.length) return null;

    // serie is ordered newest-first; valor is already the monthly % variation
    const valor = serie[0]?.valor;
    if (valor === undefined || valor === null || isNaN(Number(valor))) return null;

    return Number(valor);
  } catch {
    return null;
  }
}

// ─── Colombia ────────────────────────────────────────────────────────────────
// Source: DANE — monthly XLSX file with dynamic URL (no auth required)
// URL pattern: https://www.dane.gov.co/files/operaciones/IPC/{mon}{year}/anex-IPC-Variacion-{mon}{year}.xlsx
// DANE typically publishes with a 1-2 month lag; we try up to 3 months back.

async function fetchIndexVariationColombia(): Promise<number | null> {
  const monthNames = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const now = new Date();

  for (let lag = 1; lag <= 3; lag++) {
    try {
      const d = new Date(now.getFullYear(), now.getMonth() - lag, 1);
      const mon = monthNames[d.getMonth()];
      const year = d.getFullYear();
      const url = `https://www.dane.gov.co/files/operaciones/IPC/${mon}${year}/anex-IPC-Variacion-${mon}${year}.xlsx`;

      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) continue;

      const arrayBuffer = await res.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (workbook.xlsx as any).load(arrayBuffer);

      // The "Variaciones porcentuales" sheet has monthly/YTD/annual changes.
      // Monthly variation is the first numeric cell value in the expected range (0–5%).
      let found: number | null = null;

      workbook.eachSheet((sheet) => {
        if (found !== null) return;
        sheet.eachRow((row) => {
          if (found !== null) return;
          row.eachCell((cell) => {
            if (found !== null) return;
            const v = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value ?? ''));
            if (!isNaN(v) && v > 0 && v < 5) {
              found = v;
            }
          });
        });
      });

      if (found !== null) return found;
    } catch {
      continue;
    }
  }

  return null;
}

// ─── Uruguay ─────────────────────────────────────────────────────────────────
// Source: INE Uruguay — the ine.gub.uy server has a known SSL cert issue on
// subdomains (www5, www7), so we bypass cert verification for this specific request.

function fetchInsecureHttps(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('timeout')), 10_000);
    https
      .get(url, { rejectUnauthorized: false }, (res) => {
        if (res.statusCode !== 200) {
          clearTimeout(timeout);
          reject(new Error(`HTTP ${res.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => { clearTimeout(timeout); resolve(Buffer.concat(chunks)); });
      })
      .on('error', (err) => { clearTimeout(timeout); reject(err); });
  });
}

async function fetchIndexVariationUruguay(): Promise<number | null> {
  try {
    const url =
      'https://www5.ine.gub.uy/documents/Estad%C3%ADsticasecon%C3%B3micas/SERIES%20Y%20OTROS/IPC/Base%20Octubre%202022%3D100/IPC%20gral%20y%20variaciones_base%202022.xlsx';

    const buffer = await fetchInsecureHttps(url);
    const workbook = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (workbook.xlsx as any).load(buffer);

    // The INE file has a monthly variations column. We look for the last row
    // with a small positive numeric value (monthly IPC %).
    let latestVariation: number | null = null;

    workbook.eachSheet((sheet) => {
      if (latestVariation !== null) return;
      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          const v = typeof cell.value === 'number' ? cell.value : parseFloat(String(cell.value ?? ''));
          if (!isNaN(v) && v > 0 && v < 5) {
            latestVariation = v;
          }
        });
      });
    });

    return latestVariation;
  } catch {
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function fetchIndexVariation(country: Country, indexType: IndexType): Promise<number | null> {
  // ICL only exists in Argentina (BCRA). Non-AR contracts should always use IPC.
  const effectiveIndexType: IndexType = country !== 'AR' ? 'IPC' : indexType;
  if (country !== 'AR' && indexType === 'ICL') {
    console.warn(`[IndexFetcher] ICL no está disponible para ${country}, se usa IPC en su lugar.`);
  }

  const key = `${country}:${effectiveIndexType}`;
  const cached = getCached(key);
  if (cached !== undefined) return cached;

  let value: number | null;
  switch (country) {
    case 'AR':
      value = await fetchIndexVariationArgentina(effectiveIndexType);
      break;
    case 'CL':
      value = await fetchIndexVariationChile();
      break;
    case 'CO':
      value = await fetchIndexVariationColombia();
      break;
    case 'UY':
      value = await fetchIndexVariationUruguay();
      break;
    default:
      value = null;
  }

  // Only cache successful responses so a transient failure doesn't poison the cache
  if (value !== null) setCached(key, value);
  return value;
}
