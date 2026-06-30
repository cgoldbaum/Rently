'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, formatDate, propertyTypeLabel } from '@rently/shared';

const INDEX: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

interface ContractInfoProps {
  contract: {
    startDate: string; endDate: string; initialAmount: number;
    currentAmount: number; paymentDay: number; indexType: string;
    adjustFrequency: number; nextAdjustDate: string;
  };
  property: { address: string; type: string };
  tenant: { name: string; email: string; phone?: string };
}

export default function ContractInfo({ contract, property, tenant }: ContractInfoProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 16 }}>Tu contrato de alquiler</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', fontSize: 14 }}>
          {[
            ['Inicio del contrato', formatDate(contract.startDate)],
            ['Vencimiento', formatDate(contract.endDate)],
            ['Monto inicial', formatMoney(contract.initialAmount)],
            ['Monto actual', formatMoney(contract.currentAmount)],
            ['Día de pago', `Día ${contract.paymentDay} de cada mes`],
            ['Índice de ajuste', INDEX[contract.indexType] ?? contract.indexType],
            ['Frecuencia ajuste', `Cada ${contract.adjustFrequency} meses`],
            ['Próximo ajuste', formatDate(contract.nextAdjustDate)],
          ].map(([k, v]) => (
            <div key={k}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Propiedad alquilada</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{property.address}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{propertyTypeLabel(property.type)}</div>
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Tus datos</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{tenant.name}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.email}</div>
          {tenant.phone && <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.phone}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
