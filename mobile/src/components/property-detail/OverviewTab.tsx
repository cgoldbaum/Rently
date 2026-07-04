import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { InfoRow } from './InfoRow';
import { usePropertyDetailStyles } from './styles';
import type { Property } from './types';

type Props = {
  property: Property;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
};

export function OverviewTab({ property, onEdit, onDelete, deleting }: Props) {
  const { t } = useTranslation('properties');
  const styles = usePropertyDetailStyles();
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
      {property.parentProperty ? (
        <TouchableOpacity onPress={() => router.push(`/(owner)/properties/${property.parentProperty!.id}`)}>
          <Text style={styles.linkText}>
            {t('overview.belongsTo', { address: property.parentProperty.name ?? property.parentProperty.address })}
          </Text>
        </TouchableOpacity>
      ) : null}
      {property.units && property.units.length > 0 ? (
        <>
          <Text style={styles.sectionTitle}>{t('overview.associatedUnits', { count: property.units.length })}</Text>
          {property.units.map((unit) => (
            <TouchableOpacity key={unit.id} onPress={() => router.push(`/(owner)/properties/${unit.id}`)}>
              <Text style={styles.linkText}>{unit.name ?? unit.address}</Text>
            </TouchableOpacity>
          ))}
        </>
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
