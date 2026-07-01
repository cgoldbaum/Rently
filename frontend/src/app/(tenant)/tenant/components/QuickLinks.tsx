'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@rently/shared';

type QuickLinksProps = {
  contractEndDate?: string;
  contractProgress?: number;
  openClaims: number;
};

export default function QuickLinks({ contractEndDate, contractProgress, openClaims }: QuickLinksProps) {
  const { t } = useTranslation('dashboard');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <Link href="/tenant/contract" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer', transition: 'box-shadow var(--transition)' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{t('tenant.myContract')}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>
            {contractEndDate ? formatDate(contractEndDate) : '—'}
          </div>
          {contractProgress !== undefined && (
            <div style={{ marginTop: 8, height: 4, background: 'var(--bg-elevated)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'var(--accent)', width: `${contractProgress}%`, borderRadius: 4 }} />
            </div>
          )}
        </div>
      </Link>

      <Link href="/tenant/claims" style={{ textDecoration: 'none' }}>
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 18, cursor: 'pointer' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>{t('tenant.myClaims')}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: openClaims > 0 ? 'var(--warning)' : 'var(--accent)' }}>
            {t('tenant.openClaimsCount', { count: openClaims })}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{t('dashboard:quickView.viewAll')}</div>
        </div>
      </Link>
    </div>
  );
}
