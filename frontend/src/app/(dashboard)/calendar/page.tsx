'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import Icon from '@/components/Icon';
import Modal from '@/components/Modal';
import { useToastStore } from '@/store/toast';
import { formatMoney } from '@rently/shared';

type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  status: string;
  contract: { property: { name?: string; address: string }; tenants?: { name: string }[] };
};

type Inspection = {
  id: string;
  scheduledAt: string;
  type: string;
  notes?: string;
  property: { id: string; name?: string; address: string };
};

type Property = {
  id: string;
  name?: string;
  address: string;
  contract?: { endDate: string; tenants?: { name: string }[] };
};

type DayEvents = { payments: Payment[]; inspections: Inspection[]; contractEnds: Property[] };

const ACCENT = 'var(--accent)';
const AMBER = 'var(--warning)';
const RED = 'var(--danger)';
const PURPLE = '#8b5cf6';

function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function localYMD(iso: string) {
  const d = new Date(iso);
  return toYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
}

export default function CalendarPage() {
  const { t } = useTranslation('calendar');
  const queryClient = useQueryClient();
  // La fecha se calcula recién al montar (en el cliente) para evitar
  // mismatch de hidratación entre el "hoy" del server y el del navegador.
  const [mounted, setMounted] = useState(false);
  const [year, setYear] = useState(2000);
  const [month, setMonth] = useState(0);
  const [selectedDay, setSelectedDay] = useState('');
  const [todayYMD, setTodayYMD] = useState('');

  useEffect(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
    setSelectedDay(toYMD(now));
    setTodayYMD(toYMD(now));
    setMounted(true);
  }, []);

  // Nueva visita / inspección
  const [showNew, setShowNew] = useState(false);
  const [newType, setNewType] = useState('VISIT');
  const [newPropertyId, setNewPropertyId] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const { data: payments = [] } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then(r => r.data.data),
  });
  const { data: inspections = [] } = useQuery<Inspection[]>({
    queryKey: ['owner-inspections'],
    queryFn: () => api.get('/inspections').then(r => r.data.data),
  });
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then(r => r.data.data),
  });

  const createInspection = useMutation({
    mutationFn: (body: { propertyId: string; scheduledAt: string; notes?: string; type: string }) =>
      api.post('/inspections', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['owner-inspections'] });
      setShowNew(false);
      setNewNotes('');
    },
    onError: () => useToastStore.getState().showToast(t('createError')),
  });

  function openNewModal() {
    setNewType('VISIT');
    setNewPropertyId(properties[0]?.id ?? '');
    setNewDate(selectedDay);
    setNewNotes('');
    setShowNew(true);
  }

  function handleCreate() {
    if (!newPropertyId) { useToastStore.getState().showToast(t('selectProperty')); return; }
    if (!newDate) { useToastStore.getState().showToast(t('invalidDate')); return; }
    const dateObj = new Date(`${newDate}T12:00:00`);
    if (isNaN(dateObj.getTime())) { useToastStore.getState().showToast(t('invalidDate')); return; }
    createInspection.mutate({ propertyId: newPropertyId, scheduledAt: dateObj.toISOString(), notes: newNotes || undefined, type: newType });
  }

  const { eventMap, lateDates } = useMemo(() => {
    const map: Record<string, DayEvents> = {};
    const late = new Set<string>();
    const ensure = (ymd: string) => (map[ymd] ??= { payments: [], inspections: [], contractEnds: [] });

    for (const p of payments) {
      if (p.status === 'PAID') continue;
      const ymd = localYMD(p.dueDate);
      ensure(ymd).payments.push(p);
      if (p.status === 'LATE') late.add(ymd);
    }
    for (const i of inspections) ensure(localYMD(i.scheduledAt)).inspections.push(i);
    for (const prop of properties) {
      if (prop.contract?.endDate) ensure(localYMD(prop.contract.endDate)).contractEnds.push(prop);
    }
    return { eventMap: map, lateDates: late };
  }, [payments, inspections, properties]);

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const months = t('months', { returnObjects: true }) as string[];
  const days = t('days', { returnObjects: true }) as string[];

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1);
  }

  const cells: ({ empty: true; key: string } | { empty: false; day: number; ymd: string })[] = [];
  for (let i = 0; i < firstDayOfMonth; i++) cells.push({ empty: true, key: `e-${i}` });
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ empty: false, day, ymd: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` });
  }

  const sel = eventMap[selectedDay];
  const hasEvents = sel && (sel.payments.length || sel.inspections.length || sel.contractEnds.length);

  const Dot = ({ color }: { color: string }) => (
    <span style={{ width: 6, height: 6, borderRadius: 3, background: color, display: 'inline-block' }} />
  );

  // Hasta que se calcule la fecha en el cliente, no renderizamos el calendario
  // (evita el mismatch de hidratación por el "hoy" del server vs. navegador).
  if (!mounted) return <div style={{ minHeight: 480 }} />;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button className="btn-icon" onClick={prevMonth} aria-label="◀">
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="chevron" size={16} /></span>
        </button>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{months[month]} {year}</div>
        <button className="btn-icon" onClick={nextMonth} aria-label="▶"><Icon name="chevron" size={16} /></button>
      </div>

      {/* Grid */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
          {days.map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', padding: '6px 0' }}>{d}</div>
          ))}
          {cells.map(c => {
            if (c.empty) return <div key={c.key} />;
            const ev = eventMap[c.ymd];
            const isToday = c.ymd === todayYMD;
            const isSel = c.ymd === selectedDay;
            return (
              <button
                key={c.ymd}
                onClick={() => setSelectedDay(c.ymd)}
                style={{
                  aspectRatio: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
                  border: isToday && !isSel ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  background: isSel ? 'var(--accent)' : 'transparent',
                  color: isSel ? '#fff' : 'var(--text)',
                  cursor: 'pointer', fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
                }}
              >
                {c.day}
                <span style={{ display: 'flex', gap: 3, minHeight: 6 }}>
                  {(ev?.inspections.length ?? 0) > 0 && <Dot color={isSel ? '#fff' : ACCENT} />}
                  {(ev?.payments.length ?? 0) > 0 && <Dot color={isSel ? '#fff' : (lateDates.has(c.ymd) ? RED : AMBER)} />}
                  {(ev?.contractEnds.length ?? 0) > 0 && <Dot color={isSel ? '#fff' : PURPLE} />}
                </span>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-light)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Dot color={ACCENT} /> {t('legend.visitInspection')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Dot color={AMBER} /> {t('legend.dueDate')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Dot color={RED} /> {t('legend.overdue')}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}><Dot color={PURPLE} /> {t('legend.contractEnd')}</span>
        </div>
      </div>

      {/* Selected day events */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {selectedDay === todayYMD ? t('today') : selectedDay.split('-').reverse().join('/')}
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNewModal}>
            <Icon name="plus" size={14} /> {t('newVisit')}
          </button>
        </div>

        {!hasEvents ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center', padding: '20px 0' }}>{t('noEvents')}</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sel.inspections.map(i => (
              <div key={i.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <Dot color={ACCENT} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t(`inspectionType.${i.type}`)} · {i.property.name ?? i.property.address}</div>
                  {i.notes && <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{i.notes}</div>}
                </div>
              </div>
            ))}
            {sel.payments.map(p => (
              <div key={p.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <Dot color={p.status === 'LATE' ? RED : AMBER} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{p.contract.property.name ?? p.contract.property.address} · {p.period}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                    {formatMoney(p.amount, p.currency ?? 'USD')} · {t(`paymentStatus.${p.status}`, p.status)}
                  </div>
                </div>
              </div>
            ))}
            {sel.contractEnds.map(prop => (
              <div key={prop.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                <Dot color={PURPLE} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{t('contractEnd')} · {prop.name ?? prop.address}</div>
                  {prop.contract?.tenants?.length ? (
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>{prop.contract.tenants.map(te => te.name).join(', ')}</div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New visit modal */}
      {showNew && (
        <Modal
          title={t('modal.title')}
          onClose={() => setShowNew(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowNew(false)}>{t('common:cancel')}</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={createInspection.isPending}>
                {createInspection.isPending ? t('common:saving') : t('common:save')}
              </button>
            </>
          }
        >
          <div className="input-group">
            <label>{t('modal.typeLabel')}</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['VISIT', 'INSPECTION'] as const).map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewType(k)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 'var(--radius-sm)',
                    border: `2px solid ${newType === k ? 'var(--accent)' : 'var(--border)'}`,
                    background: newType === k ? 'var(--accent-bg)' : 'var(--bg-card)',
                    color: newType === k ? 'var(--accent)' : 'var(--text-secondary)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)',
                  }}
                >
                  {t(`inspectionType.${k}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="input-group">
            <label htmlFor="cal-property">{t('modal.propertyLabel')}</label>
            <select id="cal-property" className="rently-select" value={newPropertyId} onChange={e => setNewPropertyId(e.target.value)}>
              {properties.map(p => (
                <option key={p.id} value={p.id}>{p.name ?? p.address}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="cal-date">{t('modal.dateLabel')}</label>
            <input id="cal-date" className="input" type="date" value={newDate} onChange={e => setNewDate(e.target.value)} />
          </div>
          <div className="input-group">
            <label htmlFor="cal-notes">{t('modal.notesLabel')}</label>
            <textarea id="cal-notes" className="rently-textarea" rows={3} placeholder={t('modal.notesPlaceholder')} value={newNotes} onChange={e => setNewNotes(e.target.value)} />
          </div>
        </Modal>
      )}
    </div>
  );
}
