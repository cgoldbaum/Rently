import { View, Text, TouchableOpacity } from 'react-native';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import { TYPE_LABELS } from './constants';
import type { Property } from './types';

type Props = {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export function OverviewTab({ property, onEdit, onDelete, deleting }: Props) {
  return (
    <View style={styles.section}>
      {property.description ? (
        <>
          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{property.description}</Text>
        </>
      ) : null}
      <InfoRow label="País" value={property.country || 'AR'} />
      <InfoRow label="Dirección" value={property.address} />
      <InfoRow label="Tipo" value={TYPE_LABELS[property.type] || property.type} />
      <InfoRow label="Superficie" value={`${property.surface} m²`} />
      {property.antiquity != null ? (
        <InfoRow label="Antigüedad" value={`${property.antiquity} años`} />
      ) : null}
      <TouchableOpacity style={styles.primaryBtn} onPress={onEdit}>
        <Text style={styles.primaryBtnText}>Editar propiedad</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerBtn} onPress={onDelete}>
        <Text style={styles.dangerBtnText}>
          {deleting ? 'Eliminando...' : 'Eliminar propiedad'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
