import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  RefreshControl,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { formatMoney } from '@rently/shared';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/lib/api';
import { dmyToYmd, ymdToDmy } from '../../src/lib/dates';

type Inspection = {
  id: string;
  propertyId: string;
  scheduledAt: string;
  notes?: string;
  type: string;
  property: { id: string; name?: string; address: string };
};

type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  status: string;
  contract: { property: { name?: string; address: string }; tenants?: { name: string }[] };
};

type Property = { id: string; name?: string; address: string };

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  PAID: { color: '#16a34a', bg: '#dcfce7' },
  PENDING: { color: '#b45309', bg: '#fef3c7' },
  LATE: { color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { color: '#c2410c', bg: '#ffedd5' },
};

function toYMD(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(isoStr: string) {
  const d = new Date(isoStr);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export default function OwnerCalendar() {
  const { t } = useTranslation('calendar');
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(toYMD(today));
  const [showNewModal, setShowNewModal] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newType, setNewType] = useState('VISIT');
  const [newPropertyId, setNewPropertyId] = useState('');

  const { data: inspections = [], isLoading: loadingInsp, isRefetching: refetchingInsp, refetch: refetchInsp } =
    useQuery<Inspection[]>({
      queryKey: ['owner-inspections'],
      queryFn: () => api.get('/inspections').then((r) => r.data.data),
      refetchInterval: 30000,
    });

  const { data: payments = [], isLoading: loadingPay, isRefetching: refetchingPay, refetch: refetchPay } =
    useQuery<Payment[]>({
      queryKey: ['owner-payments'],
      queryFn: () => api.get('/payments').then((r) => r.data.data),
    });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then((r) => r.data.data),
  });

  const createInspection = useMutation({
    mutationFn: (data: { propertyId: string; scheduledAt: string; notes?: string; type: string }) =>
      api.post('/inspections', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-inspections'] });
      setShowNewModal(false);
      setNewDate('');
      setNewNotes('');
      setNewType('VISIT');
      setNewPropertyId('');
    },
    onError: (e: any) => Alert.alert(t('common:error'), e?.response?.data?.message ?? t('createError')),
  });

  const deleteInspection = useMutation({
    mutationFn: (id: string) => api.delete(`/inspections/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['owner-inspections'] }),
    onError: () => Alert.alert(t('common:error'), t('deleteError')),
  });

  // Construir mapa día → eventos
  const { eventMap, lateDates } = useMemo(() => {
    const map: Record<string, { inspections: Inspection[]; payments: Payment[] }> = {};
    const lateSet = new Set<string>();
    for (const insp of inspections) {
      const ymd = toYMD(parseLocalDate(insp.scheduledAt));
      if (!map[ymd]) map[ymd] = { inspections: [], payments: [] };
      map[ymd].inspections.push(insp);
    }
    for (const pay of payments) {
      if (pay.status === 'PAID') continue;
      const ymd = toYMD(parseLocalDate(pay.dueDate));
      if (!map[ymd]) map[ymd] = { inspections: [], payments: [] };
      map[ymd].payments.push(pay);
      if (pay.status === 'LATE') lateSet.add(ymd);
    }
    return { eventMap: map, lateDates: lateSet };
  }, [inspections, payments]);

  // Generar días del mes actual para el calendario
  const { firstDayOfMonth, daysInMonth } = useMemo(() => ({
    firstDayOfMonth: new Date(year, month, 1).getDay(),
    daysInMonth: new Date(year, month + 1, 0).getDate(),
  }), [year, month]);

  const prevMonth = useCallback(() => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }, [month]);
  const nextMonth = useCallback(() => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }, [month]);

  const todayYMD = toYMD(today);
  const selectedEvents = selectedDay ? (eventMap[selectedDay] ?? { inspections: [], payments: [] }) : null;

  const calendarCells = useMemo(() => {
    const cells: ({ key: string } & ({ type: 'empty' } | { type: 'day'; day: number; ymd: string }))[] = [];
    for (let i = 0; i < firstDayOfMonth; i++) {
      cells.push({ key: `empty-${i}`, type: 'empty' });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ key: ymd, type: 'day', day, ymd });
    }
    return cells;
  }, [firstDayOfMonth, daysInMonth, year, month]);

  const months = t('months', { returnObjects: true }) as string[];
  const days = t('days', { returnObjects: true }) as string[];

  function openNewModal() {
    if (selectedDay) setNewDate(ymdToDmy(selectedDay));
    if (properties.length > 0) setNewPropertyId(properties[0].id);
    setShowNewModal(true);
  }

  function handleCreate() {
    if (!newPropertyId) { Alert.alert(t('common:error'), t('selectProperty')); return; }
    if (!newDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) { Alert.alert(t('common:error'), t('invalidDateFormat')); return; }
    const dateObj = new Date(`${dmyToYmd(newDate)}T12:00:00`);
    if (isNaN(dateObj.getTime())) { Alert.alert(t('common:error'), t('invalidDate')); return; }
    createInspection.mutate({ propertyId: newPropertyId, scheduledAt: dateObj.toISOString(), notes: newNotes || undefined, type: newType });
  }

  if (loadingInsp || loadingPay) {
    return <View style={styles.centered}><ActivityIndicator color="#6b5b45" size="large" /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      refreshControl={<RefreshControl refreshing={refetchingInsp || refetchingPay} onRefresh={() => { refetchInsp(); refetchPay(); }} tintColor="#6b5b45" colors={['#6b5b45']} />}
    >
      <Text style={styles.title}>{t('title')}</Text>

      {/* Navegación de mes */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Ionicons name="chevron-back" size={20} color="#6b5b45" />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{months[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Ionicons name="chevron-forward" size={20} color="#6b5b45" />
        </TouchableOpacity>
      </View>

      {/* Grilla del calendario */}
      <View style={styles.calGrid}>
        <View style={styles.calHeaders}>
          {days.map(d => (
            <Text key={d} style={styles.dayHeader}>{d}</Text>
          ))}
        </View>
        <FlatList
          data={calendarCells}
          numColumns={7}
          keyExtractor={(item) => item.key}
          scrollEnabled={false}
          removeClippedSubviews
          renderItem={({ item }) => {
            if (item.type === 'empty') return <View style={styles.dayCell} />;
            const { day, ymd } = item;
            const isToday = ymd === todayYMD;
            const isSelected = ymd === selectedDay;
            const events = eventMap[ymd];
            const hasInsp = (events?.inspections.length ?? 0) > 0;
            const hasPay = (events?.payments.length ?? 0) > 0;
            const hasLate = lateDates.has(ymd);
            return (
              <TouchableOpacity
                style={[styles.dayCell, isSelected && styles.dayCellSelected, isToday && !isSelected && styles.dayCellToday]}
                onPress={() => setSelectedDay(ymd)}
              >
                <Text style={[styles.dayNum, isSelected && styles.dayNumSelected, isToday && !isSelected && styles.dayNumToday]}>
                  {day}
                </Text>
                <View style={styles.dayDots}>
                  {hasInsp && <View style={[styles.dot, { backgroundColor: '#6b5b45' }]} />}
                  {hasPay && <View style={[styles.dot, { backgroundColor: hasLate ? '#dc2626' : '#f59e0b' }]} />}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Leyenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#6b5b45' }]} /><Text style={styles.legendText}>{t('legend.visitInspection')}</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#f59e0b' }]} /><Text style={styles.legendText}>{t('legend.dueDate')}</Text></View>
        <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: '#dc2626' }]} /><Text style={styles.legendText}>{t('legend.overdue')}</Text></View>
      </View>

      {/* Eventos del día seleccionado */}
      {selectedDay && (
        <View style={styles.eventSection}>
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>
              {selectedDay === todayYMD ? t('today') : selectedDay.split('-').reverse().join('/')}
            </Text>
            <TouchableOpacity style={styles.addBtn} onPress={openNewModal}>
              <Ionicons name="add" size={15} color="#fff" />
              <Text style={styles.addBtnText}>{t('newVisit')}</Text>
            </TouchableOpacity>
          </View>

          {selectedEvents && selectedEvents.inspections.length === 0 && selectedEvents.payments.length === 0 && (
            <Text style={styles.noEvents}>{t('noEvents')}</Text>
          )}

          {selectedEvents?.inspections.map(insp => (
            <View key={insp.id} style={styles.eventCard}>
              <View style={styles.eventCardLeft}>
                <Ionicons name="calendar-outline" size={16} color="#6b5b45" />
                <View style={styles.eventInfo}>
                  <Text style={styles.eventType}>{t(`inspectionType.${insp.type}` as any) || insp.type}</Text>
                  <Text style={styles.eventProp} numberOfLines={1}>
                    {insp.property.name ?? insp.property.address}
                  </Text>
                  {insp.notes ? <Text style={styles.eventNotes} numberOfLines={2}>{insp.notes}</Text> : null}
                  <Text style={styles.eventTime}>
                    {new Date(insp.scheduledAt).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => Alert.alert(t('common:delete'), t('deleteConfirm'), [
                  { text: t('common:cancel'), style: 'cancel' },
                  { text: t('common:delete'), style: 'destructive', onPress: () => deleteInspection.mutate(insp.id) },
                ])}
              >
                <Ionicons name="trash-outline" size={16} color="#dc2626" />
              </TouchableOpacity>
            </View>
          ))}

          {selectedEvents?.payments.map(pay => {
            const st = STATUS_STYLE[pay.status] ?? STATUS_STYLE.PENDING;
            return (
              <View key={pay.id} style={styles.eventCard}>
                <View style={styles.eventCardLeft}>
                  <Ionicons name="card-outline" size={16} color="#b45309" />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventType} numberOfLines={1}>
                      {pay.contract.property.name ?? pay.contract.property.address}
                    </Text>
                    <Text style={styles.eventProp}>{pay.contract.tenants?.map((ten) => ten.name).join(', ') || t('noTenant')} · {pay.period}</Text>
                    <Text style={styles.eventAmount}>{formatMoney(pay.amount, pay.currency ?? 'USD')}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.statusText, { color: st.color }]}>
                    {t(`paymentStatus.${pay.status}` as any) || pay.status}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Modal nueva visita */}
      <Modal visible={showNewModal} transparent animationType="slide" onRequestClose={() => setShowNewModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('modal.title')}</Text>

            <Text style={styles.fieldLabel}>{t('modal.typeLabel')}</Text>
            <View style={styles.typeRow}>
              {(['VISIT', 'INSPECTION'] as const).map(typeKey => (
                <TouchableOpacity
                  key={typeKey}
                  style={[styles.typeBtn, newType === typeKey && styles.typeBtnActive]}
                  onPress={() => setNewType(typeKey)}
                >
                  <Text style={[styles.typeBtnText, newType === typeKey && styles.typeBtnTextActive]}>
                    {t(`inspectionType.${typeKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t('modal.propertyLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propScroll}>
              {properties.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.propChip, newPropertyId === p.id && styles.propChipActive]}
                  onPress={() => setNewPropertyId(p.id)}
                >
                  <Text style={[styles.propChipText, newPropertyId === p.id && styles.propChipTextActive]} numberOfLines={1}>
                    {p.name ?? p.address}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>{t('modal.dateLabel')}</Text>
            <TextInput
              style={styles.input}
              value={newDate}
              onChangeText={setNewDate}
              placeholder="15/06/2026"
              keyboardType="numbers-and-punctuation"
            />

            <Text style={styles.fieldLabel}>{t('modal.notesLabel')}</Text>
            <TextInput
              style={[styles.input, styles.inputMulti]}
              value={newNotes}
              onChangeText={setNewNotes}
              placeholder={t('modal.notesPlaceholder')}
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNewModal(false)}>
                <Text style={styles.modalCancelText}>{t('common:cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                onPress={handleCreate}
                disabled={createInspection.isPending}
              >
                <Text style={styles.modalConfirmText}>
                  {createInspection.isPending ? t('common:saving') : t('common:save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 20 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  navBtn: { padding: 8, backgroundColor: '#f0ede6', borderRadius: 8 },
  monthLabel: { fontSize: 17, fontWeight: '700', color: '#2d2d2d' },

  calGrid: { backgroundColor: '#fff', borderRadius: 14, padding: 10, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, marginBottom: 10 },
  calHeaders: { flexDirection: 'row' },
  dayHeader: { width: '14.28%', textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#aaa', paddingVertical: 6 },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  dayCellSelected: { backgroundColor: '#6b5b45' },
  dayCellToday: { backgroundColor: '#f0ede6' },
  dayNum: { fontSize: 13, fontWeight: '600', color: '#2d2d2d' },
  dayNumSelected: { color: '#fff' },
  dayNumToday: { color: '#6b5b45', fontWeight: '800' },
  dayDots: { flexDirection: 'row', gap: 3, marginTop: 2, minHeight: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },

  legend: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: '#888' },

  eventSection: { backgroundColor: '#fff', borderRadius: 14, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  eventTitle: { fontSize: 16, fontWeight: '700', color: '#2d2d2d' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#6b5b45', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  noEvents: { textAlign: 'center', color: '#aaa', fontSize: 13, paddingVertical: 12 },

  eventCard: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', backgroundColor: '#faf8f5', borderRadius: 10, padding: 12, marginBottom: 8 },
  eventCardLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, flex: 1 },
  eventInfo: { flex: 1 },
  eventType: { fontSize: 13, fontWeight: '700', color: '#2d2d2d' },
  eventProp: { fontSize: 12, color: '#888', marginTop: 1 },
  eventNotes: { fontSize: 12, color: '#aaa', marginTop: 2 },
  eventTime: { fontSize: 11, color: '#aaa', marginTop: 2 },
  eventAmount: { fontSize: 15, fontWeight: '700', color: '#6b5b45', marginTop: 2 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: '700' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2d2d2d', marginBottom: 18 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 6, marginTop: 12 },

  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 2, borderColor: '#e0dbd4', alignItems: 'center' },
  typeBtnActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: '#888' },
  typeBtnTextActive: { color: '#6b5b45' },

  propScroll: { marginBottom: 4 },
  propChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: '#e0dbd4', backgroundColor: '#fff', marginRight: 8 },
  propChipActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  propChipText: { fontSize: 12, color: '#888', fontWeight: '600' },
  propChipTextActive: { color: '#6b5b45' },

  input: { borderWidth: 1.5, borderColor: '#e0dbd4', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#2d2d2d', backgroundColor: '#faf8f5' },
  inputMulti: { height: 80, textAlignVertical: 'top' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#f0ede6', alignItems: 'center' },
  modalCancelText: { color: '#888', fontSize: 14, fontWeight: '700' },
  modalConfirm: { flex: 1, paddingVertical: 13, borderRadius: 10, backgroundColor: '#6b5b45', alignItems: 'center' },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
