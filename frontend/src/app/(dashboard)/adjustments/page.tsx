'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToastStore } from '@/store/toast';
import { formatDateShort } from '@rently/shared';
import { INDEX_BY_COUNTRY } from '@/lib/constants';

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

export default function AdjustmentsPage() {
  const { t } = useTranslation('contracts');
  const queryClient = useQueryClient();
  const [showSimulate, setShowSimulate] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [simResult, setSimResult] = useState<{ old: number; pct: number; newAmount: number; index: string; provider: string } | null>(null);
  const [form, setForm] = useState({ contractId: '', indexType: 'IPC', variation: '' });
  const [explanation, setExplanation] = useState('');
  const [explaining, setExplaining] = useState(false);

  const { data: adjustments = [] } = useQuery<Adjustment[]>({
    queryKey: ['adjustments'],
    queryFn: () => api.get('/adjustments').then(r => r.data.data),
  });

  const { data: contracts = [] } = useQuery<Contract[]>({
    queryKey: ['contracts'],
    queryFn: () => api.get('/properties').then(r => {
      const props = r.data.data;
      const cs: Contract[] = props
        .filter((p: { contract?: Contract & { property?: { name?: string; address: string; country?: string } } }) => p.contract)
        .map((p: { contract: Contract; name?: string; address: string; country?: string }) => ({
          ...p.contract,
          property: { name: p.name, address: p.address, country: p.country },
          nextAdjustDate: p.contract?.nextAdjustDate,
        }));
      if (cs.length > 0) {
        const country = cs[0].property.country || 'AR';
        const available = INDEX_BY_COUNTRY[country] ?? INDEX_BY_COUNTRY['AR'];
        const defaultIndex = available.find(i => i.value === cs[0].indexType)?.value ?? available[0]?.value ?? 'IPC';
        setForm(f => ({ ...f, contractId: cs[0].id, indexType: defaultIndex }));
      }
      return cs;
    }),
  });

  const selectedContract = contracts.find(c => c.id === form.contractId);
  const country = selectedContract?.property.country || 'AR';

  const { data: currentIndexVariation, isFetching: indexFetching, isError: indexError } = useQuery<number | null>({
    queryKey: ['adjustments', 'current-index', country, form.indexType],
    queryFn: () => api.get('/adjustments/current-index', { params: { country, indexType: form.indexType } }).then(r => r.data.data?.variation as number | null),
    enabled: (showSimulate || showApply) && !!form.contractId && !!form.indexType && form.indexType !== 'MANUAL',
  });

  useEffect(() => {
    // Sincroniza el campo de variación con el índice traído por la query.
    /* eslint-disable react-hooks/set-state-in-effect */
    if ((showSimulate || showApply) && form.indexType === 'MANUAL') {
      setForm(f => ({ ...f, variation: '' }));
    } else if (currentIndexVariation !== null && currentIndexVariation !== undefined && !indexFetching) {
      setForm(f => ({ ...f, variation: currentIndexVariation.toFixed(2) }));
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [currentIndexVariation, indexFetching, form.indexType, showSimulate, showApply]);

  function simulate() {
    const contract = contracts.find(c => c.id === form.contractId);
    if (!contract) return;
    const pct = parseFloat(form.variation);
    const newAmount = Math.round(contract.currentAmount * (1 + pct / 100));
    const country = contract.property.country || 'AR';
    const idxInfo = INDEX_BY_COUNTRY[country]?.find(i => i.value === form.indexType);
    setExplanation('');
    setSimResult({ old: contract.currentAmount, pct, newAmount, index: form.indexType, provider: idxInfo?.provider || '' });
  }

  async function handleExplain() {
    if (!simResult || explaining) return;
    setExplaining(true);
    try {
      const res = await api.post('/ai/explain-adjustment', {
        previousAmount: simResult.old,
        newAmount: simResult.newAmount,
        percentage: simResult.pct,
        indexType: simResult.index,
      });
      setExplanation(res.data.data.text?.trim() ?? '');
    } catch {
      useToastStore.getState().showToast(t('adjustments.explainError'));
    } finally {
      setExplaining(false);
    }
  }

  const applyMutation = useMutation({
    mutationFn: () => {
      const contract = contracts.find(c => c.id === form.contractId);
      if (!contract) throw new Error('No contract');
      const pct = parseFloat(form.variation);
      const newAmount = Math.round(contract.currentAmount * (1 + pct / 100));
      return api.post(`/contracts/${form.contractId}/adjustments`, {
        indexType: form.indexType,
        previousAmount: contract.currentAmount,
        newAmount,
        variation: pct,
        notified: true,
      });
    },
    onSuccess: () => {
      setShowApply(false);
      useToastStore.getState().showToast(t('adjustments.success'));
      queryClient.invalidateQueries({ queryKey: ['adjustments'] });
    },
    onError: () => {
      useToastStore.getState().showToast(t('adjustments.error'));
    },
  });

  function applyAdjustment(e: React.FormEvent) {
    e.preventDefault();
    applyMutation.mutate();
  }

  function handleContractChange(contractId: string) {
    const contract = contracts.find(c => c.id === contractId);
    const country = contract?.property.country || 'AR';
    const available = INDEX_BY_COUNTRY[country] ?? INDEX_BY_COUNTRY['AR'];
    const defaultIndex = available.find(i => i.value === contract?.indexType)?.value ?? available[0]?.value ?? 'IPC';
    setForm(f => ({ ...f, contractId, indexType: defaultIndex }));
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

  function renderIndexBadge() {
    if (form.indexType === 'MANUAL') return null;
    if (indexFetching) {
      return (
        <div style={{ padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 6, fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' }} />
          {t('adjustments.fetchingIndex', { index: currentIndexLabel })}
        </div>
      );
    }
    if (indexError) {
      return (
        <div style={{ padding: '8px 12px', background: 'var(--danger-bg)', border: '1px solid var(--danger-border)', borderRadius: 6, fontSize: 12, color: 'var(--danger)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>{t('adjustments.fetchErrorManual', { index: currentIndexLabel })}</span>
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontWeight: 600, fontSize: 12 }} onClick={() => queryClient.invalidateQueries({ queryKey: ['adjustments', 'current-index', country, form.indexType] })}>
            {t('adjustments.retry')}
          </button>
        </div>
      );
    }
    if (form.variation) {
      return (
        <div style={{ padding: '8px 12px', background: 'var(--accent-bg)', border: '1px solid var(--accent-dim)', borderRadius: 6, fontSize: 12, color: 'var(--accent)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span dangerouslySetInnerHTML={{ __html: t('adjustments.currentIndexValue', { index: currentIndexLabel, value: parseFloat(form.variation).toFixed(2) }) }} />
          <button type="button" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent)', fontWeight: 600, fontSize: 12 }} onClick={() => queryClient.invalidateQueries({ queryKey: ['adjustments', 'current-index', country, form.indexType] })}>
            {t('adjustments.refresh')}
          </button>
        </div>
      );
    }
    return null;
  }

  return (
    <>
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(1, 1fr)' }}>
        <div className="stat-card purple">
          <div className="stat-label">{t('adjustments.title')}</div>
          <div className="stat-value" style={{ fontSize: 22 }}>{adjustments.length}</div>
          <div className="stat-sub">{t('adjustments.applied')}</div>
        </div>
      </div>

      {upcomingContracts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {upcomingContracts.map(c => {
            const daysLeft = Math.ceil((new Date(c.nextAdjustDate!).getTime() - now.getTime()) / 86400000);
            const country = c.property.country || 'AR';
            const idxLabel = c.indexType === 'MANUAL' ? 'Manual' : (INDEX_BY_COUNTRY[country]?.find(i => i.value === c.indexType)?.label || c.indexType);
            return (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>⏰</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.property.name ?? c.property.address}</div>
                  <div style={{ fontSize: 12, color: 'var(--warning)' }}>{t('adjustments.autoApplyIn', { days: daysLeft, count: daysLeft, index: idxLabel })}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--warning-bg)', color: 'var(--warning)', borderRadius: 4, padding: '2px 10px' }}>
                  {t('adjustments.auto')}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <span className="card-title">{t('adjustments.history')}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => { setSimResult(null); setShowSimulate(true); }}>
            <Icon name="trending" size={16} /> {t('adjustments.simulate')}
          </button>
          <button className="btn btn-secondary" onClick={() => setShowApply(true)}>
            <Icon name="plus" size={16} /> {t('adjustments.applyManual')}
          </button>
        </div>
      </div>

      {adjustments.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon"><Icon name="trending" size={32} /></div>
            <div className="empty-text">{t('adjustments.noAdjustments')}</div>
          </div>
        </div>
      ) : adjustments.map(a => (
        <div key={a.id} className="adjustment-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{a.contract.property.name ?? a.contract.property.address}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                {formatDateShort(a.appliedAt)} · {t('adjustments.indexType', { index: a.indexType })}
              </div>
            </div>
            <div className="adj-pct">+{a.variation.toFixed(1)}%</div>
          </div>
          <div className="adj-amounts">
            <span className="adj-old">USD {a.previousAmount.toLocaleString('es-AR')}</span>
            <span style={{ color: 'var(--text-muted)' }}>→</span>
            <span className="adj-new">USD {a.newAmount.toLocaleString('es-AR')}</span>
          </div>
          {a.notified && <div style={{ marginTop: 8, fontSize: 12, color: 'var(--accent)' }}>{t('adjustments.bothNotified')}</div>}
        </div>
      ))}

      {/* Simulate Modal */}
      {showSimulate && (
        <Modal
          title={t('adjustments.simulateTitle')}
          onClose={() => { setShowSimulate(false); setSimResult(null); }}
          footer={
            simResult ? (
              <button className="btn btn-primary" onClick={() => { setShowSimulate(false); setSimResult(null); }}>{t('adjustments.close')}</button>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => { setShowSimulate(false); setSimResult(null); }}>{t('adjustments.cancel')}</button>
                <button className="btn btn-primary" onClick={simulate} disabled={!form.contractId || !form.variation || indexFetching}>{t('adjustments.calculate')}</button>
              </>
            )
          }
        >
          {!simResult ? (
            <>
              <div className="input-group">
                <label htmlFor="sim-property">{t('adjustments.propertyLabel')}</label>
                <select id="sim-property" className="rently-select" value={form.contractId} onChange={e => handleContractChange(e.target.value)}>
                  {contracts.map(c => (
                    <option key={c.id} value={c.id}>{c.property.name ?? c.property.address} — USD {c.currentAmount}</option>
                  ))}
                </select>
              </div>
              <div className="input-group">
                <label htmlFor="sim-index">{t('adjustments.indexType')}</label>
                <select id="sim-index" className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
                  {selectedContract && INDEX_BY_COUNTRY[selectedContract.property.country || 'AR']?.map(idx => (
                    <option key={idx.value} value={idx.value}>{idx.label}</option>
                  ))}
                </select>
              </div>
              {renderIndexBadge()}
              <div className="input-group">
                <label htmlFor="sim-variation">{t('adjustments.variationPercent')}</label>
                <input id="sim-variation" className="input" type="number" step="0.01" placeholder={form.indexType === 'MANUAL' ? t('adjustments.variationPlaceholder') : t('common:loading')} value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>{t('adjustments.simulationResult')}</div>
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
                {t('adjustments.differencePerMonth', { amount: 'USD ' + (simResult.newAmount - simResult.old).toLocaleString('en-US') })}
              </div>

              <button
                type="button"
                onClick={handleExplain}
                disabled={explaining}
                style={{
                  marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', fontSize: 13, fontWeight: 600,
                  background: 'var(--accent-bg)', color: 'var(--accent)',
                  border: '1px solid var(--accent)', borderRadius: 999,
                  cursor: explaining ? 'not-allowed' : 'pointer',
                  opacity: explaining ? 0.5 : 1, fontFamily: 'var(--font)',
                }}
              >
                {explaining ? t('adjustments.explaining') : t('adjustments.explain')}
              </button>

              {explanation && (
                <div style={{ marginTop: 14, textAlign: 'left', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>🤖</span>
                  <span style={{ whiteSpace: 'pre-wrap' }}>{explanation}</span>
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Apply Modal */}
      {showApply && (
        <Modal title={t('adjustments.manualOverrideTitle')} onClose={() => setShowApply(false)} footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowApply(false)}>{t('adjustments.cancel')}</button>
            <button className="btn btn-primary" onClick={applyAdjustment} disabled={applyMutation.isPending || !form.contractId || !form.variation || indexFetching}>
              {applyMutation.isPending ? t('adjustments.applying') : t('adjustments.apply')}
            </button>
          </>
        }>
          <div style={{ padding: '8px 12px', background: 'var(--warning-bg)', border: '1px solid var(--warning)', borderRadius: 6, fontSize: 12, color: 'var(--warning)', marginBottom: 12 }}>
            {t('adjustments.manualOverrideDesc')}
          </div>
          <div className="input-group">
            <label htmlFor="adj-property">{t('adjustments.propertyLabel')}</label>
            <select id="adj-property" className="rently-select" value={form.contractId} onChange={e => handleContractChange(e.target.value)}>
              {contracts.map(c => (
                <option key={c.id} value={c.id}>{c.property.name ?? c.property.address} — USD {c.currentAmount}</option>
              ))}
            </select>
          </div>
          {selectedContract && (
            <div style={{ padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
              {t('adjustments.currentAmount')}: <strong style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>USD {selectedContract.currentAmount.toLocaleString('en-US')}</strong>
            </div>
          )}
          <div className="input-group">
            <label htmlFor="adj-index">{t('adjustments.indexType')}</label>
            <select id="adj-index" className="rently-select" value={form.indexType} onChange={e => setForm(f => ({ ...f, indexType: e.target.value }))}>
              {selectedContract && INDEX_BY_COUNTRY[selectedContract.property.country || 'AR']?.map(idx => (
                <option key={idx.value} value={idx.value}>{idx.label}</option>
              ))}
            </select>
          </div>
          {renderIndexBadge()}
          <div className="input-group">
            <label htmlFor="adj-variation">{t('adjustments.variationPercent')}</label>
            <input id="adj-variation" className="input" type="number" step="0.01" placeholder={form.indexType === 'MANUAL' ? t('adjustments.variationPlaceholder') : t('common:loading')} value={form.variation} onChange={e => setForm(f => ({ ...f, variation: e.target.value }))} />
          </div>
          {selectedContract && form.variation && (
            <div style={{ padding: '10px 14px', background: 'var(--accent-bg)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent)' }}>
              {t('adjustments.newAmountLabel')}: <strong style={{ fontFamily: 'var(--mono)' }}>
                USD {Math.round(selectedContract.currentAmount * (1 + parseFloat(form.variation || '0') / 100)).toLocaleString('es-AR')}
              </strong>
            </div>
          )}
        </Modal>
      )}

    </>
  );
}
