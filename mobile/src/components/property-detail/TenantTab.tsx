import { View, Text, TouchableOpacity } from 'react-native';
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
  const tenants = contract?.tenants ?? [];

  if (!contract) {
    return (
      <View style={styles.section}>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Creá primero un contrato para poder vincular inquilinos.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      {tenants.map((tenant) => (
        <View key={tenant.id} style={{ marginBottom: 16 }}>
          <InfoRow label="Nombre" value={tenant.name} />
          <InfoRow label="Email" value={tenant.email} />
          <InfoRow label="Teléfono" value={tenant.phone || '—'} />
          <TouchableOpacity style={styles.dangerBtn} onPress={() => onRemoveTenant(tenant)}>
            <Text style={styles.dangerBtnText}>
              {removingTenantId === tenant.id ? 'Quitando...' : 'Quitar inquilino'}
            </Text>
          </TouchableOpacity>
        </View>
      ))}

      {tenants.length === 0 && (
        <Text style={styles.emptyText}>El contrato no tiene inquilinos vinculados.</Text>
      )}

      <TouchableOpacity style={styles.primaryBtn} onPress={onAddTenant}>
        <Text style={styles.primaryBtnText}>Agregar inquilino</Text>
      </TouchableOpacity>
    </View>
  );
}
