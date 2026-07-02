'use client';

import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useRouter } from 'next/navigation';
import { getApiBaseUrl } from '@/lib/api';
import { tabs } from './constants';
import { usePropertyData } from './hooks/usePropertyData';
import { usePropertyUI } from './hooks/usePropertyUI';
import { usePropertyMutations } from './hooks/usePropertyMutations';
import PropertyHeader from './PropertyHeader';
import OverviewTab from './tabs/OverviewTab';
import ContractTab from './tabs/ContractTab';
import TenantTab from './tabs/TenantTab';
import PaymentsTab from './tabs/PaymentsTab';
import ClaimsTab from './tabs/ClaimsTab';
import AdjustmentsTab from './tabs/AdjustmentsTab';
import PhotosTab from './tabs/PhotosTab';
import ExpensasTab from './tabs/ExpensasTab';
import PortalsTab from './tabs/PortalsTab';
import PortalPreviewOverlay from './PortalPreviewOverlay';
import EditPropertyModal from './modals/EditPropertyModal';
import ContractModal from './modals/ContractModal';
import TenantModal from './modals/TenantModal';
import ClaimDetailModal from './modals/ClaimDetailModal';
import PaymentModal from './modals/PaymentModal';
import ConfirmDeletePhoto from './modals/ConfirmDeletePhoto';
import ConfirmDeleteTenant from './modals/ConfirmDeleteTenant';
import ConfirmDeleteProperty from './modals/ConfirmDeleteProperty';

