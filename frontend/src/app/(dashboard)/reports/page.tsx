'use client';

import { useEffect, useState, useCallback } from 'react';
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

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function ReportsPage() {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const [from, setFrom] = useState(toISODate(sixMonthsAgo));
  const [to, setTo] = useState(toISODate(new Date()));
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<Property[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<'xlsx' | 'pdf' | null>(null);

  useEffect(() => {
    api.get('/properties').then(r => setProperties(r.data.data)).catch(() => {});
  }, []);

  const fetchReport = useCallback(() => {
    setLoading(true);
    const params: Record<string, string> = { from, to };
    if (propertyId) params.propertyId = propertyId;
    api.get('/owner/reports/income', { params })
      .then(r => setReport(r.data.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false));
  }, [from, to, propertyId]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  async function exportReport(format: 'xlsx' | 'pdf') {
    setExporting(format);
    try {
      const params: Record<string, string> = { from, to, format };
      if (propertyId) params.propertyId = propertyId;
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
            <input className="input" type="date" value={from} onChange={e => setFrom(e.target.value)} />
          </div>
          <div className="input-group" style={{ margin: 0, flex: '1 1 140px' }}>
            <label style={{ fontSize: 12 }}>Hasta</label>
            <input className="input" type="date" value={to} onChange={e => setTo(e.target.value)} />
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
    </>
  );
}
