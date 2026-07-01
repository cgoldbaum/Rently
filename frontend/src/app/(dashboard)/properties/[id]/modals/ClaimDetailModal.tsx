'use client';

import { formatDateShort } from '@rently/shared';
import { useTranslation } from 'react-i18next';
import StatusBadge from '@/components/StatusBadge';
import Modal from '@/components/Modal';
import { Claim } from '../types';
import { PRIORITY_LABELS, nextStatuses } from '../constants';

interface ClaimDetailModalProps {
  claim: Claim | null;
  updateForm: { status: string; comment: string; priority: string };
  updating: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onFieldChange: (field: string, value: string) => void;
}

export default function ClaimDetailModal({ claim, updateForm, updating, onClose, onSubmit, onFieldChange }: ClaimDetailModalProps) {
  const { t } = useTranslation('claims');
  if (!claim) return null;

  return (
    <Modal title={t(`domain:claimCategory.${claim.category}`, claim.category)} onClose={onClose} footer={
      claim.status !== 'RESOLVED' ? (
        <button className="btn btn-primary" onClick={onSubmit} disabled={updating || !updateForm.status}>
          {updating ? t('common:saving') : t('actions.saveChanges')}
        </button>
      ) : undefined
    }>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <StatusBadge status={claim.status} />
        <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_LABELS[claim.priority]?.color ?? '#6b7280' }}>
          {t('detail.priorityBadge', { priority: t(`domain:claimPriority.${claim.priority}`) })}
        </span>
      </div>
      <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{claim.description}</div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
        {t('detail.registeredOn', { date: formatDateShort(claim.createdAt) })}
      </div>

      {claim.history.length > 0 && (
        <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
            {t('detail.changeHistory')}
          </div>
          {claim.history.map((h, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: i < claim.history.length - 1 ? 8 : 0, borderBottom: i < claim.history.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 12 }}>
                {formatDateShort(h.changedAt)}
              </span>
              <div>
                <span style={{ color: 'var(--text-secondary)' }}>{t(`domain:claimStatus.${h.oldStatus}`, h.oldStatus)}</span>
                <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                <span style={{ fontWeight: 600 }}>{t(`domain:claimStatus.${h.newStatus}`, h.newStatus)}</span>
                {h.comment && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>&ldquo;{h.comment}&rdquo;</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {claim.status !== 'RESOLVED' && (
        <>
          <div className="grid-2">
            <div className="input-group">
              <label htmlFor="cl-status">{t('form.changeStatus')}</label>
              <select id="cl-status" className="rently-select" value={updateForm.status} onChange={e => onFieldChange('status', e.target.value)}>
                <option value="">{t('form.selectStatus')}</option>
                {nextStatuses(claim.status).map(o => <option key={o.value} value={o.value}>{o.value === 'OPEN' ? t('actions.reopen') : t(`domain:claimStatus.${o.value}`)}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label htmlFor="cl-priority">{t('form.priorityLabel')}</label>
              <select id="cl-priority" className="rently-select" value={updateForm.priority} onChange={e => onFieldChange('priority', e.target.value)}>
                <option value="HIGH">{t('domain:claimPriority.HIGH')}</option>
                <option value="MEDIUM">{t('domain:claimPriority.MEDIUM')}</option>
                <option value="LOW">{t('domain:claimPriority.LOW')}</option>
              </select>
            </div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label htmlFor="cl-comment">{t('form.commentOptional')}</label>
            <textarea id="cl-comment" className="rently-textarea" placeholder={t('form.changeCommentPlaceholder')} value={updateForm.comment} onChange={e => onFieldChange('comment', e.target.value)} />
          </div>
        </>
      )}
    </Modal>
  );
}
