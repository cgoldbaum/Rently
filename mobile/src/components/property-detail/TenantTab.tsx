import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import type { Contract, Tenant } from './types';

type Props = {
  contract?: Contract;
  onAddTenant: () => void;
  onRemoveTenant: (tenant: Tenant) => void;
  removingTenantId?: string;
};

export function TenantTab({ contract, onAddTenant, onRemoveTenant, removingTenantId }: Props) {
  const { t } = useTranslation('properties');
  const tenants = contract?.tenants ?? [];

  if (!contract) {
    return (
      <View style={styles.section}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('tenant.noContractFull')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {tenants.map((tenant) => (
        <View key={tenant.id} style={{ marginBottom: 16 }}>
          <InfoRow label={t('tenant.nameField')} value={tenant.name} />
          <InfoRow label={t('tenant.emailField')} value={tenant.email} />
          <InfoRow label={t('tenant.phoneField')} value={tenant.phone || '—'} />
          <TouchableOpacity style={styles.dangerBtn} onPress={() => onRemoveTenant(tenant)}>
            <Text style={styles.dangerBtnText}>
              {removingTenantId === tenant.id ? t('tenant.removing') : t('tenant.removeTenant')}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {tenants.length === 0 && (
        <Text style={styles.emptyText}>{t('tenant.noneLinked')}</Text>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={onAddTenant}>
        <Text style={styles.primaryBtnText}>{t('tenant.add')}</Text>
      </TouchableOpacity>
    </View>
  );
}
