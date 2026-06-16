import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { formatMoney, formatDate } from '@rently/shared';
import { InfoRow } from './InfoRow';
import { styles } from './styles';
import { INDEX_LABELS } from './constants';
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
  return (
    <View style={styles.section}>
      {contract ? (
        <>
          <InfoRow label="Inicio" value={formatDate(contract.startDate)} />
          <InfoRow label="Vencimiento" value={formatDate(contract.endDate)} />
          <InfoRow
            label="Monto inicial"
            value={formatMoney(contract.initialAmount, contract.currency ?? 'ARS')}
          />
          <InfoRow
            label="Monto actual"
            value={formatMoney(contract.currentAmount, contract.currency ?? 'ARS')}
          />
          <InfoRow label="Moneda" value={contract.currency ?? 'ARS'} />
          <InfoRow label="Día de pago" value={`Día ${contract.paymentDay}`} />
          <InfoRow
            label="Índice de ajuste"
            value={INDEX_LABELS[contract.indexType] || contract.indexType}
          />
          {contract.indexType !== 'MANUAL' ? (
            <>
              <InfoRow
                label="Frecuencia de ajuste"
                value={`Cada ${contract.adjustFrequency} meses`}
              />
              <InfoRow
                label="Próximo ajuste"
                value={contract.nextAdjustDate ? formatDate(contract.nextAdjustDate) : '—'}
              />
            </>
          ) : null}

          <Text style={styles.docTitle}>Documento del contrato</Text>
          {contractDoc ? (
            <View style={styles.docCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.docName}>{contractDoc.fileName ?? 'contrato.pdf'}</Text>
                <Text style={styles.docDate}>Cargado el {formatDate(contractDoc.uploadedAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.docBtn}
                onPress={() => Linking.openURL(`${baseURL}${contractDoc.fileUrl}`)}
              >
                <Text style={styles.docBtnText}>Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.docBtn} onPress={onUploadDoc}>
                <Text style={styles.docBtnText}>{uploadingDoc ? '...' : 'Reemplazar'}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.outlineBtn} onPress={onUploadDoc}>
              <Text style={styles.outlineBtnText}>
                {uploadingDoc ? 'Cargando...' : '+ Cargar PDF del contrato'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={onEditContract}>
            <Text style={styles.primaryBtnText}>Editar contrato</Text>
          </TouchableOpacity>
        </>
      ) : (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Esta propiedad no tiene contrato.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={onEditContract}>
            <Text style={styles.primaryBtnText}>Crear contrato</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
