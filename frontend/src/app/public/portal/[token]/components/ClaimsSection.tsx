'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@rently/shared';

const CAT: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};
const CLAIM_STATUS: Record<string, { label: string; color: string }> = {
  OPEN:        { label: 'Abierto',  color: '#2563eb' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706' },
  RESOLVED:    { label: 'Resuelto', color: '#16a34a' },
};

interface Claim {
  id: string; category: string; description: string;
  status: string; priority: string; createdAt: string;
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
}

interface ClaimForm {
  category: 'PLUMBING' | 'ELECTRICITY' | 'STRUCTURE' | 'OTHER' | '';
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
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {!showForm ? (
        <Button
          onClick={onToggleForm}
          style={{ background: '#6366f1', color: '#fff', border: 'none', alignSelf: 'flex-start' }}
        >
          + Reportar un problema
        </Button>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle style={{ fontSize: 16 }}>Nuevo reclamo</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Label>Categoría *</Label>
                <Select value={formData.category} onValueChange={(v) => v && onFormFieldChange('category', v)}>
                  <SelectTrigger><SelectValue placeholder="Seleccioná una categoría" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(CAT).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Descripción *</Label>
                <Textarea
                  value={formData.description}
                  onChange={e => onFormFieldChange('description', e.target.value)}
                  rows={4}
                  placeholder="Describí el problema en detalle..."
                />
              </div>
              <div>
                <Label>URL de foto (opcional)</Label>
                <Input
                  value={formData.photoUrl}
                  onChange={e => onFormFieldChange('photoUrl', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              {formError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>{formError}</p>}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={onSubmit} disabled={isSubmitting} style={{ background: '#6366f1', color: '#fff', border: 'none' }}>
                  {isSubmitting ? 'Enviando...' : 'Enviar reclamo'}
                </Button>
                <Button variant="outline" onClick={onCancelForm}>
                  Cancelar
                </Button>
              </div>
              {submitError && <p style={{ color: '#dc2626', fontSize: 13, margin: 0 }}>Error al enviar. Intentá de nuevo.</p>}
              {submitSuccess && <p style={{ color: '#16a34a', fontSize: 13, margin: 0 }}>✓ Reclamo enviado. El propietario te contactará.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {claims.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', color: '#9ca3af' }}>
          No hay reclamos registrados
        </div>
      ) : (
        claims.map((c) => {
          const st = CLAIM_STATUS[c.status] ?? { label: c.status, color: '#6b7280' };
          return (
            <Card key={c.id}>
              <CardContent style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{CAT[c.category] ?? c.category}</div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.color, background: `${st.color}15`, padding: '2px 8px', borderRadius: 6 }}>
                    {st.label}
                  </span>
                </div>
                <p style={{ color: '#4b5563', fontSize: 13, margin: '0 0 8px', lineHeight: 1.5 }}>{c.description}</p>
                {c.history.length > 0 && (
                  <div style={{ fontSize: 12, color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 8, marginTop: 8 }}>
                    {c.history.map((h, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        {new Date(h.changedAt).toLocaleDateString('es-AR')} · {CLAIM_STATUS[h.oldStatus]?.label ?? h.oldStatus} → <strong>{CLAIM_STATUS[h.newStatus]?.label ?? h.newStatus}</strong>
                        {h.comment && <span> · &quot;{h.comment}&quot;</span>}
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                  Reportado el {formatDate(c.createdAt)}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
