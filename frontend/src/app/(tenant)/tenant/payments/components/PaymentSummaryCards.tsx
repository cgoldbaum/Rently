'use client';

type PaymentSummaryCardsProps = {
  totalPaid: number;
  totalPending: number;
  totalLate: number;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
};

const FILTERS = [
  { key: '', label: 'Todos' },
  { key: 'PAID', label: 'Pagados' },
  { key: 'PENDING', label: 'Pendientes' },
  { key: 'LATE', label: 'Vencidos' },
  { key: 'PENDING_CONFIRMATION', label: 'En confirmación' },
];

export default function PaymentSummaryCards({
  totalPaid,
  totalPending,
  totalLate,
  activeFilter,
  onFilterChange,
}: PaymentSummaryCardsProps) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <div style={{ background: 'var(--accent-bg)', borderRadius: 'var(--radius)', padding: '14px 16px', border: '1px solid var(--accent)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Pagados</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginTop: 4 }}>{totalPaid}</div>
        </div>
        <div style={{ background: 'var(--warning-bg)', borderRadius: 'var(--radius)', padding: '14px 16px', border: '1px solid var(--warning)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Pendientes</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>{totalPending}</div>
        </div>
        <div style={{ background: 'var(--danger-bg)', borderRadius: 'var(--radius)', padding: '14px 16px', border: '1px solid var(--danger)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Vencidos</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--danger)', marginTop: 4 }}>{totalLate}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>Historial de pagos</div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: `1.5px solid ${activeFilter === f.key ? 'var(--accent)' : 'var(--border)'}`,
              background: activeFilter === f.key ? 'var(--accent-bg)' : 'var(--bg-card)',
              color: activeFilter === f.key ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
    </>
  );
}
