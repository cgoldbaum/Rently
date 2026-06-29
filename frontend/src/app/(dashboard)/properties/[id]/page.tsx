'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api, { getApiBaseUrl } from '@/lib/api';
import { propertySchema, contractSchema, tenantSchema, paymentSchema, getFieldErrors } from '@/lib/validations';
import { useToastStore } from '@/store/toast';

import { Property, Claim, Payment, PortalListing, AdjustmentHistory, PropertyPhoto, PhotoFolder, PhotoTag, Tenant } from './types';
import { tabs, INDEX_BY_COUNTRY } from './constants';
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
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const API_BASE = getApiBaseUrl();
  const [property, setProperty] = useState<Property | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [expenseReceipts, setExpenseReceipts] = useState<{ id: string; period: string; fileUrl: string; fileName: string | null; uploadedAt: string }[]>([]);
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [portalBusy, setPortalBusy] = useState('');
  const [previewPortal, setPreviewPortal] = useState<{ key: string; name: string; color: string } | null>(null);
  const [tab, setTab] = useState('overview');


  // Edit property modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  // Contract modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ startDate: '', endDate: '', initialAmount: '', paymentDay: '1', indexType: 'ICL', adjustFrequency: '3', currency: 'USD' as 'ARS' | 'USD' });
  const [savingContract, setSavingContract] = useState(false);

  // Tenant modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '' });
  const [savingTenant, setSavingTenant] = useState(false);
  const [deleteTenantTarget, setDeleteTenantTarget] = useState<Tenant | null>(null);
  const [deletingTenant, setDeletingTenant] = useState(false);

  // Claim update modal
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  const [claimUpdate, setClaimUpdate] = useState({ status: '', comment: '', priority: '' });
  const [updatingClaim, setUpdatingClaim] = useState(false);

  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', period: '', dueDate: '', method: 'Transferencia', currency: 'USD' as 'ARS' | 'USD' });
  const [savingPayment, setSavingPayment] = useState(false);

  // Contract document
  const [contractDoc, setContractDoc] = useState<{ fileUrl: string; fileName?: string; uploadedAt: string } | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const contractFileRef = useRef<HTMLInputElement>(null);

  // Photos
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<{ url: string; name: string }[]>([]);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [photoFolderFilter, setPhotoFolderFilter] = useState('');
  const [photoUploadFolder, setPhotoUploadFolder] = useState('');
  const [photoUploadTags, setPhotoUploadTags] = useState<string[]>([]);
  const [folders, setFolders] = useState<PhotoFolder[]>([]);
  const [photoTags, setPhotoTags] = useState<PhotoTag[]>([]);

  // Form validation errors
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [contractErrors, setContractErrors] = useState<Record<string, string>>({});
  const [tenantErrors, setTenantErrors] = useState<Record<string, string>>({});
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Export PDF loading
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmDeleteProperty, setConfirmDeleteProperty] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);

  useEffect(() => {
    api.get(`/properties/${id}`).then(r => setProperty(r.data.data)).catch(() => router.push('/properties'));
    api.get(`/properties/${id}/claims`).then(r => setClaims(r.data.data)).catch(() => {});
    api.get(`/properties/${id}/folders`).then(r => setFolders(r.data.data)).catch(() => {});
    api.get(`/tags`).then(r => setPhotoTags(r.data.data)).catch(() => {});
    api.get(`/properties/${id}/expensas`).then(r => setExpenseReceipts(r.data.data)).catch(() => {});
    api.get(`/properties/${id}/listings`).then(r => setListings(r.data.data)).catch(() => {});
  }, [id, router]);

  useEffect(() => {
    const url = photoFolderFilter
      ? `/properties/${id}/photos?folderId=${photoFolderFilter}`
      : `/properties/${id}/photos`;
    api.get(url).then(r => setPhotos(r.data.data)).catch(() => {});
  }, [id, photoFolderFilter]);

  useEffect(() => {
    if (!property?.contract?.id) return;
    api.get(`/contracts/${property.contract.id}/adjustments`).then(r => setAdjustments(r.data.data)).catch(() => {});
    api.get(`/contracts/${property.contract.id}/payments`).then(r => setPayments(r.data.data)).catch(() => {});
    api.get(`/contracts/${property.contract.id}/document`).then(r => setContractDoc(r.data.data)).catch(() => setContractDoc(null));
  }, [property?.contract?.id]);

  function openEditModal() {
    if (!property) return;
    setEditForm({
      name: property.name ?? '',
      address: property.address,
      country: property.country ?? 'AR',
      type: property.type,
      surface: String(property.surface),
      antiquity: property.antiquity != null ? String(property.antiquity) : '',
      description: property.description ?? '',
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!property) return;
    const parsed = propertySchema.safeParse({
      name: editForm.name,
      address: editForm.address,
      country: editForm.country,
      type: editForm.type,
      surface: editForm.surface,
      antiquity: editForm.antiquity || undefined,
      description: editForm.description,
    });
    if (!parsed.success) { setEditErrors(getFieldErrors(parsed.error)); return; }
    setEditErrors({});
    setSavingEdit(true);
    try {
      const { data } = await api.patch(`/properties/${id}`, {
        name: editForm.name || undefined,
        address: editForm.address,
        country: editForm.country,
        type: editForm.type,
        surface: parseFloat(editForm.surface),
        antiquity: editForm.antiquity ? parseInt(editForm.antiquity) : undefined,
        description: editForm.description || undefined,
      });
      setProperty(p => p ? { ...p, ...data.data } : p);
      setShowEditModal(false);
      useToastStore.getState().showToast('Propiedad actualizada');
    } catch {
      useToastStore.getState().showToast('Error al guardar los cambios');
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleSaveContract(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!property) return;
    const parsed = contractSchema.safeParse({
      startDate: contractForm.startDate,
      endDate: contractForm.endDate,
      initialAmount: contractForm.initialAmount,
      currency: contractForm.currency,
      paymentDay: contractForm.paymentDay,
      indexType: contractForm.indexType,
      adjustFrequency: contractForm.adjustFrequency,
    });
    if (!parsed.success) { setContractErrors(getFieldErrors(parsed.error)); return; }
    setContractErrors({});
    setSavingContract(true);
    try {
      const payload = {
        startDate: new Date(contractForm.startDate).toISOString(),
        endDate: new Date(contractForm.endDate).toISOString(),
        initialAmount: parseFloat(contractForm.initialAmount),
        paymentDay: parseInt(contractForm.paymentDay),
        indexType: contractForm.indexType,
        adjustFrequency: contractForm.indexType === 'MANUAL' ? 0 : parseInt(contractForm.adjustFrequency),
        currency: contractForm.currency,
      };
      const { data } = property.contract
        ? await api.patch(`/properties/${id}/contract`, payload)
        : await api.post(`/properties/${id}/contract`, payload);
      setProperty(p => p ? { ...p, contract: data.data } : p);
      setShowContractModal(false);
      useToastStore.getState().showToast('Contrato guardado');
    } catch {
      useToastStore.getState().showToast('Error al guardar el contrato');
    } finally {
      setSavingContract(false);
    }
  }

  async function handleSaveTenant(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!property?.contract?.id) return;
    const parsed = tenantSchema.safeParse(tenantForm);
    if (!parsed.success) { setTenantErrors(getFieldErrors(parsed.error)); return; }
    setTenantErrors({});
    setSavingTenant(true);
    try {
      const { data } = await api.post(`/contracts/${property.contract.id}/tenant`, tenantForm);
      setProperty(p => p && p.contract ? { ...p, status: 'OCCUPIED', contract: { ...p.contract, tenants: [...(p.contract.tenants ?? []), data.data] } } : p);
      setShowTenantModal(false);
      setTenantForm({ name: '', email: '', phone: '' });
      useToastStore.getState().showToast('Inquilino vinculado');
    } catch {
      useToastStore.getState().showToast('Error al vincular inquilino');
    } finally {
      setSavingTenant(false);
    }
  }

  async function handleDeleteTenant() {
    if (!property?.contract?.id || !deleteTenantTarget) return;
    const targetId = deleteTenantTarget.id;
    setDeletingTenant(true);
    try {
      await api.delete(`/contracts/${property.contract.id}/tenant/${targetId}`);
      setProperty(p => {
        if (!p?.contract) return p;
        const tenants = (p.contract.tenants ?? []).filter(t => t.id !== targetId);
        return { ...p, status: tenants.length ? p.status : 'VACANT', contract: { ...p.contract, tenants } };
      });
      setDeleteTenantTarget(null);
      useToastStore.getState().showToast('Inquilino quitado');
    } catch {
      useToastStore.getState().showToast('Error al quitar el inquilino');
    } finally {
      setDeletingTenant(false);
    }
  }

  async function handleUpdateClaim(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedClaim || !claimUpdate.status) return;
    setUpdatingClaim(true);
    try {
      const { data } = await api.patch(`/claims/${selectedClaim.id}`, {
        status: claimUpdate.status,
        comment: claimUpdate.comment || undefined,
        priority: claimUpdate.priority || undefined,
      });
      const updated = data.data;
      setClaims(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
      setSelectedClaim(updated);
      setClaimUpdate({ status: '', comment: '', priority: updated.priority });
      useToastStore.getState().showToast('Reclamo actualizado');
    } catch {
      useToastStore.getState().showToast('Error al actualizar el reclamo');
    } finally {
      setUpdatingClaim(false);
    }
  }

  async function handleAddPayment(e: React.SyntheticEvent) {
    e.preventDefault();
    if (!property?.contract?.id) return;
    const parsed = paymentSchema.safeParse({
      period: paymentForm.period,
      amount: paymentForm.amount,
      currency: paymentForm.currency,
      dueDate: paymentForm.dueDate,
      method: paymentForm.method,
    });
    if (!parsed.success) { setPaymentErrors(getFieldErrors(parsed.error)); return; }
    setPaymentErrors({});
    setSavingPayment(true);
    try {
      const { data } = await api.post(`/contracts/${property.contract.id}/payments`, {
        amount: parseFloat(paymentForm.amount),
        currency: paymentForm.currency,
        period: paymentForm.period,
        dueDate: new Date(paymentForm.dueDate).toISOString(),
        method: paymentForm.method,
        status: 'PENDING',
      });
      setPayments(prev => [data.data, ...prev]);
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', period: '', dueDate: '', method: 'Transferencia', currency: property.contract?.currency ?? 'USD' });
      useToastStore.getState().showToast('Pago registrado');
    } catch {
      useToastStore.getState().showToast('Error al registrar pago');
    } finally {
      setSavingPayment(false);
    }
  }

  async function handleExportPdf() {
    setExportingPdf(true);
    try {
      const token = typeof window !== 'undefined' ? sessionStorage.getItem('accessToken') : null;
      const res = await fetch(`${API_BASE}/properties/${id}/export-description`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `propiedad-${id}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      useToastStore.getState().showToast('Error al exportar el PDF');
    } finally {
      setExportingPdf(false);
    }
  }

  async function publishToPortal(portal: string) {
    setPortalBusy(portal);
    try {
      const { data } = await api.post(`/properties/${id}/listings`, { portal });
      setListings(prev => [data.data, ...prev.filter(l => l.portal !== portal)]);
      useToastStore.getState().showToast('Aviso publicado');
    } catch {
      useToastStore.getState().showToast('Error al publicar el aviso');
    } finally {
      setPortalBusy('');
    }
  }

  async function unpublishFromPortal(portal: string) {
    setPortalBusy(portal);
    try {
      await api.delete(`/properties/${id}/listings/${portal}`);
      setListings(prev => prev.filter(l => l.portal !== portal));
      useToastStore.getState().showToast('Aviso despublicado');
    } catch {
      useToastStore.getState().showToast('Error al despublicar el aviso');
    } finally {
      setPortalBusy('');
    }
  }

  async function handleContractDocUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !property?.contract?.id) return;
    setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post(`/contracts/${property.contract.id}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setContractDoc(data.data);
      useToastStore.getState().showToast('Contrato cargado correctamente');
    } catch {
      useToastStore.getState().showToast('Error al cargar el PDF');
    } finally {
      setUploadingDoc(false);
      if (contractFileRef.current) contractFileRef.current.value = '';
    }
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const previews = files.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    setPhotoPreview(previews);
    handlePhotoUpload(files);
  }

  async function handlePhotoUpload(files: File[]) {
    setUploadingPhotos(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images[]', f));
      if (photoUploadFolder) formData.append('folderId', photoUploadFolder);
      if (photoUploadTags.length > 0) {
        photoUploadTags.forEach(t => formData.append('tagIds[]', t));
      }
      const { data } = await api.post(`/properties/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotos(data.data);
      useToastStore.getState().showToast(`${files.length} foto${files.length !== 1 ? 's' : ''} cargada${files.length !== 1 ? 's' : ''}`);
      setPhotoUploadFolder('');
      setPhotoUploadTags([]);
    } catch {
      useToastStore.getState().showToast('Error al cargar las fotos');
    } finally {
      setUploadingPhotos(false);
      setPhotoPreview([]);
      if (photoFileRef.current) photoFileRef.current.value = '';
    }
  }

  function togglePhotoUploadTag(tagId: string) {
    setPhotoUploadTags(prev =>
      prev.includes(tagId) ? prev.filter(t => t !== tagId) : [...prev, tagId],
    );
  }

  async function handleDeletePhoto(photoId: string) {
    setDeletingPhoto(true);
    try {
      const { data } = await api.delete(`/properties/${id}/photos/${photoId}`);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setPendingDeletePhotoId(null);
      useToastStore.getState().showToast(data.data.notifiedTenant ? 'Foto eliminada. Se notificó al inquilino.' : 'Foto eliminada.');
    } catch {
      useToastStore.getState().showToast('Error al eliminar la foto');
    } finally {
      setDeletingPhoto(false);
    }
  }

  async function handleDeleteProperty() {
    setDeletingProperty(true);
    try {
      await api.delete(`/properties/${id}`);
      useToastStore.getState().showToast('Inmueble eliminado');
      router.push('/properties');
    } catch {
      useToastStore.getState().showToast('Error al eliminar el inmueble');
    } finally {
      setDeletingProperty(false);
    }
  }

  function openContractModal() {
    const defaultIndex = INDEX_BY_COUNTRY[property?.country || 'AR']?.[0]?.value || 'IPC';
    if (property?.contract) {
      const c = property.contract;
      setContractForm({
        startDate: c.startDate.slice(0, 10),
        endDate: c.endDate.slice(0, 10),
        initialAmount: String(c.initialAmount),
        paymentDay: String(c.paymentDay),
        indexType: c.indexType,
        adjustFrequency: String(c.adjustFrequency),
        currency: c.currency ?? 'USD',
      });
    } else {
      setContractForm(f => ({ ...f, indexType: defaultIndex }));
    }
    setShowContractModal(true);
  }

  function handleSelectClaim(claim: Claim) {
    setSelectedClaim(claim);
    setClaimUpdate({ status: '', comment: '', priority: claim.priority });
  }

  if (!property) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Cargando...</div>
      </div>
    );
  }

  return (
    <>
      <PropertyHeader
        property={property}
        onBack={() => router.back()}
        onExportPdf={handleExportPdf}
        onEdit={openEditModal}
        onDelete={() => setConfirmDeleteProperty(true)}
        exportingPdf={exportingPdf}
      />

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        {tabs.map(([v, l]) => (
          <button key={v} className={`tab${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {/* Tab: Overview */}
      {tab === 'overview' && (
        <OverviewTab
          property={property}
          claims={claims}
          onSetTab={setTab}
          onOpenContractModal={openContractModal}
          onOpenTenantModal={() => setShowTenantModal(true)}
          onDeleteTenant={(t) => setDeleteTenantTarget(t)}
        />
      )}

      {/* Tab: Contract */}
      {tab === 'contract' && (
        <ContractTab
          property={property}
          contractDoc={contractDoc}
          uploadingDoc={uploadingDoc}
          apiBase={API_BASE}
          contractFileRef={contractFileRef}
          onOpenContractModal={openContractModal}
          onUploadDoc={handleContractDocUpload}
        />
      )}

      {/* Tab: Tenant */}
      {tab === 'tenant' && (
        <TenantTab
          property={property}
          onOpenTenantModal={() => setShowTenantModal(true)}
          onDeleteTenant={(t) => setDeleteTenantTarget(t)}
        />
      )}

      {/* Tab: Payments */}
      {tab === 'payments' && (
        <PaymentsTab
          payments={payments}
          property={property}
          onOpenPaymentModal={() => { setPaymentForm(f => ({ ...f, currency: property.contract?.currency ?? 'USD' })); setShowPaymentModal(true); }}
        />
      )}

      {/* Tab: Claims */}
      {tab === 'claims' && (
        <ClaimsTab
          claims={claims}
          onSelectClaim={handleSelectClaim}
        />
      )}

      {/* Tab: Adjustments */}
      {tab === 'adjustments' && (
        <AdjustmentsTab
          adjustments={adjustments}
          property={property}
        />
      )}

      {/* Tab: Photos */}
      {tab === 'photos' && (
        <PhotosTab
          photos={photos}
          folders={folders}
          photoTags={photoTags}
          uploadingPhotos={uploadingPhotos}
          photoPreview={photoPreview}
          photoFolderFilter={photoFolderFilter}
          photoUploadFolder={photoUploadFolder}
          photoUploadTags={photoUploadTags}
          apiBase={API_BASE}
          photoFileRef={photoFileRef}
          onPhotoSelect={handlePhotoSelect}
          onSetPhotoFolderFilter={setPhotoFolderFilter}
          onSetPhotoUploadFolder={setPhotoUploadFolder}
          onTogglePhotoUploadTag={togglePhotoUploadTag}
          onDeletePhoto={(photoId) => setPendingDeletePhotoId(photoId)}
          onAddPhotoClick={() => photoFileRef.current?.click()}
        />
      )}

      {/* Tab: Expensas */}
      {tab === 'expensas' && (
        <ExpensasTab
          property={property}
          expenseReceipts={expenseReceipts}
          apiBase={API_BASE}
        />
      )}

      {/* Tab: Portals */}
      {tab === 'portals' && (
        <PortalsTab
          listings={listings}
          portalBusy={portalBusy}
          onPublish={publishToPortal}
          onUnpublish={unpublishFromPortal}
          onPreviewPortal={setPreviewPortal}
        />
      )}

      {/* Listing preview */}
      <PortalPreviewOverlay
        portal={previewPortal}
        property={property}
        photos={photos}
        apiBase={API_BASE}
        onClose={() => setPreviewPortal(null)}
      />

      {/* Edit Property Modal */}
      <EditPropertyModal
        show={showEditModal}
        form={editForm}
        errors={editErrors}
        saving={savingEdit}
        onClose={() => { setShowEditModal(false); setEditErrors({}); }}
        onSubmit={handleSaveEdit}
        onFieldChange={(field, value) => setEditForm(f => ({ ...f, [field]: value }))}
      />

      {/* Contract Modal */}
      <ContractModal
        show={showContractModal}
        property={property}
        form={contractForm}
        errors={contractErrors}
        saving={savingContract}
        onClose={() => { setShowContractModal(false); setContractErrors({}); }}
        onSubmit={handleSaveContract}
        onFieldChange={(field, value) => setContractForm(f => ({ ...f, [field]: value }))}
      />

      {/* Tenant Modal */}
      <TenantModal
        show={showTenantModal}
        form={tenantForm}
        errors={tenantErrors}
        saving={savingTenant}
        onClose={() => { setShowTenantModal(false); setTenantErrors({}); }}
        onSubmit={handleSaveTenant}
        onFieldChange={(field, value) => setTenantForm(f => ({ ...f, [field]: value }))}
      />

      {/* Claim Detail Modal */}
      <ClaimDetailModal
        claim={selectedClaim}
        updateForm={claimUpdate}
        updating={updatingClaim}
        onClose={() => setSelectedClaim(null)}
        onSubmit={handleUpdateClaim}
        onFieldChange={(field, value) => setClaimUpdate(f => ({ ...f, [field]: value }))}
      />

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        form={paymentForm}
        errors={paymentErrors}
        saving={savingPayment}
        onClose={() => { setShowPaymentModal(false); setPaymentErrors({}); }}
        onSubmit={handleAddPayment}
        onFieldChange={(field, value) => setPaymentForm(f => ({ ...f, [field]: value }))}
      />

      {/* Confirm delete photo */}
      <ConfirmDeletePhoto
        pendingPhotoId={pendingDeletePhotoId}
        deleting={deletingPhoto}
        onClose={() => setPendingDeletePhotoId(null)}
        onConfirm={() => handleDeletePhoto(pendingDeletePhotoId!)}
      />

      {/* Confirm delete tenant */}
      <ConfirmDeleteTenant
        show={!!deleteTenantTarget}
        tenantName={deleteTenantTarget?.name ?? ''}
        deleting={deletingTenant}
        onClose={() => setDeleteTenantTarget(null)}
        onConfirm={handleDeleteTenant}
      />

      {/* Confirm delete property */}
      <ConfirmDeleteProperty
        show={confirmDeleteProperty}
        propertyName={property.name ?? property.address}
        deleting={deletingProperty}
        onClose={() => setConfirmDeleteProperty(false)}
        onConfirm={handleDeleteProperty}
      />

    </>
  );
}
