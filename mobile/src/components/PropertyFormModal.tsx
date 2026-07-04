import { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Linking,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { propertySchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';
import { useChipStyles, useBorderedChipStyles, useModalFormStyles } from '../styles/shared';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

export type PropertyInput = {
  id: string;
  name?: string;
  address: string;
  country?: string;
  type: string;
  surface: number;
  antiquity?: number;
  description?: string;
  parentProperty?: { id: string } | null;
};

type ExistingProperty = { id: string; name?: string; address: string; type: string; parentPropertyId?: string | null };

const COUNTRIES = ['AR', 'CL', 'CO', 'UY'];

const TYPES = ['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH', 'GARAGE', 'DUPLEX'];

type ApiError = { response?: { status?: number; data?: { error?: { code?: string; message?: string } } } };

export function PropertyFormModal({
  visible,
  property,
  onClose,
  onSaved,
}: {
  visible: boolean;
  property: PropertyInput | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation('properties');
  const chipStyles = useChipStyles();
  const borderedChipStyles = useBorderedChipStyles();
  const modalFormStyles = useModalFormStyles();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors, modalFormStyles, borderedChipStyles), [colors, modalFormStyles, borderedChipStyles]);
  const isEdit = !!property;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('AR');
  const [type, setType] = useState('APARTMENT');
  const [surface, setSurface] = useState('');
  const [antiquity, setAntiquity] = useState('');
  const [description, setDescription] = useState('');
  const [parentPropertyId, setParentPropertyId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);

  const { data: existingProperties = [] } = useQuery<ExistingProperty[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then((r) => r.data.data),
    enabled: visible,
  });
  const parentCandidates = existingProperties.filter((p) => p.id !== property?.id && p.type !== 'GARAGE' && !p.parentPropertyId);

  // Reset / hydrate the form whenever the modal opens.
  useEffect(() => {
    if (!visible) return;
    setName(property?.name ?? '');
    setAddress(property?.address ?? '');
    setCountry(property?.country ?? 'AR');
    setType(property?.type ?? 'APARTMENT');
    setSurface(property?.surface != null ? String(property.surface) : '');
    setAntiquity(property?.antiquity != null ? String(property.antiquity) : '');
    setDescription(property?.description ?? '');
    setParentPropertyId(property?.parentProperty?.id ?? '');
    setErrors({});
  }, [visible, property?.id]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/properties/${property!.id}`, body)
        : api.post('/properties', body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const apiErr = err as ApiError;
      const msg = apiErr.response?.data?.error?.message;
      const code = apiErr.response?.data?.error?.code;
      if (apiErr.response?.status === 402) {
        Alert.alert(
          code === 'PROPERTY_LIMIT_REACHED' ? t('checkout.upgradeTitle') : t('checkout.activateTitle'),
          msg ?? t('checkout.needPlan'),
          [
            { text: t('common:cancel'), style: 'cancel' },
            { text: 'Pro', onPress: () => openSubscriptionCheckout('PRO') },
            { text: 'Agency', onPress: () => openSubscriptionCheckout('AGENCY') },
          ],
        );
        return;
      }
      Alert.alert(t('common:error'), msg ?? t('checkout.saveFailed'));
    },
  });

  async function openSubscriptionCheckout(planCode: 'STARTER' | 'PRO' | 'AGENCY') {
    try {
      const { data } = await api.post('/owner/subscription/checkout', { planCode });
      const initPoint = data.data?.initPoint;
      if (initPoint) {
        await Linking.openURL(initPoint);
        return;
      }
      Alert.alert(t('common:error'), t('checkout.noPayLink'));
    } catch (err) {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert(t('common:error'), msg ?? t('checkout.checkoutFailed'));
    }
  }

  const handleGenerateDescription = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await api.post('/ai/property-description', {
        type,
        surface,
        antiquity,
        name: name || undefined,
        address: address || undefined,
      });
      const text: string = res.data.data.text?.trim() ?? '';
      if (text) setDescription(text);
    } catch {
      Alert.alert(t('common:error'), t('ai.descriptionError'));
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = () => {
    const parsed = propertySchema.safeParse({
      name,
      address,
      country,
      type,
      surface,
      antiquity: antiquity || undefined,
      description,
    });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({
      name: name || undefined,
      address,
      country,
      type,
      surface: parseFloat(surface),
      antiquity: antiquity ? parseInt(antiquity, 10) : undefined,
      description: description || undefined,
      parentPropertyId: type === 'GARAGE' && parentPropertyId ? parentPropertyId : null,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isEdit ? t('edit.title') : t('create.title')}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>{t('form.name')}</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder={t('form.namePlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
            {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

            <Text style={styles.label}>{t('form.address')}</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder={t('form.addressPlaceholder')}
              placeholderTextColor={colors.placeholder}
            />
            {errors.address ? <Text style={styles.err}>{errors.address}</Text> : null}

            <Text style={styles.label}>{t('form.country')}</Text>
            <View style={chipStyles.row}>
              {COUNTRIES.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, country === val && styles.chipActive]}
                  onPress={() => setCountry(val)}
                >
                  <Text style={[styles.chipText, country === val && styles.chipTextActive]}>{t(`country.${val}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('form.type')}</Text>
            <View style={chipStyles.row}>
              {TYPES.map((val) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, type === val && styles.chipActive]}
                  onPress={() => setType(val)}
                >
                  <Text style={[styles.chipText, type === val && styles.chipTextActive]}>{t(`domain:propertyType.${val}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>{t('form.surface')}</Text>
            <TextInput
              style={[styles.input, errors.surface && styles.inputError]}
              value={surface}
              onChangeText={setSurface}
              placeholder={t('form.surfacePlaceholder')}
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
            {errors.surface ? <Text style={styles.err}>{errors.surface}</Text> : null}

            {type === 'GARAGE' && (
              <>
                <Text style={styles.label}>{t('form.parentProperty')}</Text>
                <View style={chipStyles.row}>
                  <TouchableOpacity
                    style={[styles.chip, !parentPropertyId && styles.chipActive]}
                    onPress={() => setParentPropertyId('')}
                  >
                    <Text style={[styles.chipText, !parentPropertyId && styles.chipTextActive]}>{t('form.parentPropertyNone')}</Text>
                  </TouchableOpacity>
                  {parentCandidates.map((p) => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.chip, parentPropertyId === p.id && styles.chipActive]}
                      onPress={() => setParentPropertyId(p.id)}
                    >
                      <Text style={[styles.chipText, parentPropertyId === p.id && styles.chipTextActive]}>{p.name ?? p.address}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.label}>{t('form.antiquity')}</Text>
            <TextInput
              style={[styles.input, errors.antiquity && styles.inputError]}
              value={antiquity}
              onChangeText={setAntiquity}
              placeholder={t('form.antiquityPlaceholder')}
              placeholderTextColor={colors.placeholder}
              keyboardType="numeric"
            />
            {errors.antiquity ? <Text style={styles.err}>{errors.antiquity}</Text> : null}

            <View style={styles.aiRow}>
              <Text style={styles.label}>{t('form.description')}</Text>
              <TouchableOpacity
                style={[styles.aiButton, generating && styles.aiButtonDisabled]}
                onPress={handleGenerateDescription}
                disabled={generating}
              >
                <Text style={styles.aiButtonText}>
                  {generating ? t('ai.descriptionGenerating') : t('ai.descriptionGenerate')}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={[styles.input, styles.textarea, errors.description && styles.inputError]}
              value={description}
              onChangeText={setDescription}
              placeholder={t('form.descriptionPlaceholder')}
              placeholderTextColor={colors.placeholder}
              multiline
            />
            {errors.description ? <Text style={styles.err}>{errors.description}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>{t('common:cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, save.isPending && styles.disabled]}
              onPress={handleSave}
              disabled={save.isPending}
            >
              <Text style={styles.confirmText}>
                {save.isPending ? t('common:saving') : isEdit ? t('common:save') : t('form.create')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(
  colors: ThemeColors,
  modalFormStyles: ReturnType<typeof useModalFormStyles>,
  borderedChipStyles: ReturnType<typeof useBorderedChipStyles>,
) {
  return {
    ...modalFormStyles,
    ...borderedChipStyles,
    textarea: { minHeight: 70, textAlignVertical: 'top' as const },
    aiRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const },
    aiButton: {
      backgroundColor: '#efe9df',
      borderWidth: 1,
      borderColor: '#6b5b45',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    aiButtonDisabled: { opacity: 0.5 },
    aiButtonText: { color: '#6b5b45', fontSize: 12, fontWeight: '700' as const },
  };
}
