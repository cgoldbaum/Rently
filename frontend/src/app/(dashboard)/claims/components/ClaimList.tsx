'use client';

import { useTranslation } from 'react-i18next';
import { formatDate } from '@rently/shared';

interface ClaimHistory {
  oldStatus: string;
  newStatus: string;
  comment?: string;
  photoUrl?: string;
  changedAt: string;
}

interface Claim {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  tenant: {
    name: string;
    contract: { property: { name?: string; address: string } };
  };
  history: ClaimHistory[];
}

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  OPEN:        { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  IN_PROGRESS: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  RESOLVED:    { color: 'var(--accent)', bg: 'var(--accent-bg)' },
};

const PRIORITY_STYLE: Record<string, { color: string; bg: string }> = {
  HIGH:   { color: 'var(--danger)', bg: 'var(--danger-bg)' },
  MEDIUM: { color: 'var(--warning)', bg: 'var(--warning-bg)' },
  LOW:    { color: 'var(--text-muted)', bg: 'var(--bg-elevated)' },
};

interface ClaimListProps {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
}

export default function ClaimList({ claims, onSelectClaim }: ClaimListProps) {
  const { t } = useTranslation('claims');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {claims.map(c => {
        const st = STATUS_STYLE[c.status] ?? STATUS_STYLE.OPEN;
        const pr = PRIORITY_STYLE[c.priority] ?? PRIORITY_STYLE.MEDIUM;
        return (
          <div
            key={c.id}
            onClick={() => onSelectClaim(c)}
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 20px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  {c.title ?? t(`domain:claimCategory.${c.category}`) ?? c.category}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.tenant.contract.property.name ?? c.tenant.contract.property.address} · {c.tenant.name} · {formatDate(c.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: pr.bg, padding: '2px 8px', borderRadius: 6 }}>
                  {t(`domain:claimPriority.${c.priority}`)}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                  {t(`domain:claimStatus.${c.status}`)}
                </span>
              </div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {c.description}
            </p>
          </div>
        );
      })}
    </div>
  );
}
