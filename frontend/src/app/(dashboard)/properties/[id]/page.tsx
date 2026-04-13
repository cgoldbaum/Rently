'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import StatusBadge from '@/components/StatusBadge';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Tenant {
  id: string; name: string; email: string; phone?: string; linkToken: string;
}
interface Contract {
  id: string; startDate: string; endDate: string; initialAmount: number; currentAmount: number;
  paymentDay: number; indexType: string; adjustFrequency: number; nextAdjustDate: string;
  tenant?: Tenant;
}
interface Property {
  id: string; name?: string; address: string; type: string; surface: number; status: string;
  antiquity?: number;
  contract?: Contract;
}
interface Claim {
  id: string; category: string; description: string; status: string; priority: string;
  photoUrl?: string; createdAt: string;
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
}
interface AdjustmentHistory {
  id: string; indexType: string; previousAmount: number; newAmount: number; variation: number; appliedAt: string; notified: boolean;
}
interface Payment {
  id: string; amount: number; period: string; dueDate: string; paidDate?: string; status: string; method?: string;
}

const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Comercial', PH: 'PH',
};
const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelto',
};
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Alta',  color: '#dc2626' },
  MEDIUM: { label: 'Media', color: '#d97706' },
  LOW:    { label: 'Baja',  color: '#6b7280' },
};
function nextStatuses(current: string) {
  if (current === 'OPEN')        return [{ value: 'IN_PROGRESS', label: 'En curso' }, { value: 'RESOLVED', label: 'Resuelto' }];
  if (current === 'IN_PROGRESS') return [{ value: 'OPEN', label: 'Reabrir' }, { value: 'RESOLVED', label: 'Resuelto' }];
  return [];
}
const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

