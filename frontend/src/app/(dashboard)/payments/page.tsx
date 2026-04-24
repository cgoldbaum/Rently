'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Toast from '@/components/Toast';
import Modal from '@/components/Modal';

interface Payment {
  id: string;
  amount: number;
  period: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  contract: {
    property: { name?: string; address: string };
    tenant?: { name: string };
  };
}

interface Property {
  id: string;
  name?: string;
  address: string;
  contract?: {
    currentAmount: number;
    tenant?: { name: string };
  };
}

interface PaymentLink {
  id: string;
  mpInitPoint: string;
  amount: number;
  period: string;
  status: string;
  createdAt: string;
}

const filters = [['all', 'Todos'], ['PAID', 'Pagados'], ['PENDING', 'Pendientes'], ['LATE', 'En mora']];

const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  'Efectivo':      { label: 'Efectivo',      color: '#166534', bg: '#dcfce7' },
  'Mercado Pago':  { label: 'Mercado Pago',  color: '#1d4ed8', bg: '#dbeafe' },
  'Transferencia': { label: 'Transferencia', color: '#374151', bg: '#f3f4f6' },
};

function MethodBadge({ method }: { method?: string }) {
  if (!method) return <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>;
  const cfg = METHOD_CONFIG[method] ?? { label: method, color: '#374151', bg: '#f3f4f6' };
  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 4, padding: '2px 8px' }}>
      {cfg.label}
    </span>
  );
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState('');
  const [pendingPayment, setPendingPayment] = useState<Payment | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('Transferencia');
  const [confirming, setConfirming] = useState(false);

  // MP payment link modal
  const [showMpModal, setShowMpModal] = useState(false);
  const [mpForm, setMpForm] = useState({ propertyId: '', amount: '', period: '', description: '' });
  const [mpLoading, setMpLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<PaymentLink | null>(null);
  const [activeLinks, setActiveLinks] = useState<Record<string, PaymentLink[]>>({});

  useEffect(() => {
    api.get('/payments').then(r => setPayments(r.data.data)).catch(() => {});
    api.get('/properties').then(async r => {
      const props: Property[] = r.data.data.filter((p: Property) => p.contract?.tenant);
      setProperties(props);
      if (props.length > 0 && !mpForm.propertyId) {
        setMpForm(f => ({ ...f, propertyId: props[0].id, amount: String(props[0].contract?.currentAmount ?? '') }));
      }
      const linksMap: Record<string, PaymentLink[]> = {};
      await Promise.all(props.map(async p => {
        try {
          const res = await api.get(`/properties/${p.id}/payment-links`);
          linksMap[p.id] = res.data.data;
        } catch {
          linksMap[p.id] = [];
        }
      }));
      setActiveLinks(linksMap);
    }).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter);
  const totalPaid = payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0);
  const pending   = payments.filter(p => p.status === 'PENDING' || p.status === 'LATE').reduce((s, p) => s + p.amount, 0);
  const lateCount = payments.filter(p => p.status === 'LATE').length;

  function openMarkPaid(payment: Payment) {
    setPendingPayment(payment);
    setSelectedMethod('Transferencia');
  }

  async function confirmMarkPaid() {
    if (!pendingPayment) return;
    setConfirming(true);
    try {
      const { data } = await api.patch(`/payments/${pendingPayment.id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        method: selectedMethod,
      });
      setPayments(prev => prev.map(p => p.id === pendingPayment.id ? { ...p, ...data.data } : p));
      setPendingPayment(null);
      setToast('Cobro registrado como pagado');
    } catch {
      setToast('Error al actualizar el cobro');
    } finally {
      setConfirming(false);
    }
  }

  function openMpModal() {
    setGeneratedLink(null);
    const firstProp = properties[0];
    if (firstProp) {
      setMpForm({ propertyId: firstProp.id, amount: String(firstProp.contract?.currentAmount ?? ''), period: '', description: '' });
    }
    setShowMpModal(true);
  }

  function handlePropertyChange(propertyId: string) {
    const prop = properties.find(p => p.id === propertyId);
    setMpForm(f => ({ ...f, propertyId, amount: String(prop?.contract?.currentAmount ?? '') }));
  }

  async function handleGenerateLink() {
    if (!mpForm.propertyId || !mpForm.amount || !mpForm.period) return;
    setMpLoading(true);
    try {
      const { data } = await api.post(`/properties/${mpForm.propertyId}/payment-links`, {
        amount: parseFloat(mpForm.amount),
        period: mpForm.period,
        description: mpForm.description || undefined,
      });
      const link: PaymentLink = data.data.link;
      setGeneratedLink({ ...link, mpInitPoint: data.data.initPoint });
      setActiveLinks(prev => ({
        ...prev,
        [mpForm.propertyId]: [link, ...(prev[mpForm.propertyId] ?? [])],
      }));
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      setToast(msg ?? 'Error al generar el link de pago');
    } finally {
      setMpLoading(false);
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url);
    setToast('Link copiado al portapapeles');
  }

  const selectedProp = properties.find(p => p.id === mpForm.propertyId);

  return (
    <>
      <div className="stats-grid">
        <div className="stat-card hero">
          <div className="stat-label">Total cobrado</div>
          <div className="stat-value">USD {totalPaid.toLocaleString('es-AR')}</div>
          <div className="stat-sub">en cobros pagados</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Pendiente</div>
          <div className="stat-value" style={{ color: pending > 0 ? 'var(--danger)' : 'inherit' }}>
            USD {pending.toLocaleString('es-AR')}
          </div>
          <div className="stat-sub">{lateCount > 0 ? `${lateCount} en mora` : 'todo al día ✓'}</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Cobros totales</div>
          <div className="stat-value">{payments.length}</div>
          <div className="stat-sub">registrados</div>
        </div>
        <div className="stat-card green">
          <div className="stat-label">Pagados</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>{payments.filter(p => p.status === 'PAID').length}</div>
          <div className="stat-sub">confirmados</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs" style={{ marginBottom: 0 }}>
            {filters.map(([v, l]) => (
              <button key={v} className={`tab${filter === v ? ' active' : ''}`} onClick={() => setFilter(v)}>{l}</button>
            ))}
          </div>
          {properties.length > 0 && (
            <button className="btn btn-primary btn-sm" onClick={openMpModal}>
              <Icon name="dollar" size={14} /> Generar link MP
            </button>
          )}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="dollar" size={32} /></div>
            <div className="empty-text">No hay cobros{filter !== 'all' ? ' en este estado' : ''}</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Propiedad</th><th>Inquilino</th><th>Período</th>
                  <th>Monto</th><th>Vencimiento</th><th>Método</th><th>Estado</th><th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.contract.property.name ?? p.contract.property.address}</td>
                    <td>{p.contract.tenant?.name ?? '—'}</td>
                    <td>{p.period}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {p.amount.toLocaleString('es-AR')}</td>
                    <td>{new Date(p.dueDate).toLocaleDateString('es-AR')}</td>
                    <td><MethodBadge method={p.method} /></td>
                    <td><StatusBadge status={p.status} /></td>
                    <td>
                      {(p.status === 'PENDING' || p.status === 'LATE') && (
                        <button className="btn btn-sm btn-secondary" onClick={() => openMarkPaid(p)}>
                          <Icon name="check" size={13} /> Marcar pagado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Active MP links per property */}
      {properties.some(p => (activeLinks[p.id] ?? []).length > 0) && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-title" style={{ marginBottom: 12 }}>Links de Mercado Pago activos</div>
          {properties.map(p => {
            const links = (activeLinks[p.id] ?? []).filter(l => l.status === 'ACTIVE');
            if (!links.length) return null;
            return (
              <div key={p.id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>{p.name ?? p.address}</div>
                {links.map(link => (
                  <div key={link.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, marginBottom: 4, fontSize: 13 }}>
                    <span style={{ flex: 1 }}>Período {link.period} · USD {link.amount.toLocaleString('es-AR')}</span>
                    <span style={{ fontSize: 11, background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>Activo</span>
                    <button className="btn btn-secondary btn-sm" onClick={() => copyLink(link.mpInitPoint)}>Copiar link</button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Mark Paid Modal */}
      {pendingPayment && (
        <Modal
          title="Registrar pago"
          onClose={() => setPendingPayment(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPendingPayment(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={confirmMarkPaid} disabled={confirming}>
                {confirming ? 'Guardando...' : 'Confirmar pago'}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {pendingPayment.contract.property.name ?? pendingPayment.contract.property.address}
              {pendingPayment.contract.tenant && ` · ${pendingPayment.contract.tenant.name}`}
            </div>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22 }}>
              USD {pendingPayment.amount.toLocaleString('es-AR')}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Período {pendingPayment.period}</div>
          </div>
          <div className="input-group" style={{ marginBottom: 0 }}>
            <label>Método de pago</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              {Object.entries(METHOD_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelectedMethod(key)}
                  style={{
                    flex: 1, padding: '10px 8px', borderRadius: 8,
                    border: selectedMethod === key ? `2px solid ${cfg.color}` : '2px solid var(--border)',
                    background: selectedMethod === key ? cfg.bg : 'var(--bg-elevated)',
                    color: selectedMethod === key ? cfg.color : 'var(--text-secondary)',
                    fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
                  }}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {/* Mercado Pago Link Modal */}
      {showMpModal && (
        <Modal
          title="Generar link de pago (Mercado Pago)"
          onClose={() => { setShowMpModal(false); setGeneratedLink(null); }}
          footer={
            generatedLink ? (
              <button className="btn btn-primary" onClick={() => { setShowMpModal(false); setGeneratedLink(null); }}>
                Cerrar
              </button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => setShowMpModal(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={handleGenerateLink} disabled={mpLoading || !mpForm.propertyId || !mpForm.amount || !mpForm.period}>
                  {mpLoading ? 'Generando...' : 'Generar link'}
                </button>
              </>
            )
          }
        >
          {generatedLink ? (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
              <div style={{ fontWeight: 700, marginBottom: 8 }}>Link generado correctamente</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                Período {generatedLink.period} · USD {generatedLink.amount.toLocaleString('es-AR')}
              </div>
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 12px', fontSize: 12, wordBreak: 'break-all', marginBottom: 12 }}>
                {generatedLink.mpInitPoint}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={() => copyLink(generatedLink.mpInitPoint)}>
                  Copiar link
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="input-group">
                <label>Propiedad</label>
                <select className="rently-select" value={mpForm.propertyId} onChange={e => handlePropertyChange(e.target.value)}>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>{p.name ?? p.address} — {p.contract?.tenant?.name}</option>
                  ))}
                </select>
              </div>
              {selectedProp?.contract && (
                <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  Monto actual del contrato: <strong>USD {selectedProp.contract.currentAmount.toLocaleString('es-AR')}</strong>
                </div>
              )}
              <div className="grid-2">
                <div className="input-group">
                  <label>Monto (USD)</label>
                  <input className="input" type="number" placeholder="400" value={mpForm.amount} onChange={e => setMpForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label>Período (ej: 2026-04)</label>
                  <input className="input" placeholder="2026-04" value={mpForm.period} onChange={e => setMpForm(f => ({ ...f, period: e.target.value }))} />
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Descripción (opcional)</label>
                <input className="input" placeholder="Alquiler + expensas..." value={mpForm.description} onChange={e => setMpForm(f => ({ ...f, description: e.target.value }))} />
              </div>
            </>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
