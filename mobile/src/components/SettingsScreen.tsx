import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { formatMoney, profileSchema, getFieldErrors, type SubscriptionSummary, type LanguagePreference, type ThemePreference } from '@rently/shared';
import { useAuthStore } from '../store/auth';
import { useLocaleStore } from '../store/locale';
import { useThemeStore } from '../store/theme';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';
import { api } from '../lib/api';
import { shadowStyles } from '../styles/shared';
import { syncStorage } from '../storage';
import { syncUpcomingWidget } from '../lib/widgetSync';

const NOTIFICATION_KEYS = [
  'paymentReceived',
  'paymentLate',
  'newClaim',
  'adjustmentApplied',
  'contractExpiry',
];

const LANGUAGE_OPTIONS: LanguagePreference[] = ['system', 'es', 'en'];
const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];

type Me = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: 'OWNER' | 'TENANT';
  language?: 'system' | 'es' | 'en';
  tenantId?: string;
  tenantIds?: string[];
  canOwner?: boolean;
  canTenant?: boolean;
};

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const activeView = useAuthStore((s) => s.activeView);
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);
  const queryClient = useQueryClient();
  const { t } = useTranslation('settings');
  const languagePref = useLocaleStore((s) => s.preference);
  const setLanguagePref = useLocaleStore((s) => s.setPreference);
  const themePref = useThemeStore((s) => s.preference);
  const setThemePref = useThemeStore((s) => s.setPreference);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState([true, true, true, true, false]);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [checkoutPlan, setCheckoutPlan] = useState<string | null>(null);

  const meQuery = useQuery<Me>({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data ?? r.data),
  });

  const subscriptionQuery = useQuery<SubscriptionSummary>({
    queryKey: ['owner-subscription'],
    queryFn: () => api.get('/owner/subscription').then((r) => r.data.data),
    enabled: user?.role === 'OWNER',
  });

  const canSwitchView = Boolean(user?.canOwner && user?.canTenant);

  const rentalsQuery = useQuery<{ tenantId: string; propertyName: string }[]>({
    queryKey: ['tenant-rentals'],
    queryFn: () => api.get('/tenant/rentals').then((r) => r.data.data),
    enabled: Boolean(user?.canTenant),
  });
  const rentals = rentalsQuery.data ?? [];

  const switchView = () => {
    const target = activeView === 'owner' ? 'tenant' : 'owner';
    setActiveView(target);
    if (target === 'tenant') {
      // Si ya había un alquiler activo válido (elegido en "Alquiler activo"), lo
      // mantenemos en vez de forzar siempre el primero.
      const stillValid = activeTenantId && user?.tenantIds?.includes(activeTenantId);
      setActiveTenantId(stillValid ? activeTenantId : (user?.tenantId ?? user?.tenantIds?.[0] ?? null));
      router.replace('/(tenant)');
    } else {
      router.replace('/(owner)');
    }
  };

  const selectRental = (tenantId: string) => {
    setActiveTenantId(tenantId);
    queryClient.invalidateQueries();
  };

  // Sync the form with the fetched profile once it loads.
  useEffect(() => {
    if (meQuery.data) {
      setName(meQuery.data.name ?? '');
      setEmail(meQuery.data.email ?? '');
      setPhone(meQuery.data.phone ?? '');
      // Mantiene sincronizado canOwner/canTenant en el store: si te acaban de
      // vincular como inquilino (o propietario) con este mismo email, el switch
      // de vista debe reflejarlo sin tener que volver a loguearse.
      setUser(meQuery.data);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meQuery.data]);

  const saveProfile = useMutation({
    mutationFn: (body: { name: string; phone: string }) => api.patch('/auth/me', body),
    onSuccess: () => {
      if (user) setUser({ ...user, name });
      Alert.alert(t('profile.saveSuccessTitle'), t('profile.updated'));
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert(t('errorTitle'), msg ?? t('profile.saveError'));
    },
  });

  const languageMutation = useMutation({
    mutationFn: (language: LanguagePreference) => api.patch('/auth/me', { language }),
    onError: () => Alert.alert(t('errorTitle'), t('language.saveError')),
  });

  const changeLanguage = (pref: LanguagePreference) => {
    setLanguagePref(pref);
    languageMutation.mutate(pref);
  };

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: () => {
      clearAuth();
      router.replace('/(auth)/login');
    },
    onError: () => Alert.alert(t('errorTitle'), t('danger.deleteError')),
  });

  const handleSave = () => {
    const parsed = profileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    saveProfile.mutate({ name: parsed.data.name, phone: parsed.data.phone });
  };

  const handleLogout = () => {
    Alert.alert(t('logout.title'), t('logout.message'), [
      { text: t('common:cancel'), style: 'cancel' },
      {
        text: t('logout.title'),
        style: 'destructive',
        onPress: async () => {
          const refreshToken = syncStorage.getItem('refreshToken');
          try {
            await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
          } catch {
            // Ignore — local session is cleared regardless.
          }
          clearAuth();
          syncUpcomingWidget([], false);
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const toggleNotification = (i: number) =>
    setNotifications((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  const startCheckout = async (planCode: string) => {
    setCheckoutPlan(planCode);
    try {
      const { data } = await api.post('/owner/subscription/checkout', { planCode });
      const initPoint = data.data?.initPoint;
      if (initPoint) {
        await Linking.openURL(initPoint);
        return;
      }
      Alert.alert(t('errorTitle'), t('subscription.noPaymentLink'));
    } catch (err) {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert(t('errorTitle'), msg ?? t('subscription.checkoutError'));
    } finally {
      setCheckoutPlan(null);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('title')}</Text>
        </View>

        {/* Perfil */}
        <View style={[styles.card, shadowStyles.card]}>
          <Text style={styles.cardTitle}>{t('profile.title')}</Text>

          <Text style={styles.label}>{t('profile.name')}</Text>
          <TextInput
            style={[styles.input, fieldErrors.name && styles.inputError]}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setFieldErrors((p) => ({ ...p, name: '' }));
            }}
            placeholder={t('profile.namePlaceholder')}
            placeholderTextColor={colors.placeholder}
          />
          {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}

          <Text style={styles.label}>{t('profile.email')}</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

          <Text style={styles.label}>{t('profile.phone')}</Text>
          <TextInput
            style={[styles.input, fieldErrors.phone && styles.inputError]}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setFieldErrors((p) => ({ ...p, phone: '' }));
            }}
            placeholder={t('profile.phonePlaceholder')}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />
          {fieldErrors.phone ? <Text style={styles.errorText}>{fieldErrors.phone}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (saveProfile.isPending || meQuery.isLoading) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saveProfile.isPending || meQuery.isLoading}
          >
            <Text style={styles.primaryBtnText}>
              {saveProfile.isPending ? t('profile.saving') : t('profile.save')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cambiar de vista (propietario ⇄ inquilino) */}
        {canSwitchView ? (
          <View style={[styles.card, shadowStyles.card]}>
            <Text style={styles.cardTitle}>{t('view.title')}</Text>
            <Text style={styles.planDesc}>
              {t('view.operatingAs', { role: activeView === 'tenant' ? t('view.roleTenant') : t('view.roleOwner') })}
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={switchView}>
              <Text style={styles.primaryBtnText}>
                {activeView === 'tenant' ? t('view.switchToOwner') : t('view.switchToTenant')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Alquiler activo (inquilinos con más de un alquiler) */}
        {activeView === 'tenant' && rentals.length > 1 ? (
          <View style={[styles.card, shadowStyles.card]}>
            <Text style={styles.cardTitle}>{t('view.activeRental')}</Text>
            {rentals.map((r) => {
              const current = (activeTenantId ?? rentals[0].tenantId) === r.tenantId;
              return (
                <TouchableOpacity
                  key={r.tenantId}
                  style={[styles.planButton, current && styles.planButtonCurrent]}
                  disabled={current}
                  onPress={() => selectRental(r.tenantId)}
                >
                  <Text style={[styles.planButtonText, current && styles.planButtonTextCurrent]}>
                    {r.propertyName}
                  </Text>
                  {current ? <Text style={[styles.planButtonPrice, styles.planButtonTextCurrent]}>{t('view.current')}</Text> : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Suscripción (solo propietario) */}
        {user?.role === 'OWNER' ? (
        <View style={[styles.card, shadowStyles.card]}>
            <Text style={styles.cardTitle}>{t('subscription.title')}</Text>
            <View style={styles.planBox}>
              <View>
                <Text style={styles.planName}>
                  {subscriptionQuery.data?.subscription
                    ? t('subscription.planName', { name: subscriptionQuery.data.subscription.plan.name })
                    : t('subscription.noPlan')}
                </Text>
                <Text style={styles.planDesc}>
                  {subscriptionQuery.data?.subscription
                    ? (subscriptionQuery.data.subscription.plan.propertyLimit == null
                        ? t('subscription.unlimited')
                        : t('subscription.upTo', { limit: subscriptionQuery.data.subscription.plan.propertyLimit }))
                    : t('subscription.choosePlan')}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>
                  {subscriptionQuery.data?.subscription
                    ? formatMoney(subscriptionQuery.data.subscription.plan.price, subscriptionQuery.data.subscription.plan.currency)
                    : '—'}
                </Text>
                <Text style={styles.planPer}>{t('subscription.perMonth')}</Text>
              </View>
            </View>
            <Text style={styles.planNote}>
              {t('subscription.currentUsage')}{' '}
              <Text style={styles.planSaving}>
                {subscriptionQuery.data
                  ? subscriptionQuery.data.usage.propertyLimit == null
                    ? t('subscription.propertiesCount', { count: subscriptionQuery.data.usage.properties })
                    : t('subscription.propertiesUsage', { used: subscriptionQuery.data.usage.properties, limit: subscriptionQuery.data.usage.propertyLimit })
                  : t('subscription.loading')}
              </Text>
            </Text>
            {(subscriptionQuery.data?.plans ?? []).map((plan) => {
              const current = subscriptionQuery.data?.subscription?.plan.code === plan.code;
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.planButton, current && styles.planButtonCurrent, checkoutPlan === plan.code && styles.btnDisabled]}
                  disabled={current || checkoutPlan === plan.code}
                  onPress={() => startCheckout(plan.code)}
                >
                  <Text style={[styles.planButtonText, current && styles.planButtonTextCurrent]}>
                    {plan.name} · {plan.propertyLimit == null ? t('subscription.unlimited') : t('subscription.upTo', { limit: plan.propertyLimit })}
                  </Text>
                  <Text style={[styles.planButtonPrice, current && styles.planButtonTextCurrent]}>
                    {current ? t('view.current') : checkoutPlan === plan.code ? t('subscription.opening') : formatMoney(plan.price, plan.currency)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        {/* Notificaciones */}
        <View style={[styles.card, shadowStyles.card]}>
          <Text style={styles.cardTitle}>{t('notifications.title')}</Text>
          {NOTIFICATION_KEYS.map((key, i) => (
            <View
              key={key}
              style={[styles.notifRow, i < NOTIFICATION_KEYS.length - 1 && styles.notifRowBorder]}
            >
              <Text style={styles.notifText}>{t(`domain:notification.${key}`)}</Text>
              <Switch
                value={notifications[i]}
                onValueChange={() => toggleNotification(i)}
                trackColor={{ true: '#6b5b45', false: colors.border }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Idioma */}
        <View style={[styles.card, shadowStyles.card]}>
          <Text style={styles.cardTitle}>{t('language.label')}</Text>
          {LANGUAGE_OPTIONS.map((opt) => {
            const current = languagePref === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.planButton, current && styles.planButtonCurrent]}
                disabled={current}
                onPress={() => changeLanguage(opt)}
              >
                <Text style={[styles.planButtonText, current && styles.planButtonTextCurrent]}>
                  {t(`language.${opt}`)}
                </Text>
                {current ? <Text style={[styles.planButtonPrice, styles.planButtonTextCurrent]}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Tema */}
        <View style={[styles.card, shadowStyles.card]}>
          <Text style={styles.cardTitle}>{t('theme.label')}</Text>
          {THEME_OPTIONS.map((opt) => {
            const current = themePref === opt;
            return (
              <TouchableOpacity
                key={opt}
                style={[styles.planButton, current && styles.planButtonCurrent]}
                disabled={current}
                onPress={() => setThemePref(opt)}
              >
                <Text style={[styles.planButtonText, current && styles.planButtonTextCurrent]}>
                  {t(`theme.${opt}`)}
                </Text>
                {current ? <Text style={[styles.planButtonPrice, styles.planButtonTextCurrent]}>✓</Text> : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Eliminar cuenta */}
        <View style={[styles.card, styles.dangerCard, shadowStyles.card]}>
          <Text style={styles.dangerTitle}>{t('danger.title')}</Text>
          <Text style={styles.dangerDesc}>
            {t('danger.tenantDescription')}
          </Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              setDeleteConfirm('');
              setShowDelete(true);
            }}
          >
            <Text style={styles.dangerBtnText}>{t('danger.button')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>{t('logout.title')}</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal eliminar cuenta */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('danger.modalTitle')}</Text>
            <Text style={styles.modalText}>
              {t('danger.tenantModalBody')}
            </Text>
            <Text style={styles.label}>
              {t('danger.confirmLabel')}
            </Text>
            <TextInput
              style={styles.input}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder={t('danger.confirmWord')}
              placeholderTextColor={colors.placeholder}
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDelete(false)}>
                <Text style={styles.modalCancelText}>{t('danger.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDelete,
                  (deleteConfirm !== t('danger.confirmWord') || deleteAccount.isPending) && styles.btnDisabled,
                ]}
                disabled={deleteConfirm !== t('danger.confirmWord') || deleteAccount.isPending}
                onPress={() => deleteAccount.mutate()}
              >
                <Text style={styles.modalDeleteText}>
                  {deleteAccount.isPending ? t('danger.deleting') : t('common:delete')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {meQuery.isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#6b5b45" />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },

    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { fontSize: 20, color: '#6b5b45', fontWeight: '700' },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 18,
      marginBottom: 14,
    },
    cardTitle: { fontSize: 15, fontWeight: '800', color: colors.text, marginBottom: 12 },

    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 14,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.background,
    },
    inputDisabled: { color: colors.placeholder, backgroundColor: colors.cardMuted },
    inputError: { borderColor: '#ef4444' },
    errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },

    primaryBtn: {
      marginTop: 18,
      backgroundColor: '#6b5b45',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    btnDisabled: { opacity: 0.5 },

    planBox: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.backgroundElevated,
      borderRadius: 12,
      padding: 16,
    },
    planName: { fontSize: 16, fontWeight: '800', color: colors.text },
    planDesc: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
    planPrice: { fontSize: 20, fontWeight: '800', color: '#6b5b45' },
    planPer: { fontSize: 12, color: colors.textMuted },
    planNote: { fontSize: 13, color: colors.textMuted, marginTop: 12 },
    planSaving: { color: '#16a34a', fontWeight: '700' },
    planButton: {
      marginTop: 10,
      borderRadius: 12,
      backgroundColor: '#6b5b45',
      paddingHorizontal: 14,
      paddingVertical: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 10,
    },
    planButtonCurrent: { backgroundColor: colors.backgroundElevated },
    planButtonText: { color: '#fff', fontWeight: '800', flex: 1 },
    planButtonPrice: { color: '#fff', fontWeight: '800' },
    planButtonTextCurrent: { color: '#6b5b45' },

    notifRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
    },
    notifRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.borderLight },
    notifText: { fontSize: 14, color: colors.text },

    dangerCard: { borderWidth: 1, borderColor: '#fecaca' },
    dangerTitle: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
    dangerDesc: { fontSize: 13, color: colors.textMuted, marginTop: 6, lineHeight: 19 },
    dangerBtn: {
      marginTop: 14,
      backgroundColor: '#fee2e2',
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    dangerBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

    logoutBtn: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      marginTop: 4,
    },
    logoutText: { color: '#6b5b45', fontSize: 15, fontWeight: '700' },

    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 22 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
    modalText: { fontSize: 14, color: colors.textSecondary, marginTop: 8, lineHeight: 20 },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    modalDelete: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: '#ef4444',
      alignItems: 'center',
    },
    modalDeleteText: { color: '#fff', fontSize: 14, fontWeight: '700' },

    loadingOverlay: {
      position: 'absolute',
      top: 60,
      right: 24,
    },
  });
}
