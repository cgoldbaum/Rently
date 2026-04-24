'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

type Contract = {
  property: { address: string; type: string };
  startDate: string;
  endDate: string;
  monthlyAmount: number;
  initialAmount: number;
  adjustIndex: string;
  adjustFrequency: number;
  paymentDay: number;
  nextAdjustDate: string;
  lastAdjustPct: number | null;
  progress: number;
};

const PROP_TYPE: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Local comercial', PH: 'PH',
};
const INDEX: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

function fmtCurrency(n: number) {
  return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
}
function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TenantContractPage() {
  const { data: contract, isLoading, isError } = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: async () => {
      const res = await api.get('/tenant/contract');
      return res.data.data;
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando contrato...
        </div>
      </div>
    );
  }

  if (isError || !contract) {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Sin contrato asignado</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Tu propietario aún no te asignó un contrato en el sistema.</div>
        </div>
      </div>
    );
  }

  const totalDays = Math.ceil((new Date(contract.endDate).getTime() - new Date(contract.startDate).getTime()) / 86400000);
  const elapsed = Math.ceil((Date.now() - new Date(contract.startDate).getTime()) / 86400000);

  const details = [
    ['Inicio del contrato', fmtDate(contract.startDate)],
    ['Vencimiento', fmtDate(contract.endDate)],
    ['Monto inicial', fmtCurrency(contract.initialAmount)],
    ['Monto actual', fmtCurrency(contract.monthlyAmount)],
    ['Día de pago', `Día ${contract.paymentDay} de cada mes`],
    ['Índice de ajuste', INDEX[contract.adjustIndex] ?? contract.adjustIndex],
    ['Frecuencia de ajuste', `Cada ${contract.adjustFrequency} meses`],
    ['Próximo ajuste', fmtDate(contract.nextAdjustDate)],
  ];

  if (contract.lastAdjustPct !== null) {
    details.push(['Último ajuste', `+${contract.lastAdjustPct.toFixed(2)}%`]);
  }

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Property info */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600, marginBottom: 6 }}>Propiedad</div>
        <div style={{ fontWeight: 700, fontSize: 18 }}>{contract.property.address}</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 2 }}>{PROP_TYPE[contract.property.type] ?? contract.property.type}</div>
      </div>

      {/* Contract details grid */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Detalles del contrato</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px' }}>
          {details.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Duration progress */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Duración del contrato</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{contract.progress}% transcurrido</div>
        </div>
        <div style={{ height: 8, background: 'var(--bg-elevated)', borderRadius: 8, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', background: contract.progress >= 90 ? 'var(--danger)' : contract.progress >= 70 ? 'var(--warning)' : 'var(--accent)', width: `${contract.progress}%`, borderRadius: 8, transition: 'width 0.3s' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)' }}>
          <span>{fmtDate(contract.startDate)}</span>
          <span>{elapsed} de {totalDays} días</span>
          <span>{fmtDate(contract.endDate)}</span>
        </div>
      </div>

    </div>
  );
}
