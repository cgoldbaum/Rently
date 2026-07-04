'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatMoney, formatDate, propertyTypeLabel } from '@rently/shared';

const INDEX: Record<string, string> = { IPC: 'IPC (INDEC)', ICL: 'ICL (BCRA)' };

interface ContractInfoProps {
  contract: {
    startDate: string; endDate: string; initialAmount: number;
    currentAmount: number; currency?: string; paymentDay: number; indexType: string;
    adjustFrequency: number; nextAdjustDate: string;
  };
  property: { address: string; type: string };
  tenant: { name: string; email: string; phone?: string };
}

export default function ContractInfo({ contract, property, tenant }: ContractInfoProps) {
  const { t } = useTranslation('portal');

  const fields: [string, string][] = [
    [t('contract.startDate'),        formatDate(contract.startDate)],
    [t('contract.endDate'),          formatDate(contract.endDate)],
    [t('contract.initialAmount'),    formatMoney(contract.initialAmount, contract.currency)],
    [t('contract.currentAmount'),    formatMoney(contract.currentAmount, contract.currency)],
    [t('contract.paymentDay'),       t('contract.paymentDayValue', { day: contract.paymentDay })],
    [t('contract.adjustIndex'),      INDEX[contract.indexType] ?? contract.indexType],
    [t('contract.adjustFrequency'),  t('contract.adjustFrequencyValue', { count: contract.adjustFrequency })],
    [t('contract.nextAdjust'),       formatDate(contract.nextAdjustDate)],
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle style={{ fontSize: 16 }}>{t('contract.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 24px', fontSize: 14 }}>
          {fields.map(([k, v]) => (
            <div key={k}>
              <div style={{ color: '#6b7280', fontSize: 12, marginBottom: 2 }}>{k}</div>
              <div style={{ fontWeight: 600 }}>{v}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{t('contract.rentedProperty')}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{property.address}</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{propertyTypeLabel(property.type)}</div>
        </div>

        <div style={{ marginTop: 16, padding: '14px 16px', background: '#f8f9ff', borderRadius: 10, border: '1px solid #e0e7ff' }}>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{t('contract.yourData')}</div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{tenant.name}</div>
          <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.email}</div>
          {tenant.phone && <div style={{ fontSize: 13, color: '#6b7280' }}>{tenant.phone}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
