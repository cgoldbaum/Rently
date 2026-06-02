'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Icon from '@/components/Icon';

interface ReportSummary {
  totalIncome: number;
  paymentCount: number;
  avgPerProperty: number;
}
interface ByProperty {
  propertyId: string;
  propertyName: string;
  total: number;
  count: number;
}
interface ByMonth {
  month: string;
  total: number;
  count: number;
}
interface ReportPayment {
  id: string;
  amount: number;
  period: string;
  paidAt: string;
  property: { name?: string; address: string };
  tenant?: { name: string };
}
interface ReportData {
  summary: ReportSummary;
  by_property: ByProperty[];
  by_month: ByMonth[];
  payments: ReportPayment[];
}
interface Property {
  id: string;
  name?: string;
  address: string;
}
interface Schedule {
  id: string;
  format: 'CSV' | 'XLSX' | 'PDF';
  dayOfMonth: number;
  recipientEmail: string;
  propertyId: string | null;
  active: boolean;
  lastSentAt: string | null;
}

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}



function transformReport(raw: any): ReportData {
  const d = raw ?? {};
  const totalIncome: number = d.summary?.total_gross ?? 0;
  const payments: ReportPayment[] = (d.payments ?? []).map((p: any) => ({
    id: p.id,
    amount: p.amount,
    period: p.period,
    paidAt: p.paidDate,
    property: { name: p.contract?.property?.name, address: p.contract?.property?.address ?? '' },
    tenant: p.contract?.tenant ? { name: p.contract.tenant.name } : undefined,
  }));
  const by_property: ByProperty[] = (d.by_property ?? [])
    .map((bp: any, i: number) => ({ propertyId: String(i), propertyName: bp.name, total: bp.amount, count: 0 }))
    .sort((a: ByProperty, b: ByProperty) => b.total - a.total);
  const by_month: ByMonth[] = (d.by_month ?? []).map((bm: any) => ({ month: bm.month, total: bm.amount, count: 0 }));
  return {
    summary: {
      totalIncome,
      paymentCount: payments.length,
      avgPerProperty: by_property.length > 0 ? totalIncome / by_property.length : 0,
    },
    by_property,
    by_month,
    payments,
  };
}

