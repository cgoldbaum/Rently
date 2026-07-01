import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import type { Contract, ContractDoc } from './types';

type Props = {
  contract?: Contract;
  contractDoc: ContractDoc;
  baseURL?: string;
  onEditContract: () => void;
  onUploadDoc: () => void;
  uploadingDoc: boolean;
};

export function ContractTab({
  contract,
  contractDoc,
  baseURL,
  onEditContract,
  onUploadDoc,
  uploadingDoc,
}: Props) {
  const { t } = useTranslation('properties');
  return (
    <View style={styles.section}>
      {contract ? (
        <>
          <InfoRow label={t('contract.startDate')} value={formatDate(contract.startDate)} />
          <InfoRow label={t('contract.endDate')} value={formatDate(contract.endDate)} />
          <InfoRow
            label={t('contract.initialAmount')}
            value={formatMoney(contract.initialAmount, contract.currency ?? 'ARS')}
          />
          <InfoRow
            label={t('contract.currentAmount')}
            value={formatMoney(contract.currentAmount, contract.currency ?? 'ARS')}
          />
          <InfoRow label={t('contract.currency')} value={contract.currency ?? 'ARS'} />
          <InfoRow label={t('contract.paymentDay')} value={t('contract.dayFormat', { day: contract.paymentDay })} />
          <InfoRow
            label={t('contract.indexType')}
            value={t(`domain:indexType.${contract.indexType}`, contract.indexType)}
          />
          {contract.indexType !== 'MANUAL' ? (
            <>
              <InfoRow
                label={t('contract.adjustFrequency')}
                value={t('contract.everyNMonths', { months: contract.adjustFrequency })}
              />
              <InfoRow
                label={t('contract.nextAdjust')}
                value={contract.nextAdjustDate ? formatDate(contract.nextAdjustDate) : '—'}
              />
            </>
          ) : null}

          <Text style={styles.docTitle}>{t('contract.document')}</Text>
          {contractDoc ? (
            <View style={styles.docCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{contractDoc.fileName ?? t('contracts:document.contractPdf')}</Text>
                <Text style={styles.docDate}>{t('contracts:document.uploadedOn', { date: formatDate(contractDoc.uploadedAt) })}</Text>
              </View>
              <TouchableOpacity
                style={styles.docBtn}
                onPress={() => Linking.openURL(`${baseURL}${contractDoc.fileUrl}`)}
              >
                <Text style={styles.docBtnText}>{t('contract.viewDoc')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.docBtn} onPress={onUploadDoc}>
                <Text style={styles.docBtnText}>{uploadingDoc ? '...' : t('contract.replaceDoc')}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={onUploadDoc}>
              <Text style={styles.outlineBtnText}>
                {uploadingDoc ? t('contract.uploadingDoc') : `+ ${t('contract.uploadDocFull')}`}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={onEditContract}>
            <Text style={styles.primaryBtnText}>{t('contract.editContract')}</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{t('contract.noneForProperty')}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onEditContract}>
            <Text style={styles.primaryBtnText}>{t('contract.create')}</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
