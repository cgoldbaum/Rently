// Helpers de conversión entre el formato de input dd/mm/aaaa y el formato ISO
// (aaaa-mm-dd) que usan la API y las claves internas del calendario.

/** 'dd/mm/aaaa' → 'aaaa-mm-dd' (orden ISO, sin hora). */
export function dmyToYmd(dmy: string): string {
  const [d, m, y] = dmy.split('/');
  return `${y}-${m}-${d}`;
}

/** 'aaaa-mm-dd' → 'dd/mm/aaaa'. Inverso de dmyToYmd. */
export function ymdToDmy(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}/${m}/${y}`;
}

/** 'dd/mm/aaaa' → string ISO datetime (medianoche UTC), listo para enviar a la API. */
export function dmyToIso(dmy: string): string {
  return new Date(dmyToYmd(dmy)).toISOString();
}