export default function ReportsPage() {
  const queryClient = useQueryClient();
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [from, setFrom] = useState(toISODate(sixMonthsAgo));
  const [to, setTo] = useState(toISODate(new Date()));
  const [dateError, setDateError] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ format: 'PDF', dayOfMonth: 1, recipientEmail: '', propertyId: '' });
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });

  const params: Record<string, string> = { from, to };
  if (propertyId) params.property_id = propertyId;
  const { data: report, isPending: loading } = useQuery<ReportData | null>({
    queryKey: ['reports', 'income', { from, to, propertyId }],
    queryFn: () => api.get('/owner/reports/income', { params }).then(r => transformReport(r.data.data)),
  });

  const { data: schedules = [] } = useQuery<Schedule[]>({
    queryKey: ['reports', 'schedules'],
    queryFn: () => api.get('/owner/reports/schedules').then(r => r.data.data),
  });

  async function exportReport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      const params: Record<string, string> = { from, to, format };
      if (propertyId) params.property_id = propertyId;
      const res = await api.get('/owner/reports/income/export', {
        params,
        responseType: 'blob',
      });
      const ext = format === 'xlsx' ? 'xlsx' : 'pdf';
      const mime = format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const blob = new Blob([res.data], { type: mime });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rently-reporte-${from}-${to}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent — server error will show in network tab
    } finally {
      setExporting(null);
    }
  }

  const formatLabel: Record<string, string> = { CSV: 'CSV', XLSX: 'Excel', PDF: 'PDF' };
  function propertyLabel(id: string | null) {
    if (!id) return 'Todas las propiedades';
    const p = properties.find(pr => pr.id === id);
    return p ? (p.name ?? p.address) : 'Propiedad';
  }

  const createScheduleMutation = useMutation({
    mutationFn: () => {
      const body: Record<string, unknown> = { format: scheduleForm.format, dayOfMonth: scheduleForm.dayOfMonth };
      if (scheduleForm.recipientEmail.trim()) body.recipientEmail = scheduleForm.recipientEmail.trim();
      if (scheduleForm.propertyId) body.propertyId = scheduleForm.propertyId;
      return api.post('/owner/reports/schedules', body);
    },
    onSuccess: () => {
      setShowScheduleForm(false);
      setScheduleForm({ format: 'PDF', dayOfMonth: 1, recipientEmail: '', propertyId: '' });
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
    },
    onError: () => {
      setScheduleMsg('No se pudo crear la programación.');
      setTimeout(() => setScheduleMsg(null), 5000);
    },
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: (s: Schedule) => api.patch(`/owner/reports/schedules/${s.id}`, { active: !s.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] }),
  });

  const removeScheduleMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/owner/reports/schedules/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] }),
  });

  const runScheduleMutation = useMutation({
    mutationFn: (id: string) => api.post(`/owner/reports/schedules/${id}/run`),
    onSuccess: () => {
      setScheduleMsg('Reporte enviado por email ✓');
      queryClient.invalidateQueries({ queryKey: ['reports', 'schedules'] });
      setTimeout(() => setScheduleMsg(null), 6000);
    },
    onError: () => {
      setScheduleMsg('No se pudo enviar. Revisá la configuración de email del backend.');
      setTimeout(() => setScheduleMsg(null), 6000);
    },
  });

  async function createSchedule(e: React.FormEvent) {
    e.preventDefault();
    createScheduleMutation.mutate();
  }

  function toggleSchedule(s: Schedule) {
    toggleScheduleMutation.mutate(s);
  }

  function removeSchedule(id: string) {
    removeScheduleMutation.mutate(id);
  }

  async function runSchedule(id: string) {
    setRunningId(id);
    setScheduleMsg(null);
    runScheduleMutation.mutate(id, { onSettled: () => setRunningId(null) });
  }

  function validateDates(f: string, t: string) {
    if (f && t && f > t) {
      setDateError('La fecha "Desde" no puede ser posterior a "Hasta".');
      return;
    }
    setDateError(null);
  }

  const byProperty = report?.by_property ?? [];
  const byMonth = report?.by_month ?? [];
  const payments = report?.payments ?? [];
  const summary = report?.summary ?? { totalIncome: 0, paymentCount: 0, avgPerProperty: 0 };

  const maxProperty = byProperty.length > 0 ? byProperty[0].total : 1;
  const maxMonth = byMonth.length > 0 ? Math.max(...byMonth.map(m => m.total)) : 1;

  function fmtMonth(m: string) {
    const [y, mo] = m.split('-');
    const names = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${names[parseInt(mo, 10) - 1]} ${y.slice(2)}`;
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Reportes de ingresos por propiedad y período. Exactamente lo que necesita tu contador para la declaración de impuestos.
        </p>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label style={{ fontSize: 12 }}>Desde</label>
            <input className="input" type="date" lang="es-AR" value={from} onChange={e => { setFrom(e.target.value); validateDates(e.target.value, to); }} />
          </div>
          <div className="input-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label style={{ fontSize: 12 }}>Hasta</label>
            <input className="input" type="date" lang="es-AR" value={to} onChange={e => { setTo(e.target.value); validateDates(from, e.target.value); }} />
          </div>
          <div className="input-group" style={{ margin: 0, flex: '2 1 180px' }}>
            <label style={{ fontSize: 12 }}>Propiedad</label>
            <select className="rently-select" value={propertyId} onChange={e => setPropertyId(e.target.value)}>
              <option value="">Todas</option>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name ?? p.address}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, paddingBottom: 1 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportReport('xlsx')}
              disabled={exporting !== null || !report}
            >
              <Icon name="file" size={14} /> {exporting === 'xlsx' ? 'Exportando...' : 'Excel'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportReport('pdf')}
              disabled={exporting !== null || !report}
            >
              <Icon name="file" size={14} /> {exporting === 'pdf' ? 'Exportando...' : 'PDF'}
            </button>
          </div>
        </div>
        {dateError && (
          <div style={{ marginTop: 10, fontSize: 12, color: 'var(--danger)', fontWeight: 600 }}>
            {dateError}
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20 }}>
        <div className="stat-card green">
          <div className="stat-label">Ingresos totales</div>
          <div className="stat-value" style={{ fontSize: 22, color: 'var(--accent)' }}>
            {loading ? '…' : `USD ${summary.totalIncome.toLocaleString('es-AR')}`}
          </div>
          <div className="stat-sub">en el período</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Cobros registrados</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {loading ? '…' : summary.paymentCount}
          </div>
          <div className="stat-sub">pagos recibidos</div>
        </div>
        <div className="stat-card purple">
          <div className="stat-label">Promedio por propiedad</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {loading ? '…' : `USD ${Math.round(summary.avgPerProperty).toLocaleString('es-AR')}`}
          </div>
          <div className="stat-sub">en el período</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* By property */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Ingresos por propiedad</div>
          {byProperty.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{loading ? 'Cargando…' : 'Sin cobros en el período'}</div>
          ) : byProperty.map(r => (
            <div key={r.propertyId} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{r.propertyName}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {r.total.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(r.total / maxProperty) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), #2DD4BF)',
                  borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        {/* By month */}
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Evolución mensual</div>
          {byMonth.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{loading ? 'Cargando…' : 'Sin datos en el período'}</div>
          ) : (
            <div className="bar-chart">
              {byMonth.map(m => (
                <div className="bar-col" key={m.month}>
                  <div className="bar-value">{m.total >= 1000 ? `${Math.round(m.total / 1000)}k` : m.total}</div>
                  <div className="bar" style={{ height: `${(m.total / maxMonth) * 120}px` }} />
                  <div className="bar-label">{fmtMonth(m.month)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Detail table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Detalle para contador</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportReport('xlsx')}
              disabled={exporting !== null || !report}
            >
              <Icon name="file" size={14} /> {exporting === 'xlsx' ? '…' : 'Exportar Excel'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => exportReport('pdf')}
              disabled={exporting !== null || !report}
            >
              <Icon name="file" size={14} /> {exporting === 'pdf' ? '…' : 'Exportar PDF'}
            </button>
          </div>
        </div>
        {payments.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="chart" size={32} /></div>
            <div className="empty-text">{loading ? 'Cargando…' : 'Sin cobros en el período'}</div>
          </div>
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Propiedad</th>
                    <th>Inquilino</th>
                    <th>Período</th>
                    <th>Fecha cobro</th>
                    <th>Ingreso bruto</th>
                    <th>Fee (1%)</th>
                    <th>Ingreso neto</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 500 }}>{p.property.name ?? p.property.address}</td>
                      <td>{p.tenant?.name ?? '—'}</td>
                      <td>{p.period}</td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
                        {new Date(p.paidAt).toLocaleDateString('es-AR')}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)' }}>USD {p.amount.toLocaleString('es-AR')}</td>
                      <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                        USD {Math.round(p.amount * 0.01).toLocaleString('es-AR')}
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>
                        USD {Math.round(p.amount * 0.99).toLocaleString('es-AR')}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ fontWeight: 700 }}>
                    <td colSpan={4}>TOTAL</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>USD {summary.totalIncome.toLocaleString('es-AR')}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>
                      USD {Math.round(summary.totalIncome * 0.01).toLocaleString('es-AR')}
                    </td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>
                      USD {Math.round(summary.totalIncome * 0.99).toLocaleString('es-AR')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Reportes programados */}
      <div className="card" style={{ marginTop: 24 }}>
        <div className="card-header">
          <span className="card-title">Reportes programados por email</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowScheduleForm(s => !s)}>
            <Icon name="plus" size={14} /> {showScheduleForm ? 'Cancelar' : 'Programar envío'}
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '4px 0 16px', lineHeight: 1.5 }}>
          Rently genera y te envía por email el reporte de ingresos del mes anterior, automáticamente, el día que elijas de cada mes.
        </p>

        {scheduleMsg && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
            {scheduleMsg}
          </div>
        )}

        {showScheduleForm && (
          <form onSubmit={createSchedule} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16, padding: 14, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)' }}>
            <div className="input-group" style={{ margin: 0, flex: '1 1 110px' }}>
              <label style={{ fontSize: 12 }}>Formato</label>
              <select className="rently-select" value={scheduleForm.format} onChange={e => setScheduleForm(f => ({ ...f, format: e.target.value }))}>
                <option value="PDF">PDF</option>
                <option value="XLSX">Excel</option>
                <option value="CSV">CSV</option>
              </select>
            </div>
            <div className="input-group" style={{ margin: 0, flex: '1 1 90px' }}>
              <label style={{ fontSize: 12 }}>Día del mes</label>
              <select className="rently-select" value={scheduleForm.dayOfMonth} onChange={e => setScheduleForm(f => ({ ...f, dayOfMonth: Number(e.target.value) }))}>
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0, flex: '2 1 180px' }}>
              <label style={{ fontSize: 12 }}>Propiedad</label>
              <select className="rently-select" value={scheduleForm.propertyId} onChange={e => setScheduleForm(f => ({ ...f, propertyId: e.target.value }))}>
                <option value="">Todas</option>
                {properties.map(p => <option key={p.id} value={p.id}>{p.name ?? p.address}</option>)}
              </select>
            </div>
            <div className="input-group" style={{ margin: 0, flex: '2 1 200px' }}>
              <label style={{ fontSize: 12 }}>Email (opcional)</label>
              <input className="input" type="email" placeholder="Tu email de la cuenta" value={scheduleForm.recipientEmail} onChange={e => setScheduleForm(f => ({ ...f, recipientEmail: e.target.value }))} />
            </div>
            <button
              type="submit"
              disabled={createScheduleMutation.isPending}
              style={{ padding: '9px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700, cursor: createScheduleMutation.isPending ? 'not-allowed' : 'pointer', opacity: createScheduleMutation.isPending ? 0.6 : 1 }}
            >
              {createScheduleMutation.isPending ? 'Guardando...' : 'Crear'}
            </button>
          </form>
        )}

        {schedules.length === 0 ? (
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No tenés envíos programados todavía.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {schedules.map(s => (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 220px' }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>
                    {formatLabel[s.format]} · día {s.dayOfMonth} de cada mes
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {propertyLabel(s.propertyId)} → {s.recipientEmail}
                    {s.lastSentAt ? ` · último envío ${new Date(s.lastSentAt).toLocaleDateString('es-AR')}` : ''}
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: s.active ? 'var(--accent-bg)' : 'var(--bg-card)', color: s.active ? 'var(--accent)' : 'var(--text-muted)', border: '1px solid var(--border)' }}>
                  {s.active ? 'Activo' : 'Pausado'}
                </span>
                <button className="btn btn-secondary btn-sm" onClick={() => runSchedule(s.id)} disabled={runningId === s.id}>
                  {runningId === s.id ? 'Enviando...' : 'Enviar ahora'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => toggleSchedule(s)}>
                  {s.active ? 'Pausar' : 'Activar'}
                </button>
                <button className="btn btn-secondary btn-sm" onClick={() => removeSchedule(s.id)} title="Eliminar" style={{ color: 'var(--danger)' }}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
