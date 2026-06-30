'use client';

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate, formatDateShort } from '@rently/shared';

const CAT_KEYS = ['PLUMBING', 'ELECTRICITY', 'STRUCTURE', 'OTHER'] as const;
type CatKey = typeof CAT_KEYS[number];

const CLAIM_STATUS_COLORS: Record<string, { color: string }> = {
  OPEN:        { color: '#2563eb' },
  IN_PROGRESS: { color: '#d97706' },
  RESOLVED:    { color: '#16a34a' },
};

interface Claim {
  id: string; category: string; description: string;
  status: string; priority: string; createdAt: string;
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
}

interface ClaimForm {
  category: CatKey | '';
  description: string; photoUrl: string;
}

interface ClaimsSectionProps {
  claims: Claim[];
  showForm: boolean;
  formData: ClaimForm;
  formError: string;
  isSubmitting: boolean;
  submitError: boolean;
  submitSuccess: boolean;
  onToggleForm: () => void;
  onFormFieldChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onCancelForm: () => void;
}

export default function ClaimsSection({
  claims, showForm, formData, formError,
  isSubmitting, submitError, submitSuccess,
  onToggleForm, onFormFieldChange, onSubmit, onCancelForm,
}: ClaimsSectionProps) {
  const { t } = useTranslation('portal');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!showForm ? (
        <Button
          onClick={onToggleForm}
          style={{ background: '#6366f1', color: '#fff', border: 'none', alignSelf: 'flex-start' }}
        >
          {t('claims.reportButton')}
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: 16 }}>{t('claims.newClaimTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>{t('claims.categoryLabel')}</Label>
                <Select value={formData.category} onValueChange={(v) => v && onFormFieldChange('category', v)}>
                  <SelectTrigger><SelectValue placeholder={t('claims.categoryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {CAT_KEYS.map((v) => (
                      <SelectItem key={v} value={v}>{t(`domain:claimCategory.${v}`)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('claims.descriptionLabel')}</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => onFormFieldChange('description', e.target.value)}
                  rows={4}
                  placeholder={t('claims.descriptionPlaceholder')}
                />
              </div>
              <div>
                <Label>{t('claims.photoLabel')}</Label>
                <Input
                  value={formData.photoUrl}
                  onChange={e => onFormFieldChange('photoUrl', e.target.value)}
                  placeholder={t('claims.photoPlaceholder')}
                />
              </div>
              {formError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={onSubmit} disabled={isSubmitting} style={{ background: '#6366f1', color: '#fff', border: 'none' }}>
                  {isSubmitting ? t('claims.submitting') : t('claims.submitButton')}
                </Button>
                <Button variant="outline" onClick={onCancelForm}>
                  {t('common:cancel')}
                </Button>
              </div>
              {submitError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{t('claims.submitError')}</p>}
              {submitSuccess && <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>{t('claims.submitSuccess')}</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {claims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', color: '#9ca3af' }}>
          {t('claims.noClaims')}
        </div>
      ) : (
        claims.map((c) => {
          const stColor = CLAIM_STATUS_COLORS[c.status]?.color ?? '#6b7280';
          const stLabel = t(`domain:claimStatus.${c.status}`, c.status);
          return (
            <Card key={c.id}>
              <CardContent style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t(`domain:claimCategory.${c.category}`, c.category)}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: stColor, background: `${stColor}15`, padding: '2px 8px', borderRadius: 6 }}>
                    {stLabel}
                  </span>
                </div>
                <p style={{ color: '#4b5563', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{c.description}</p>
                {c.history.length > 0 && (
                  <div style={{ fontSize: 12, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 8, marginTop: 8 }}>
                    {c.history.map((h, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        {formatDateShort(h.changedAt)} · {t(`domain:claimStatus.${h.oldStatus}`, h.oldStatus)} → <strong>{t(`domain:claimStatus.${h.newStatus}`, h.newStatus)}</strong>
                        {h.comment && <span> · &quot;{h.comment}&quot;</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  {t('claims.reportedOn', { date: formatDate(c.createdAt) })}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
