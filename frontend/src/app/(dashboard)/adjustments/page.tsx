'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import Toast from '@/components/Toast';

interface Adjustment {
  id: string;
  indexType: string;
  previousAmount: number;
  newAmount: number;
  variation: number;
  appliedAt: string;
  notified: boolean;
  contract: { id: string; property: { name?: string; address: string } };
}

interface Contract {
  id: string;
  currentAmount: number;
  indexType: string;
  nextAdjustDate?: string;
  property: { name?: string; address: string; country?: string };
}

const INDEX_BY_COUNTRY: { [key: string]: { value: string; label: string; provider: string }[] } = {
  AR: [
    { value: 'IPC', label: 'IPC (INDEC)', provider: 'INDEC' },
    { value: 'ICL', label: 'ICL (BCRA)', provider: 'BCRA' },
  ],
  CL: [
    { value: 'IPC', label: 'IPC (Banco Central)', provider: 'Banco Central de Chile' },
  ],
  CO: [
    { value: 'IPC', label: 'IPC (DANE)', provider: 'DANE' },
  ],
  UY: [
    { value: 'IPC', label: 'IPC (INE)', provider: 'INE' },
  ],
};

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showSimulate, setShowSimulate] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [simResult, setSimResult] = useState<{ old: number; pct: number; newAmount: number; index: string; provider: string } | null>(null);
  const [form, setForm] = useState({ contractId: '', indexType: 'IPC', variation: '' });
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState('');
  const [indexFetch, setIndexFetch] = useState<{ loading: boolean; error: boolean }>({ loading: false, error: false });

  useEffect(() => {
    api.get('/adjustments').then(r => setAdjustments(r.data.data)).catch(() => {});
    api.get('/properties').then(r => {
      const props = r.data.data;
      const cs: Contract[] = props
        .filter((p: { contract?: Contract & { property?: { name?: string; address: string; country?: string } } }) => p.contract)
        .map((p: { contract: Contract; name?: string; address: string; country?: string }) => ({
          ...p.contract,
          property: { name: p.name, address: p.address, country: p.country },
          nextAdjustDate: p.contract?.nextAdjustDate,
        }));
      setContracts(cs);
      if (cs.length > 0) {
        const country = cs[0].property.country || 'AR';
        const firstIndex = INDEX_BY_COUNTRY[country]?.[0]?.value || 'IPC';
        setForm(f => ({ ...f, contractId: cs[0].id, indexType: firstIndex }));
      }
    }).catch(() => {});
  }, []);

  const selectedContract = contracts.find(c => c.id === form.contractId);

  const fetchCurrentIndex = useCallback(async (contractId: string, indexType: string) => {
    const contract = contracts.find(c => c.id === contractId);
    if (!contract) return;
    const country = contract.property.country || 'AR';
    setIndexFetch({ loading: true, error: false });
    setForm(f => ({ ...f, variation: '' }));
    try {
      const { data } = await api.get('/adjustments/current-index', { params: { country, indexType } });
      const value: number | null = data.data?.variation;
      if (value !== null && value !== undefined) {
        setForm(f => ({ ...f, variation: value.toFixed(2) }));
        setIndexFetch({ loading: false, error: false });
      } else {
        setIndexFetch({ loading: false, error: true });
      }
    } catch {
      setIndexFetch({ loading: false, error: true });
    }
  }, [contracts]);

  // Auto-fetch when a modal opens or when contract/indexType changes while a modal is open
  useEffect(() => {
    if ((showSimulate || showApply) && form.contractId && form.indexType) {
      fetchCurrentIndex(form.contractId, form.indexType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.contractId, form.indexType, showSimulate, showApply]);

  function simulate() {
    const contract = contracts.find(c => c.id === form.contractId);
    if (!contract) return;
    const pct = parseFloat(form.variation);
    const newAmount = Math.round(contract.currentAmount * (1 + pct / 100));
    const country = contract.property.country || 'AR';
    const idxInfo = INDEX_BY_COUNTRY[country]?.find(i => i.value === form.indexType);
    setSimResult({ old: contract.currentAmount, pct, newAmount, index: form.indexType, provider: idxInfo?.provider || '' });
  }

  async function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    const contract = contracts.find(c => c.id === form.contractId);
    if (!contract) return;
    setApplying(true);
    const pct = parseFloat(form.variation);
    const newAmount = Math.round(contract.currentAmount * (1 + pct / 100));
    try {
      const { data } = await api.post(`/contracts/${form.contractId}/adjustments`, {
        indexType: form.indexType,
        previousAmount: contract.currentAmount,
        newAmount,
        variation: pct,
        notified: true,
      });
      setAdjustments(prev => [{ ...data.data, contract: { id: form.contractId, property: contract.property } }, ...prev]);
      setShowApply(false);
      setToast('Ajuste aplicado correctamente');
    } catch {
      setToast('Error al aplicar el ajuste');
    } finally {
      setApplying(false);
    }
  }

  function handleContractChange(contractId: string) {
    const contract = contracts.find(c => c.id === contractId);
    const country = contract?.property.country || 'AR';
    const firstIndex = INDEX_BY_COUNTRY[country]?.[0]?.value || 'IPC';
    setForm(f => ({ ...f, contractId, indexType: firstIndex }));
  }

  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const upcomingContracts = contracts.filter(c => {
    if (!c.nextAdjustDate) return false;
    const next = new Date(c.nextAdjustDate);
    return next >= now && next <= in15;
  });

  const currentIndexLabel = selectedContract
    ? INDEX_BY_COUNTRY[selectedContract.property.country || 'AR']?.find(i => i.value === form.indexType)?.label
    : null;

  function IndexBadge() {
    if (indexFetch.loading) {
      return (
        <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          Consultando {currentIndexLabel}...
        </div>
      );
    }
    if (indexFetch.error) {
      return (
        <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 12, color: '#dc2626', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>No se pudo obtener el valor actual de {currentIndexLabel}. Ingresalo manualmente.</span>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 600, fontSize: 12 }} onClick={() => fetchCurrentIndex(form.contractId, form.indexType)}>
            Reintentar
          </button>
        </div>
      );
    }
    if (form.variation) {
      return (
        <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 6, fontSize: 12, color: '#15803d', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>Valor actual {currentIndexLabel}: <strong>+{parseFloat(form.variation).toFixed(2)}%</strong></span>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#15803d', fontWeight: 600, fontSize: 12 }} onClick={() => fetchCurrentIndex(form.contractId, form.indexType)}>
            Actualizar
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div style={{ fontSize: 13, color: '#15803d' }}>
          <strong>Ajustes automáticos activos</strong> — Rently aplica el ajuste automáticamente cada período usando el índice establecido en cada contrato, consultando el valor real al momento de aplicar. Se te notificará por email y en la app.
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
        <div className="stat-card purple">
          <div className="stat-label">Ajustes realizados</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{adjustments.length}</div>
          <div className="stat-sub">en total</div>
        </div>
      </div>

      {upcomingContracts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {upcomingContracts.map(c => {
            const daysLeft = Math.ceil((new Date(c.nextAdjustDate!).getTime() - now.getTime()) / 86400000);
            const country = c.property.country || 'AR';
            const idxLabel = INDEX_BY_COUNTRY[country]?.find(i => i.value === c.indexType)?.label || c.indexType;
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.property.name ?? c.property.address}</div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>Se aplicará automáticamente en {daysLeft} día{daysLeft !== 1 ? 's' : ''} · {idxLabel}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: '#fed7aa', color: '#c2410c', borderRadius: 4, padding: '2px 10px' }}>
                  Automático
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-title">Historial de ajustes</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setSimResult(null); setShowSimulate(true); }}>
            <Icon name="trending" size={16} /> Simular
          </button>
          <button className="btn btn-secondary" onClick={() => setShowApply(true)}>
            <Icon name="plus" size={16} /> Ajuste manual
          </button>
        </div>
      </div>

      {adjustments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="trending" size={32} /></div>
            <div className="empty-text">No hay ajustes registrados</div>
          </div>
        </div>
      ) : adjustments.map(a => (
        <div key={a.id} className="adjustment-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{a.contract.property.name ?? a.contract.property.address}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {new Date(a.appliedAt).toLocaleDateString('es-AR')} · Índice {a.indexType}
              </div>
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

      {/* Simulate Modal */}
      {showSimulate && (
        <Modal
          title="Simular Ajuste"
          onClose={() => { setShowSimulate(false); setSimResult(null); }}
          footer={
            simResult ? (
              <button className="btn btn-primary" onClick={() => { setShowSimulate(false); setSimResult(null); }}>Cerrar</button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => { setShowSimulate(false); setSimResult(null); }}>Cancelar</button>
                <button className="btn btn-primary" onClick={simulate} disabled={!form.contractId || !form.variation || indexFetch.loading}>Calcular</button>
              </>
            )
          }
        >
          {!simResult ? (
            <>
              <div className="input-group">
                <label>Propiedad</label>
                <select className="rently-select" value={form.contractId} onChange={e => handleContractChange(e.target.value)}>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.property.name ?? c.property.address} — USD {c.currentAmount}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label>Índice</label>
                <select className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
                  {selectedContract && INDEX_BY_COUNTRY[selectedContract.property.country || 'AR']?.map(idx => (
                    <option key={idx.value} value={idx.value}>{idx.label}</option>
                  ))}
                </select>
              </div>
              <IndexBadge />
              <div className="input-group">
                <label>Variación (%)</label>
                <input className="input" type="number" step="0.01" placeholder="Cargando..." value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>Resultado de la simulación</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>{currentIndexLabel}{simResult.provider ? ` · ${simResult.provider}` : ''}</div>
              <div className="adj-amounts" style={{ justifyContent: 'center', fontSize: 20 }}>
                <span className="adj-old" style={{ fontSize: 20 }}>USD {simResult.old.toLocaleString('es-AR')}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>→</span>
                <span className="adj-new" style={{ fontSize: 24 }}>USD {simResult.newAmount.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="adj-pct" style={{ fontSize: 14 }}>+{simResult.pct.toFixed(2)}%</span>
              </div>
              <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                Diferencia: USD {(simResult.newAmount - simResult.old).toLocaleString('es-AR')} / mes
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Apply Modal */}
      {showApply && (
        <Modal title="Ajuste Manual (Override)" onClose={() => setShowApply(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowApply(false)}>Cancelar</button>
            <button className="btn btn-primary" onClick={applyAdjustment} disabled={applying || !form.contractId || !form.variation || indexFetch.loading}>
              {applying ? 'Aplicando...' : 'Aplicar'}
            </button>
          </>
        }>
          <div style={{ padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: 12, color: '#854d0e', marginBottom: 12 }}>
            Los ajustes se aplican automáticamente. Usá esta opción sólo para corregir o aplicar un ajuste fuera del ciclo automático.
          </div>
          <div className="input-group">
            <label>Propiedad</label>
            <select className="rently-select" value={form.contractId} onChange={e => handleContractChange(e.target.value)}>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.property.name ?? c.property.address} — USD {c.currentAmount}</option>
              ))}
            </select>
          </div>
          {selectedContract && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
              Monto actual: <strong style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>USD {selectedContract.currentAmount.toLocaleString('es-AR')}</strong>
            </div>
          )}
          <div className="input-group">
            <label>Índice</label>
            <select className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
              {selectedContract && INDEX_BY_COUNTRY[selectedContract.property.country || 'AR']?.map(idx => (
                <option key={idx.value} value={idx.value}>{idx.label}</option>
              ))}
            </select>
          </div>
          <IndexBadge />
          <div className="input-group">
            <label>Variación (%)</label>
            <input className="input" type="number" step="0.01" placeholder="Cargando..." value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
          </div>
          {selectedContract && form.variation && (
            <div style={{ padding: '10px 14px', background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)' }}>
              Nuevo monto: <strong style={{ fontFamily: 'var(--mono)' }}>
                USD {Math.round(selectedContract.currentAmount * (1 + parseFloat(form.variation || '0') / 100)).toLocaleString('es-AR')}
              </strong>
            </div>
          )}
        </Modal>
      )}

      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </>
  );
}
