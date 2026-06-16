import { View, Text, TouchableOpacity } from 'react-native';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import type { Contract } from './types';

type Props = {
  contract?: Contract;
  onAddTenant: () => void;
  onRemoveTenant: () => void;
  removingTenant: boolean;
};

export function TenantTab({ contract, onAddTenant, onRemoveTenant, removingTenant }: Props) {
  return (
    <View style={styles.section}>
      {!contract ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>
            Creá primero un contrato para poder vincular un inquilino.
          </Text>
        </View>
      ) : contract.tenant ? (
        <>
          <InfoRow label="Nombre" value={contract.tenant.name} />
          <InfoRow label="Email" value={contract.tenant.email} />
          <InfoRow label="Teléfono" value={contract.tenant.phone || '—'} />
          <TouchableOpacity style={styles.dangerBtn} onPress={onRemoveTenant}>
            <Text style={styles.dangerBtnText}>
              {removingTenant ? 'Quitando...' : 'Quitar inquilino'}
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>El contrato no tiene un inquilino vinculado.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddTenant}>
            <Text style={styles.primaryBtnText}>Vincular inquilino</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
