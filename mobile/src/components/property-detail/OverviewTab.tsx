import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import type { Property } from './types';

type Props = {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export function OverviewTab({ property, onEdit, onDelete, deleting }: Props) {
  const { t } = useTranslation('properties');
  return (
    <View style={styles.section}>
      {property.description ? (
        <>
          <Text style={styles.sectionTitle}>{t('overview.descriptionTitle')}</Text>
          <Text style={styles.description}>{property.description}</Text>
        </>
      ) : null}
      <InfoRow label={t('overview.country')} value={property.country || 'AR'} />
      <InfoRow label={t('overview.address')} value={property.address} />
      <InfoRow label={t('overview.type')} value={t(`domain:propertyType.${property.type}`, property.type)} />
      <InfoRow label={t('overview.surface')} value={t('card.surface', { value: property.surface })} />
      {property.antiquity != null ? (
        <InfoRow label={t('overview.antiquity')} value={t('card.years', { value: property.antiquity })} />
      ) : null}
      <TouchableOpacity style={styles.primaryBtn} onPress={onEdit}>
        <Text style={styles.primaryBtnText}>{t('overview.editProperty')}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.dangerBtn} onPress={onDelete}>
        <Text style={styles.dangerBtnText}>
          {deleting ? t('delete.deleting') : t('overview.deleteProperty')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
