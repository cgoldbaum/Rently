'use client';

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

const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Abierto',  color: '#dc2626', bg: '#fef2f2' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706', bg: '#fffbeb' },
  RESOLVED:    { label: 'Resuelto', color: '#16a34a', bg: '#f0fdf4' },
};

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Urgente', color: '#dc2626' },
  MEDIUM: { label: 'Media',   color: '#d97706' },
  LOW:    { label: 'Baja',    color: '#6b7280' },
};

interface ClaimListProps {
  claims: Claim[];
  onSelectClaim: (claim: Claim) => void;
}

export default function ClaimList({ claims, onSelectClaim }: ClaimListProps) {
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
                  {c.title ?? CAT_LABELS[c.category] ?? c.category}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {c.tenant.contract.property.name ?? c.tenant.contract.property.address} · {c.tenant.name} · {formatDate(c.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: pr.color, background: `${pr.color}18`, padding: '2px 8px', borderRadius: 6 }}>
                  {pr.label}
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, color: st.color, background: st.bg, padding: '2px 8px', borderRadius: 6 }}>
                  {st.label}
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