const tabs = [
  ['overview', 'General'], ['contract', 'Contrato'], ['tenant', 'Inquilino'],
  ['payments', 'Pagos'], ['claims', 'Reclamos'], ['adjustments', 'Ajustes'],
];

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [tab, setTab] = useState('overview');
  const [toast, setToast] = useState('');

  // Edit property modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', type: 'APARTMENT', surface: '', antiquity: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Contract modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ startDate: '', endDate: '', initialAmount: '', paymentDay: '1', indexType: 'ICL', adjustFrequency: '3' });
  const [savingContract, setSavingContract] = useState(false);

  // Tenant modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '' });
  const [savingTenant, setSavingTenant] = useState(false);

  // Claim update modal
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimUpdate, setClaimUpdate] = useState({ status: '', comment: '', priority: '' });
  const [updatingClaim, setUpdatingClaim] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', period: '', dueDate: '', method: 'Transferencia' });
  const [savingPayment, setSavingPayment] = useState(false);

  useEffect(() => {
    api.get(`/properties/${id}`).then(r => setProperty(r.data.data)).catch(() => router.push('/properties'));
    api.get(`/properties/${id}/claims`).then(r => setClaims(r.data.data)).catch(() => {});
  }, [id, router]);

  useEffect(() => {
    if (!property?.contract?.id) return;
    api.get(`/contracts/${property.contract.id}/adjustments`).then(r => setAdjustments(r.data.data)).catch(() => {});
    api.get(`/contracts/${property.contract.id}/payments`).then(r => setPayments(r.data.data)).catch(() => {});
  }, [property?.contract?.id]);

  function openEditModal() {
    if (!property) return;
    setEditForm({
      name: property.name ?? '',
      address: property.address,
      type: property.type,
      surface: String(property.surface),
      antiquity: property.antiquity != null ? String(property.antiquity) : '',
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSavingEdit(true);
    try {
      const { data } = await api.patch(`/properties/${id}`, {
        name: editForm.name || undefined,
        address: editForm.address,
        type: editForm.type,
        surface: parseFloat(editForm.surface),
        antiquity: editForm.antiquity ? parseInt(editForm.antiquity) : undefined,
      });
      setProperty(p => p ? { ...p, ...data.data } : p);
      setShowEditModal(false);
      setToast('Propiedad actualizada');
    } catch {
      setToast('Error al guardar los cambios');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault();
    if (!property) return;
    setSavingContract(true);
    try {
      const payload = {
        startDate: new Date(contractForm.startDate).toISOString(),
        endDate: new Date(contractForm.endDate).toISOString(),
        initialAmount: parseFloat(contractForm.initialAmount),
        paymentDay: parseInt(contractForm.paymentDay),
        indexType: contractForm.indexType,
        adjustFrequency: parseInt(contractForm.adjustFrequency),
      };
      const { data } = property.contract
        ? await api.patch(`/properties/${id}/contract`, payload)
        : await api.post(`/properties/${id}/contract`, payload);
      setProperty(p => p ? { ...p, contract: data.data } : p);
      setShowContractModal(false);
      setToast('Contrato guardado');
    } catch {
      setToast('Error al guardar el contrato');
    } finally {
      setSavingContract(false);
    }
  }

  async function handleSaveTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!property?.contract?.id) return;
    setSavingTenant(true);
    try {
      const { data } = await api.post(`/contracts/${property.contract.id}/tenant`, tenantForm);
      setProperty(p => p && p.contract ? { ...p, contract: { ...p.contract, tenant: data.data } } : p);
      setShowTenantModal(false);
      setToast('Inquilino vinculado');
    } catch {
      setToast('Error al vincular inquilino');
    } finally {
      setSavingTenant(false);
    }
  }

  async function handleUpdateClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClaim || !claimUpdate.status) return;
    setUpdatingClaim(true);
    try {
      const { data } = await api.patch(`/claims/${selectedClaim.id}`, {
        status: claimUpdate.status,
        comment: claimUpdate.comment || undefined,
        priority: claimUpdate.priority || undefined,
      });
      const updated = data.data;
      setClaims(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setSelectedClaim(updated);
      setClaimUpdate({ status: '', comment: '', priority: updated.priority });
      setToast('Reclamo actualizado');
    } catch {
      setToast('Error al actualizar el reclamo');
    } finally {
      setUpdatingClaim(false);
    }
  }

  async function handleAddPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!property?.contract?.id) return;
    setSavingPayment(true);
    try {
      const { data } = await api.post(`/contracts/${property.contract.id}/payments`, {
        amount: parseFloat(paymentForm.amount),
        period: paymentForm.period,
        dueDate: new Date(paymentForm.dueDate).toISOString(),
        method: paymentForm.method,
        status: 'PENDING',
      });
      setPayments(prev => [data.data, ...prev]);
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', period: '', dueDate: '', method: 'Transferencia' });
      setToast('Pago registrado');
    } catch {
      setToast('Error al registrar pago');
    } finally {
      setSavingPayment(false);
    }
  }

  function openContractModal() {
    if (property?.contract) {
      const c = property.contract;
      setContractForm({
        startDate: c.startDate.slice(0, 10),
        endDate: c.endDate.slice(0, 10),
        initialAmount: String(c.initialAmount),
        paymentDay: String(c.paymentDay),
        indexType: c.indexType,
        adjustFrequency: String(c.adjustFrequency),
      });
    }
    setShowContractModal(true);
  }

  if (!property) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  const publicLink = property.contract?.tenant?.linkToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/public/portal/${property.contract.tenant.linkToken}`
    : null;

  return (
    <>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => router.back()}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>{property.name ?? property.address}</div>
          {property.name && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{property.address}</div>}
        </div>
        <StatusBadge status={property.status} />
        <button className="btn btn-secondary btn-sm" onClick={openEditModal}>
          <Icon name="edit" size={14} /> Editar
        </button>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {tabs.map(([v, l]) => (
          <button key={v} className={`tab${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <div className="grid-2">
          <div className="card">
            <div className="card-title" style={{ marginBottom: 16 }}>Datos del inmueble</div>
            {[
              ['Tipo', TYPE_LABELS[property.type] ?? property.type],
              ['Superficie', `${property.surface} m²`],
              ['Antigüedad', property.antiquity != null ? `${property.antiquity} años` : '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                <span style={{ fontWeight: 600 }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setTab('contract')}>
                <Icon name="file" size={14} /> Contrato
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => setTab('claims')}>
                <Icon name="clipboard" size={14} /> Reclamos ({claims.filter(c => c.status === 'OPEN').length})
              </button>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div className="card-title">Inquilino</div>
              {property.contract && !property.contract.tenant && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowTenantModal(true)}>
                  <Icon name="plus" size={14} /> Vincular
                </button>
              )}
            </div>
            {property.contract?.tenant ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                    {property.contract.tenant.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{property.contract.tenant.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{property.contract.tenant.email}</div>
                  </div>
                </div>
                {false && publicLink && (
                  <div />
                )}
              </>
            ) : !property.contract ? (
              <div className="empty-state">
                <div className="empty-icon"><Icon name="file" size={32} /></div>
                <div className="empty-text">Primero creá un contrato</div>
                <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={openContractModal}>
                  <Icon name="plus" size={14} /> Crear contrato
                </button>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><Icon name="users" size={32} /></div>
                <div className="empty-text">Sin inquilino asignado</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Contract */}
      {tab === 'contract' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Contrato de alquiler</span>
            <button className="btn btn-primary btn-sm" onClick={openContractModal}>
              <Icon name={property.contract ? 'edit' : 'plus'} size={14} />
              {property.contract ? 'Editar' : 'Crear contrato'}
            </button>
          </div>
          {property.contract ? (
            <>
              {[
                ['Inicio', new Date(property.contract.startDate).toLocaleDateString('es-AR')],
                ['Vencimiento', new Date(property.contract.endDate).toLocaleDateString('es-AR')],
                ['Monto inicial', `USD ${property.contract.initialAmount.toLocaleString('es-AR')}`],
                ['Monto actual', `USD ${property.contract.currentAmount.toLocaleString('es-AR')}`],
                ['Día de pago', `Día ${property.contract.paymentDay}`],
                ['Índice de ajuste', property.contract.indexType],
                ['Frecuencia de ajuste', `Cada ${property.contract.adjustFrequency} meses`],
                ['Próximo ajuste', new Date(property.contract.nextAdjustDate).toLocaleDateString('es-AR')],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="file" size={32} /></div>
              <div className="empty-text">No hay contrato activo</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Tenant */}
      {tab === 'tenant' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Inquilino</span>
            {property.contract && !property.contract.tenant && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowTenantModal(true)}>
                <Icon name="plus" size={14} /> Vincular inquilino
              </button>
            )}
          </div>
          {property.contract?.tenant ? (
            <>
              {[
                ['Nombre', property.contract.tenant.name],
                ['Email', property.contract.tenant.email],
                ['Teléfono', property.contract.tenant.phone ?? '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border-light)', fontSize: 14 }}>
                  <span style={{ color: 'var(--text-secondary)' }}>{k}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              {false && publicLink && (
                <div />
              )}
            </>
          ) : !property.contract ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="file" size={32} /></div>
              <div className="empty-text">Primero creá un contrato</div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="users" size={32} /></div>
              <div className="empty-text">Sin inquilino asignado</div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Payments */}
      {tab === 'payments' && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Historial de cobros</span>
            {property.contract && (
              <button className="btn btn-primary btn-sm" onClick={() => setShowPaymentModal(true)}>
                <Icon name="plus" size={14} /> Registrar cobro
              </button>
            )}
          </div>
          {payments.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Icon name="dollar" size={32} /></div>
              <div className="empty-text">Sin cobros registrados</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Período</th><th>Monto</th><th>Vencimiento</th><th>Método</th><th>Estado</th></tr></thead>
                <tbody>
                  {payments.map(pay => (
                    <tr key={pay.id}>
                      <td style={{ fontWeight: 500 }}>{pay.period}</td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {pay.amount.toLocaleString('es-AR')}</td>
                      <td>{new Date(pay.dueDate).toLocaleDateString('es-AR')}</td>
                      <td>{pay.method ?? '—'}</td>
                      <td><StatusBadge status={pay.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Claims */}
      {tab === 'claims' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{claims.length} reclamo{claims.length !== 1 ? 's' : ''}</span>
          </div>
          {claims.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Icon name="clipboard" size={32} /></div>
                <div className="empty-text">Sin reclamos registrados</div>
              </div>
            </div>
          ) : claims.map(c => (
            <div key={c.id} className={`claim-card priority-${c.priority}`} onClick={() => { setSelectedClaim(c); setClaimUpdate({ status: '', comment: '', priority: c.priority }); }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div className="claim-title">{CAT_LABELS[c.category] ?? c.category}</div>
                  <div className="claim-meta">{new Date(c.createdAt).toLocaleDateString('es-AR')} · Prioridad {c.priority === 'HIGH' ? 'Alta' : c.priority === 'MEDIUM' ? 'Media' : 'Baja'}</div>
                </div>
                <StatusBadge status={c.status} />
              </div>
              <div className="claim-desc">{c.description}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Adjustments */}
      {tab === 'adjustments' && (
        <div>
          {adjustments.length === 0 ? (
            <div className="card">
              <div className="empty-state">
                <div className="empty-icon"><Icon name="trending" size={32} /></div>
                <div className="empty-text">Sin ajustes registrados</div>
              </div>
            </div>
          ) : adjustments.map(a => (
            <div key={a.id} className="adjustment-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>Ajuste {a.indexType}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{new Date(a.appliedAt).toLocaleDateString('es-AR')}</div>
                </div>
                <div className="adj-pct">+{a.variation.toFixed(1)}%</div>
              </div>
              <div className="adj-amounts">
                <span className="adj-old">USD {a.previousAmount.toLocaleString('es-AR')}</span>
                <span style={{ color: 'var(--text-muted)' }}>→</span>
                <span className="adj-new">USD {a.newAmount.toLocaleString('es-AR')}</span>
              </div>
              {a.notified && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)' }}>✓ Ambas partes notificadas</div>}
            </div>
          ))}
        </div>
      )}

      {/* Edit Property Modal */}
      {showEditModal && (
        <Modal title="Editar propiedad" onClose={() => setShowEditModal(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </>
        }>
          <form onSubmit={handleSaveEdit}>
            <div className="grid-2">
              <div className="input-group">
                <label>Nombre / Identificador</label>
                <input className="input" placeholder="Ej: Depto 3A - Palermo" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="input-group">
                <label>Dirección *</label>
                <input className="input" placeholder="Ej: Thames 1842, CABA" value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Tipo *</label>
                <select className="rently-select" value={editForm.type} onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}>
                  <option value="APARTMENT">Departamento</option>
                  <option value="HOUSE">Casa</option>
                  <option value="COMMERCIAL">Comercial</option>
                  <option value="PH">PH</option>
                </select>
              </div>
              <div className="input-group">
                <label>Superficie (m²) *</label>
                <input className="input" type="number" placeholder="58" value={editForm.surface} onChange={e => setEditForm(f => ({ ...f, surface: e.target.value }))} required />
              </div>
            </div>
            <div className="input-group">
              <label>Antigüedad (años)</label>
              <input className="input" type="number" min="0" placeholder="10" value={editForm.antiquity} onChange={e => setEditForm(f => ({ ...f, antiquity: e.target.value }))} />
            </div>
          </form>
        </Modal>
      )}

      {/* Contract Modal */}
      {showContractModal && (
        <Modal title={property.contract ? 'Editar Contrato' : 'Nuevo Contrato'} onClose={() => setShowContractModal(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowContractModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveContract} disabled={savingContract}>
              {savingContract ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }>
          <form onSubmit={handleSaveContract}>
            <div className="grid-2">
              <div className="input-group">
                <label>Fecha inicio</label>
                <input className="input" type="date" value={contractForm.startDate} onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Fecha fin</label>
                <input className="input" type="date" value={contractForm.endDate} onChange={e => setContractForm(f => ({ ...f, endDate: e.target.value }))} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Monto inicial (USD)</label>
                <input className="input" type="number" placeholder="400" value={contractForm.initialAmount} onChange={e => setContractForm(f => ({ ...f, initialAmount: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Día de pago</label>
                <input className="input" type="number" min="1" max="31" placeholder="15" value={contractForm.paymentDay} onChange={e => setContractForm(f => ({ ...f, paymentDay: e.target.value }))} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Índice de ajuste</label>
                <select className="rently-select" value={contractForm.indexType} onChange={e => setContractForm(f => ({ ...f, indexType: e.target.value }))}>
                  <option value="ICL">ICL (BCRA)</option>
                  <option value="IPC">IPC (INDEC)</option>
                </select>
              </div>
              <div className="input-group">
                <label>Frecuencia (meses)</label>
                <input className="input" type="number" min="1" placeholder="3" value={contractForm.adjustFrequency} onChange={e => setContractForm(f => ({ ...f, adjustFrequency: e.target.value }))} required />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Tenant Modal */}
      {showTenantModal && (
        <Modal title="Vincular Inquilino" onClose={() => setShowTenantModal(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTenantModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleSaveTenant} disabled={savingTenant || !tenantForm.name || !tenantForm.email}>
              {savingTenant ? 'Vinculando...' : 'Vincular'}
            </button>
          </>
        }>
          <form onSubmit={handleSaveTenant}>
            <div className="input-group">
              <label>Nombre completo</label>
              <input className="input" placeholder="Nombre del inquilino" value={tenantForm.name} onChange={e => setTenantForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Email</label>
                <input className="input" type="email" placeholder="email@ejemplo.com" value={tenantForm.email} onChange={e => setTenantForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Teléfono</label>
                <input className="input" placeholder="+54 11 ..." value={tenantForm.phone} onChange={e => setTenantForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Claim Detail Modal */}
      {selectedClaim && (
        <Modal title={`${CAT_LABELS[selectedClaim.category] ?? selectedClaim.category}`} onClose={() => setSelectedClaim(null)} footer={
          selectedClaim.status !== 'RESOLVED' ? (
            <button className="btn btn-primary" onClick={handleUpdateClaim} disabled={updatingClaim || !claimUpdate.status}>
              {updatingClaim ? 'Guardando...' : 'Guardar cambios'}
            </button>
          ) : undefined
        }>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
            <StatusBadge status={selectedClaim.status} />
            <span style={{ fontSize: 12, fontWeight: 600, color: PRIORITY_LABELS[selectedClaim.priority]?.color ?? '#6b7280' }}>
              Prioridad {PRIORITY_LABELS[selectedClaim.priority]?.label ?? selectedClaim.priority}
            </span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 8 }}>{selectedClaim.description}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
            Registrado: {new Date(selectedClaim.createdAt).toLocaleDateString('es-AR')}
          </div>

          {selectedClaim.history.length > 0 && (
            <div style={{ marginBottom: 20, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 10 }}>
                Historial de cambios
              </div>
              {selectedClaim.history.map((h, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingBottom: 8, marginBottom: i < selectedClaim.history.length - 1 ? 8 : 0, borderBottom: i < selectedClaim.history.length - 1 ? '1px solid var(--border-light)' : 'none', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0, fontSize: 12 }}>
                    {new Date(h.changedAt).toLocaleDateString('es-AR')}
                  </span>
                  <div>
                    <span style={{ color: 'var(--text-secondary)' }}>{STATUS_LABELS[h.oldStatus] ?? h.oldStatus}</span>
                    <span style={{ margin: '0 6px', color: 'var(--text-muted)' }}>→</span>
                    <span style={{ fontWeight: 600 }}>{STATUS_LABELS[h.newStatus] ?? h.newStatus}</span>
                    {h.comment && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>"{h.comment}"</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {selectedClaim.status !== 'RESOLVED' && (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label>Cambiar estado</label>
                  <select className="rently-select" value={claimUpdate.status} onChange={e => setClaimUpdate(f => ({ ...f, status: e.target.value }))}>
                    <option value="">Seleccioná...</option>
                    {nextStatuses(selectedClaim.status).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Prioridad</label>
                  <select className="rently-select" value={claimUpdate.priority} onChange={e => setClaimUpdate(f => ({ ...f, priority: e.target.value }))}>
                    <option value="HIGH">Alta</option>
                    <option value="MEDIUM">Media</option>
                    <option value="LOW">Baja</option>
                  </select>
                </div>
              </div>
              <div className="input-group" style={{ marginBottom: 0 }}>
                <label>Comentario (opcional)</label>
                <textarea className="rently-textarea" placeholder="Agregar un comentario sobre el cambio..." value={claimUpdate.comment} onChange={e => setClaimUpdate(f => ({ ...f, comment: e.target.value }))} />
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <Modal title="Registrar cobro" onClose={() => setShowPaymentModal(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={handleAddPayment} disabled={savingPayment}>
              {savingPayment ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }>
          <form onSubmit={handleAddPayment}>
            <div className="grid-2">
              <div className="input-group">
                <label>Período (ej: 2026-04)</label>
                <input className="input" placeholder="2026-04" value={paymentForm.period} onChange={e => setPaymentForm(f => ({ ...f, period: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Monto (USD)</label>
                <input className="input" type="number" placeholder="400" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} required />
              </div>
            </div>
            <div className="grid-2">
              <div className="input-group">
                <label>Vencimiento</label>
                <input className="input" type="date" value={paymentForm.dueDate} onChange={e => setPaymentForm(f => ({ ...f, dueDate: e.target.value }))} required />
              </div>
              <div className="input-group">
                <label>Método</label>
                <input className="input" placeholder="Transferencia" value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))} />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
