export const INDEX_BY_COUNTRY: Record<string, Array<{ value: string; label: string; provider: string }>> = {
  AR: [
    { value: 'IPC', label: 'IPC (INDEC)', provider: 'INDEC' },
    { value: 'ICL', label: 'ICL (BCRA)', provider: 'BCRA' },
    { value: 'MANUAL', label: 'Manual', provider: '' },
  ],
  CL: [
    { value: 'IPC', label: 'IPC (Banco Central)', provider: 'Banco Central de Chile' },
    { value: 'MANUAL', label: 'Manual', provider: '' },
  ],
  CO: [
    { value: 'IPC', label: 'IPC (DANE)', provider: 'DANE' },
    { value: 'MANUAL', label: 'Manual', provider: '' },
  ],
  UY: [
    { value: 'IPC', label: 'IPC (INE)', provider: 'Instituto Nacional de Estadística' },
    { value: 'MANUAL', label: 'Manual', provider: '' },
  ],
};
