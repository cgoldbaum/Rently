import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { tenantSchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function TenantFormModal({
  visible,
  contractId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  contractId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('contracts');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setName('');
    setEmail('');
    setPhone('');
    setErrors({});
  }, [visible]);

  const save = useMutation({
    mutationFn: (body: { name: string; email: string; phone: string }) =>
      api.post(`/contracts/${contractId}/tenant`, body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert(t('common:error'), msg ?? t('tenantModal.linkFailed'));
    },
  });

  const handleSave = () => {
    const parsed = tenantSchema.safeParse({ name, email, phone });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({ name, email, phone });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{t('tenantModal.title')}</Text>

          <Text style={styles.label}>{t('tenantModal.name')} *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder={t('tenantModal.namePlaceholder')}
            placeholderTextColor={colors.placeholder}
          />
          {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

          <Text style={styles.label}>{t('tenantModal.email')} *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={setEmail}
            placeholder={t('tenantModal.emailPlaceholder')}
            placeholderTextColor={colors.placeholder}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email ? <Text style={styles.err}>{errors.email}</Text> : null}

          <Text style={styles.label}>{t('tenantModal.phone')}</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('tenantModal.phonePlaceholder')}
            placeholderTextColor={colors.placeholder}
            keyboardType="phone-pad"
          />
          {errors.phone ? <Text style={styles.err}>{errors.phone}</Text> : null}

          <Text style={styles.hint}>{t('tenantModal.hint')}</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>{t('tenantModal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, save.isPending && styles.disabled]}
              onPress={handleSave}
              disabled={save.isPending}
            >
              <Text style={styles.confirmText}>{save.isPending ? t('tenantModal.linking') : t('tenantModal.link')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 22,
    },
    title: { fontSize: 20, fontWeight: '800', color: colors.text, marginBottom: 8 },
    label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    inputError: { borderColor: '#ef4444' },
    err: { fontSize: 12, color: '#ef4444', marginTop: 4 },
    hint: { fontSize: 12, color: colors.textMuted, marginTop: 14, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
    cancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' },
    confirm: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#6b5b45',
      alignItems: 'center',
    },
    confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    disabled: { opacity: 0.5 },
  });
}