export default function PropertyDetailPage() {
  const { t } = useTranslation('properties');
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const API_BASE = getApiBaseUrl();

  const data = usePropertyData(id);
  const ui = usePropertyUI();
  const mut = usePropertyMutations(id, data, ui);

  const contractFileRef = useRef<HTMLInputElement>(null);
  const contractImportFileRef = useRef<HTMLInputElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);

  if (!data.property) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>{t('page.loading')}</div>
      </div>
    );
  }

  return (
    <>
      <PropertyHeader
        property={data.property}
        onBack={() => router.back()}
        onExportPdf={mut.handleExportPdf}
        onEdit={mut.openEditModal}
        onDelete={() => ui.setConfirmDeleteProperty(true)}
        exportingPdf={ui.exportingPdf}
      />

      <div className="tabs" style={{ marginBottom: 24 }}>
        {tabs.map((v) => (
          <button key={v} className={`tab${ui.tab === v ? ' active' : ''}`} onClick={() => ui.setTab(v)}>{t('tabs.' + v)}</button>
        ))}
      </div>

      {ui.tab === 'overview' && (
        <OverviewTab
          property={data.property}
          claims={data.claims}
          onSetTab={ui.setTab}
          onOpenContractModal={mut.openContractModal}
          onOpenTenantModal={() => ui.setShowTenantModal(true)}
          onDeleteTenant={(t) => ui.setDeleteTenantTarget(t)}
        />
      )}

      {ui.tab === 'contract' && (
        <ContractTab
          property={data.property}
          contractDoc={data.contractDoc}
          uploadingDoc={ui.uploadingDoc}
          apiBase={API_BASE}
          contractFileRef={contractFileRef}
          onOpenContractModal={mut.openContractModal}
          onUploadDoc={mut.handleContractDocUpload}
        />
      )}

      {ui.tab === 'tenant' && (
        <TenantTab
          property={data.property}
          onOpenTenantModal={() => ui.setShowTenantModal(true)}
          onDeleteTenant={(t) => ui.setDeleteTenantTarget(t)}
        />
      )}

      {ui.tab === 'payments' && (
        <PaymentsTab
          payments={data.payments}
          property={data.property}
          onOpenPaymentModal={() => { ui.setPaymentForm((f: any) => ({ ...f, currency: data.property?.contract?.currency ?? 'USD' })); ui.setShowPaymentModal(true); }}
        />
      )}

      {ui.tab === 'claims' && (
        <ClaimsTab
          claims={data.claims}
          onSelectClaim={mut.handleSelectClaim}
        />
      )}

      {ui.tab === 'adjustments' && (
        <AdjustmentsTab
          adjustments={data.adjustments}
          property={data.property}
        />
      )}

      {ui.tab === 'photos' && (
        <PhotosTab
          photos={data.photos}
          folders={data.folders}
          photoTags={data.photoTags}
          uploadingPhotos={ui.uploadingPhotos}
          photoPreview={data.photoPreview}
          photoFolderFilter={data.photoFolderFilter}
          photoUploadFolder={ui.photoUploadFolder}
          photoUploadTags={ui.photoUploadTags}
          apiBase={API_BASE}
          photoFileRef={photoFileRef}
          onPhotoSelect={mut.handlePhotoSelect}
          onSetPhotoFolderFilter={data.setPhotoFolderFilter}
          onSetPhotoUploadFolder={ui.setPhotoUploadFolder}
          onTogglePhotoUploadTag={mut.togglePhotoUploadTag}
          onDeletePhoto={(photoId) => ui.setPendingDeletePhotoId(photoId)}
          onAddPhotoClick={() => photoFileRef.current?.click()}
        />
      )}

      {ui.tab === 'expensas' && (
        <ExpensasTab
          property={data.property}
          expenseReceipts={data.expenseReceipts}
          apiBase={API_BASE}
        />
      )}

      {ui.tab === 'portals' && (
        <PortalsTab
          listings={data.listings}
          portalBusy={ui.portalBusy}
          onPublish={mut.publishToPortal}
          onUnpublish={mut.unpublishFromPortal}
          onPreviewPortal={ui.setPreviewPortal}
        />
      )}

      <PortalPreviewOverlay
        portal={ui.previewPortal}
        property={data.property}
        photos={data.photos}
        apiBase={API_BASE}
        onClose={() => ui.setPreviewPortal(null)}
      />

      <EditPropertyModal
        show={ui.showEditModal}
        propertyId={id}
        form={ui.editForm}
        errors={ui.editErrors}
        saving={ui.savingEdit}
        onClose={() => { ui.setShowEditModal(false); ui.setEditErrors({}); }}
        onSubmit={mut.handleSaveEdit}
        onFieldChange={(field: string, value: string) => ui.setEditForm((f: any) => ({ ...f, [field]: value }))}
      />

      <ContractModal
        show={ui.showContractModal}
        property={data.property}
        form={ui.contractForm}
        errors={ui.contractErrors}
        saving={ui.savingContract}
        importingContract={ui.importingContract}
        importFileRef={contractImportFileRef}
        onClose={() => { ui.setShowContractModal(false); ui.setContractErrors({}); }}
        onSubmit={mut.handleSaveContract}
        onFieldChange={(field: string, value: string) => ui.setContractForm((f: any) => ({ ...f, [field]: value }))}
        onImportContract={mut.handleContractImport}
      />

      <TenantModal
        show={ui.showTenantModal}
        form={ui.tenantForm}
        errors={ui.tenantErrors}
        saving={ui.savingTenant}
        onClose={() => { ui.setShowTenantModal(false); ui.setTenantErrors({}); }}
        onSubmit={mut.handleSaveTenant}
        onFieldChange={(field: string, value: string) => ui.setTenantForm((f: any) => ({ ...f, [field]: value }))}
      />

      <ClaimDetailModal
        claim={ui.selectedClaim}
        updateForm={ui.claimUpdate}
        updating={ui.updatingClaim}
        onClose={() => ui.setSelectedClaim(null)}
        onSubmit={mut.handleUpdateClaim}
        onFieldChange={(field: string, value: string) => ui.setClaimUpdate((f: any) => ({ ...f, [field]: value }))}
      />

      <PaymentModal
        show={ui.showPaymentModal}
        form={ui.paymentForm}
        errors={ui.paymentErrors}
        saving={ui.savingPayment}
        onClose={() => { ui.setShowPaymentModal(false); ui.setPaymentErrors({}); }}
        onSubmit={mut.handleAddPayment}
        onFieldChange={(field: string, value: string) => ui.setPaymentForm((f: any) => ({ ...f, [field]: value }))}
      />

      <ConfirmDeletePhoto
        pendingPhotoId={ui.pendingDeletePhotoId}
        deleting={ui.deletingPhoto}
        onClose={() => ui.setPendingDeletePhotoId(null)}
        onConfirm={() => mut.handleDeletePhoto(ui.pendingDeletePhotoId!)}
      />

      <ConfirmDeleteTenant
        show={!!ui.deleteTenantTarget}
        tenantName={ui.deleteTenantTarget?.name ?? ''}
        deleting={ui.deletingTenant}
        onClose={() => ui.setDeleteTenantTarget(null)}
        onConfirm={mut.handleDeleteTenant}
      />

      <ConfirmDeleteProperty
        show={ui.confirmDeleteProperty}
        propertyName={data.property.name ?? data.property.address}
        deleting={ui.deletingProperty}
        onClose={() => ui.setConfirmDeleteProperty(false)}
        onConfirm={mut.handleDeleteProperty}
      />
    </>
  );
}
