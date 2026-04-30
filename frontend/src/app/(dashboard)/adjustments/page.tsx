'use client';

import { useEffect, useState } from 'react';
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
  property: { name?: string; address: string };
}

export default function AdjustmentsPage() {
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [showSimulate, setShowSimulate] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [simResult, setSimResult] = useState<{ old: number; pct: number; newAmount: number; index: string } | null>(null);
  const [form, setForm] = useState({ contractId: '', indexType: 'ICL', variation: '4.2' });
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    api.get('/adjustments').then(r => setAdjustments(r.data.data)).catch(() => {});
    // Load all contracts
    api.get('/properties').then(r => {
      const props = r.data.data;
      const cs: Contract[] = props
        .filter((p: { contract?: Contract & { property?: { name?: string; address: string } } }) => p.contract)
        .map((p: { contract: Contract; name?: string; address: string }) => ({
          ...p.contract,
          property: { name: p.name, address: p.address },
          nextAdjustDate: p.contract?.nextAdjustDate,
        }));
      setContracts(cs);
      if (cs.length > 0) setForm(f => ({ ...f, contractId: cs[0].id }));
    }).catch(() => {});
  }, []);

  function simulate() {
    const contract = contracts.find(c => c.id === form.contractId);
    if (!contract) return;
    const pct = parseFloat(form.variation);
    const newAmount = Math.round(contract.currentAmount * (1 + pct / 100));
    setSimResult({ old: contract.currentAmount, pct, newAmount, index: form.indexType });
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

  const selectedContract = contracts.find(c => c.id === form.contractId);

  const now = new Date();
  const in15 = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const upcomingContracts = contracts.filter(c => {
    if (!c.nextAdjustDate) return false;
    const next = new Date(c.nextAdjustDate);
    return next >= now && next <= in15;
  });

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 20 }}>⚡</span>
        <div style={{ fontSize: 13, color: '#15803d' }}>
          <strong>Ajustes automáticos activos</strong> — Rently aplica el ajuste automáticamente cada período usando el índice ({' '}
          <strong>IPC</strong> o <strong>ICL</strong>) establecido en cada contrato. Se te notificará por email y en la app cuando se aplique.
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card green">
          <div className="stat-label">ICL BCRA</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent)' }}>automático</div>
          <div className="stat-sub">se obtiene al aplicar</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">IPC INDEC</div>
          <div className="stat-value" style={{ fontSize: 22 }}>automático</div>
          <div className="stat-sub">se obtiene al aplicar</div>
        </div>
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
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.property.name ?? c.property.address}</div>
                  <div style={{ fontSize: 12, color: '#92400e' }}>Se aplicará automáticamente en {daysLeft} día{daysLeft !== 1 ? 's' : ''} · Índice {c.indexType}</div>
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
                <button className="btn btn-primary" onClick={simulate} disabled={!form.contractId}>Calcular</button>
              </>
            )
          }
        >
          {!simResult ? (
            <>
              <div className="input-group">
                <label>Propiedad</label>
                <select className="rently-select" value={form.contractId} onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))}>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.property.name ?? c.property.address} — USD {c.currentAmount}</option>
                  ))}
                </select>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label>Índice</label>
                  <select className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
                    <option value="ICL">ICL (BCRA) — 4.2%</option>
                    <option value="IPC">IPC (INDEC) — 3.8%</option>
                  </select>
                </div>
                <div className="input-group">
                  <label>Variación (%)</label>
                  <input className="input" type="number" step="0.1" value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Resultado de la simulación</div>
              <div className="adj-amounts" style={{ justifyContent: 'center', fontSize: 20 }}>
                <span className="adj-old" style={{ fontSize: 20 }}>USD {simResult.old.toLocaleString('es-AR')}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 20 }}>→</span>
                <span className="adj-new" style={{ fontSize: 24 }}>USD {simResult.newAmount.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ marginTop: 12 }}>
                <span className="adj-pct" style={{ fontSize: 14 }}>+{simResult.pct.toFixed(1)}% ({simResult.index})</span>
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
            <button className="btn btn-primary" onClick={applyAdjustment} disabled={applying || !form.contractId}>
              {applying ? 'Aplicando...' : 'Aplicar'}
            </button>
          </>
        }>
          <div style={{ padding: '8px 12px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 6, fontSize: 12, color: '#854d0e', marginBottom: 12 }}>
            Los ajustes se aplican automáticamente. Usá esta opción sólo para corregir o aplicar un ajuste fuera del ciclo automático.
          </div>
          <div className="input-group">
            <label>Propiedad</label>
            <select className="rently-select" value={form.contractId} onChange={e => setForm(f => ({ ...f, contractId: e.target.value }))}>
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
          <div className="grid-2">
            <div className="input-group">
              <label>Índice</label>
              <select className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
                <option value="ICL">ICL (BCRA)</option>
                <option value="IPC">IPC (INDEC)</option>
              </select>
            </div>
            <div className="input-group">
              <label>Variación (%)</label>
              <input className="input" type="number" step="0.1" value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
            </div>
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
