'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Icon from '@/components/Icon';

interface Payment {
  id: string;
  amount: number;
  period: string;
  status: string;
  contract: {
    property: { name?: string; address: string };
    tenant?: { name: string };
  };
}

export default function ReportsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    api.get('/payments').then(r => setPayments(r.data.data)).catch(() => {});
  }, []);

  // Group paid payments by property for breakdown
  const paidPayments = payments.filter(p => p.status === 'PAID');
  const byProperty: Record<string, { name: string; total: number; tenant: string }> = {};
  for (const p of paidPayments) {
    const name = p.contract.property.name ?? p.contract.property.address;
    if (!byProperty[name]) byProperty[name] = { name, total: 0, tenant: p.contract.tenant?.name ?? '—' };
    byProperty[name].total += p.amount;
  }
  const propertyRows = Object.values(byProperty).sort((a, b) => b.total - a.total);
  const maxTotal = propertyRows.length > 0 ? propertyRows[0].total : 1;
  const grandTotal = propertyRows.reduce((s, r) => s + r.total, 0);

  // Static monthly chart (last 6 months visual reference)
  const months = ['Oct', 'Nov', 'Dic', 'Ene', 'Feb', 'Mar'];
  const incomes = [1680, 1750, 1820, 1903, 1950, 2030];
  const maxInc = Math.max(...incomes);

  function exportCSV() {
    const rows = [
      ['Propiedad', 'Inquilino', 'Período', 'Ingreso bruto', 'Fee (1%)', 'Ingreso neto'],
      ...propertyRows.map(r => [
        r.name,
        r.tenant,
        'Histórico',
        `USD ${r.total}`,
        `USD ${Math.round(r.total * 0.01)}`,
        `USD ${Math.round(r.total * 0.99)}`,
      ]),
      ['TOTAL', '', '', `USD ${grandTotal}`, `USD ${Math.round(grandTotal * 0.01)}`, `USD ${Math.round(grandTotal * 0.99)}`],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rently-reporte.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Reportes de ingresos por propiedad y período. Exactamente lo que necesita tu contador para la declaración de impuestos.
        </p>
      </div>

      <div className="grid-2" style={{ marginBottom: 24 }}>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Ingresos por propiedad (histórico)</div>
          {propertyRows.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Sin cobros pagados aún</div>
          ) : propertyRows.map(r => (
            <div key={r.name} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span>{r.name}</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>USD {r.total.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${(r.total / maxTotal) * 100}%`,
                  background: 'linear-gradient(90deg, var(--accent), #2DD4BF)',
                  borderRadius: 3,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: 16 }}>Evolución de ingresos (referencia)</div>
          <div className="bar-chart">
            {months.map((m, i) => (
              <div className="bar-col" key={m}>
                <div className="bar-value">{incomes[i]}</div>
                <div className="bar" style={{ height: `${(incomes[i] / maxInc) * 120}px` }} />
                <div className="bar-label">{m}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Detalle para contador</span>
          <button className="btn btn-secondary btn-sm" onClick={exportCSV}>
            <Icon name="file" size={14} /> Exportar CSV
          </button>
        </div>
        {propertyRows.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><Icon name="chart" size={32} /></div>
            <div className="empty-text">Sin cobros registrados</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Propiedad</th><th>Inquilino</th><th>Período</th><th>Ingreso bruto</th><th>Fee (1%)</th><th>Ingreso neto</th></tr>
              </thead>
              <tbody>
                {propertyRows.map(r => (
                  <tr key={r.name}>
                    <td style={{ fontWeight: 500 }}>{r.name}</td>
                    <td>{r.tenant}</td>
                    <td>Histórico</td>
                    <td style={{ fontFamily: 'var(--mono)' }}>USD {r.total.toLocaleString('es-AR')}</td>
                    <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>USD {Math.round(r.total * 0.01).toLocaleString('es-AR')}</td>
                    <td style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--accent)' }}>USD {Math.round(r.total * 0.99).toLocaleString('es-AR')}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td colSpan={3}>TOTAL</td>
                  <td style={{ fontFamily: 'var(--mono)' }}>USD {grandTotal.toLocaleString('es-AR')}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--text-muted)' }}>USD {Math.round(grandTotal * 0.01).toLocaleString('es-AR')}</td>
                  <td style={{ fontFamily: 'var(--mono)', color: 'var(--accent)' }}>USD {Math.round(grandTotal * 0.99).toLocaleString('es-AR')}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
