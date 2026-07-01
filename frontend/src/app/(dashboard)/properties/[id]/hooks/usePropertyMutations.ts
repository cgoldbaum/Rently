'use client';

import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import api, { getApiBaseUrl } from '@/lib/api';
import { propertySchema, contractSchema, tenantSchema, paymentSchema, getFieldErrors } from '@/lib/validations';
import { useToastStore } from '@/store/toast';
import { tabs, INDEX_BY_COUNTRY } from '../constants';
import type { Property, Claim, Tenant } from '../types';

type Data = {
  property: Property | null; setProperty: (p: Property | null | ((prev: Property | null) => Property | null)) => void;
  claims: Claim[]; setClaims: (c: Claim[] | ((prev: Claim[]) => Claim[])) => void;
  payments: any[]; setPayments: (p: any[] | ((prev: any[]) => any[])) => void;
  photos: any[]; setPhotos: (p: any[] | ((prev: any[]) => any[])) => void;
  listings: any[]; setListings: (l: any[] | ((prev: any[]) => any[])) => void;
  contractDoc: any; setContractDoc: (d: any) => void;
  photoPreview: any[]; setPhotoPreview: (p: any[] | ((prev: any[]) => any[])) => void;
};

type UI = {
  editForm: any; setEditForm: any; setShowEditModal: any; setEditErrors: any; setSavingEdit: any;
  contractForm: any; setContractForm: any; setShowContractModal: any; setContractErrors: any; setSavingContract: any;
  tenantForm: any; setShowTenantModal: any; setTenantForm: any; setTenantErrors: any; setSavingTenant: any;
  deleteTenantTarget: any; setDeleteTenantTarget: any; setDeletingTenant: any;
  selectedClaim: any; setSelectedClaim: any; claimUpdate: any; setClaimUpdate: any; setUpdatingClaim: any;
  paymentForm: any; setShowPaymentModal: any; setPaymentForm: any; setPaymentErrors: any; setSavingPayment: any;
  setExportingPdf: any;
  setPortalBusy: any;
  setUploadingDoc: any;
  setUploadingPhotos: any; setPhotoUploadFolder: any; setPhotoUploadTags: any;
  photoUploadFolder: any; photoUploadTags: any;
  setPendingDeletePhotoId: any; setDeletingPhoto: any;
  setConfirmDeleteProperty: any; setDeletingProperty: any;
};

export function usePropertyMutations(id: string, data: Data, ui: UI) {
  const { t } = useTranslation('properties');
  const router = useRouter();
  const queryClient = useQueryClient();
  const API_BASE = getApiBaseUrl();

  const openEditModal = useCallback(() => {
    if (!data.property) return;
    ui.setEditForm({
      name: data.property.name ?? '',
      address: data.property.address,
      country: data.property.country ?? 'AR',
      type: data.property.type,
      surface: String(data.property.surface),
      antiquity: data.property.antiquity != null ? String(data.property.antiquity) : '',
      description: data.property.description ?? '',
    });
    ui.setShowEditModal(true);
  }, [data.property]);

  const handleSaveEdit = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!data.property) return;
    const parsed = propertySchema.safeParse({
      name: ui.editForm.name,
      address: ui.editForm.address,
      country: ui.editForm.country,
      type: ui.editForm.type,
      surface: ui.editForm.surface,
      antiquity: ui.editForm.antiquity || undefined,
      description: ui.editForm.description,
    });
    if (!parsed.success) { ui.setEditErrors(getFieldErrors(parsed.error)); return; }
    ui.setEditErrors({});
    ui.setSavingEdit(true);
    try {
      const { data: res } = await api.patch(`/properties/${id}`, {
        name: ui.editForm.name || undefined,
        address: ui.editForm.address,
        country: ui.editForm.country,
        type: ui.editForm.type,
        surface: parseFloat(ui.editForm.surface),
        antiquity: ui.editForm.antiquity ? parseInt(ui.editForm.antiquity) : undefined,
        description: ui.editForm.description || undefined,
      });
      data.setProperty((p: Property | null) => p ? { ...p, ...res.data } : p);
      ui.setShowEditModal(false);
      useToastStore.getState().showToast(t('toast.propertyUpdated'));
    } catch {
      useToastStore.getState().showToast(t('toast.updateError'));
    } finally {
      ui.setSavingEdit(false);
    }
  }, [id, data.property, ui.editForm]);

  const openContractModal = useCallback(() => {
    const defaultIndex = INDEX_BY_COUNTRY[data.property?.country || 'AR']?.[0]?.value || 'IPC';
    if (data.property?.contract) {
      const c = data.property.contract;
      ui.setContractForm({
        startDate: c.startDate.slice(0, 10),
        endDate: c.endDate.slice(0, 10),
        initialAmount: String(c.initialAmount),
        paymentDay: String(c.paymentDay),
        indexType: c.indexType,
        adjustFrequency: String(c.adjustFrequency),
        currency: c.currency ?? 'USD',
      });
    } else {
      ui.setContractForm((f: any) => ({ ...f, indexType: defaultIndex }));
    }
    ui.setShowContractModal(true);
  }, [data.property]);

  const handleSaveContract = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!data.property) return;
    const parsed = contractSchema.safeParse({
      startDate: ui.contractForm.startDate,
      endDate: ui.contractForm.endDate,
      initialAmount: ui.contractForm.initialAmount,
      currency: ui.contractForm.currency,
      paymentDay: ui.contractForm.paymentDay,
      indexType: ui.contractForm.indexType,
      adjustFrequency: ui.contractForm.adjustFrequency,
    });
    if (!parsed.success) { ui.setContractErrors(getFieldErrors(parsed.error)); return; }
    ui.setContractErrors({});
    ui.setSavingContract(true);
    try {
      const payload = {
        startDate: new Date(ui.contractForm.startDate).toISOString(),
        endDate: new Date(ui.contractForm.endDate).toISOString(),
        initialAmount: parseFloat(ui.contractForm.initialAmount),
        paymentDay: parseInt(ui.contractForm.paymentDay),
        indexType: ui.contractForm.indexType,
        adjustFrequency: ui.contractForm.indexType === 'MANUAL' ? 0 : parseInt(ui.contractForm.adjustFrequency),
        currency: ui.contractForm.currency,
      };
      const { data: res } = data.property.contract
        ? await api.patch(`/properties/${id}/contract`, payload)
        : await api.post(`/properties/${id}/contract`, payload);
      data.setProperty((p: Property | null) => p ? { ...p, contract: res.data } : p);
      ui.setShowContractModal(false);
      useToastStore.getState().showToast(t('toast.contractSaved'));
    } catch {
      useToastStore.getState().showToast(t('toast.contractError'));
    } finally {
      ui.setSavingContract(false);
    }
  }, [id, data.property, ui.contractForm]);

  const handleSaveTenant = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!data.property?.contract?.id) return;
    const parsed = tenantSchema.safeParse(ui.tenantForm);
    if (!parsed.success) { ui.setTenantErrors(getFieldErrors(parsed.error)); return; }
    ui.setTenantErrors({});
    ui.setSavingTenant(true);
    try {
      const { data: res } = await api.post(`/contracts/${data.property.contract.id}/tenant`, ui.tenantForm);
      data.setProperty((p: Property | null) =>
        p && p.contract ? { ...p, status: 'OCCUPIED', contract: { ...p.contract, tenants: [...(p.contract.tenants ?? []), res.data] } } : p
      );
      ui.setShowTenantModal(false);
      ui.setTenantForm({ name: '', email: '', phone: '' });
      useToastStore.getState().showToast(t('tenant.success'));
    } catch {
      useToastStore.getState().showToast(t('tenant.error'));
    } finally {
      ui.setSavingTenant(false);
    }
  }, [data.property, ui.tenantForm]);

  const handleDeleteTenant = useCallback(async () => {
    if (!data.property?.contract?.id || !ui.deleteTenantTarget) return;
    ui.setDeletingTenant(true);
    try {
      await api.delete(`/contracts/${data.property.contract.id}/tenant/${ui.deleteTenantTarget.id}`);
      data.setProperty((p: Property | null) => {
        if (!p?.contract) return p;
        const tenants = (p.contract.tenants ?? []).filter((t: Tenant) => t.id !== ui.deleteTenantTarget.id);
        return { ...p, status: tenants.length ? p.status : 'VACANT', contract: { ...p.contract, tenants } };
      });
      ui.setDeleteTenantTarget(null);
      useToastStore.getState().showToast(t('tenant.removeSuccess'));
    } catch {
      useToastStore.getState().showToast(t('tenant.removeError'));
    } finally {
      ui.setDeletingTenant(false);
    }
  }, [data.property, ui.deleteTenantTarget]);

  const handleUpdateClaim = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ui.selectedClaim || !ui.claimUpdate.status) return;
    ui.setUpdatingClaim(true);
    try {
      const { data: res } = await api.patch(`/claims/${ui.selectedClaim.id}`, {
        status: ui.claimUpdate.status,
        comment: ui.claimUpdate.comment || undefined,
        priority: ui.claimUpdate.priority || undefined,
      });
      const updated = res.data;
      data.setClaims((prev: Claim[]) => prev.map((c: Claim) => c.id === updated.id ? { ...c, ...updated } : c));
      ui.setSelectedClaim(updated);
      ui.setClaimUpdate({ status: '', comment: '', priority: updated.priority });
      useToastStore.getState().showToast('Reclamo actualizado');
    } catch {
      useToastStore.getState().showToast('Error al actualizar el reclamo');
    } finally {
      ui.setUpdatingClaim(false);
    }
  }, [ui.selectedClaim, ui.claimUpdate]);

  const handleAddPayment = useCallback(async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!data.property?.contract?.id) return;
    const parsed = paymentSchema.safeParse({
      period: ui.paymentForm.period,
      amount: ui.paymentForm.amount,
      currency: ui.paymentForm.currency,
      dueDate: ui.paymentForm.dueDate,
      method: ui.paymentForm.method,
    });
    if (!parsed.success) { ui.setPaymentErrors(getFieldErrors(parsed.error)); return; }
    ui.setPaymentErrors({});
    ui.setSavingPayment(true);
    try {
      const { data: res } = await api.post(`/contracts/${data.property.contract.id}/payments`, {
        amount: parseFloat(ui.paymentForm.amount),
        currency: ui.paymentForm.currency,
        period: ui.paymentForm.period,
        dueDate: new Date(ui.paymentForm.dueDate).toISOString(),
        method: ui.paymentForm.method,
        status: 'PENDING',
      });
      data.setPayments((prev: any[]) => [res.data, ...prev]);
      ui.setShowPaymentModal(false);
      ui.setPaymentForm({ amount: '', period: '', dueDate: '', method: 'Transferencia', currency: data.property.contract?.currency ?? 'USD' });
      useToastStore.getState().showToast('Pago registrado');
    } catch {
      useToastStore.getState().showToast('Error al registrar pago');
    } finally {
      ui.setSavingPayment(false);
    }
  }, [data.property, ui.paymentForm]);

  const handleExportPdf = useCallback(async () => {
    ui.setExportingPdf(true);
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
      useToastStore.getState().showToast(t('toast.pdfExportError'));
    } finally {
      ui.setExportingPdf(false);
    }
  }, [id, API_BASE]);

  const publishToPortal = useCallback(async (portal: string) => {
    ui.setPortalBusy(portal);
    try {
      const { data: res } = await api.post(`/properties/${id}/listings`, { portal });
      data.setListings((prev: any[]) => [res.data, ...prev.filter((l: any) => l.portal !== portal)]);
      useToastStore.getState().showToast(t('toast.listingPublished'));
    } catch {
      useToastStore.getState().showToast(t('toast.listingPublishError'));
    } finally {
      ui.setPortalBusy('');
    }
  }, [id]);

  const unpublishFromPortal = useCallback(async (portal: string) => {
    ui.setPortalBusy(portal);
    try {
      await api.delete(`/properties/${id}/listings/${portal}`);
      data.setListings((prev: any[]) => prev.filter((l: any) => l.portal !== portal));
      useToastStore.getState().showToast('Aviso despublicado');
    } catch {
      useToastStore.getState().showToast('Error al despublicar el aviso');
    } finally {
      ui.setPortalBusy('');
    }
  }, [id]);

  const handleContractDocUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data.property?.contract?.id) return;
    ui.setUploadingDoc(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data: res } = await api.post(`/contracts/${data.property.contract.id}/document`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      data.setContractDoc(res.data);
      useToastStore.getState().showToast('Contrato cargado correctamente');
    } catch {
      useToastStore.getState().showToast('Error al cargar el PDF');
    } finally {
      ui.setUploadingDoc(false);
    }
  }, [data.property]);

  const handlePhotoUpload = useCallback(async (files: File[]) => {
    ui.setUploadingPhotos(true);
    try {
      const formData = new FormData();
      files.forEach(f => formData.append('images[]', f));
      if (ui.photoUploadFolder) formData.append('folderId', ui.photoUploadFolder);
      if (ui.photoUploadTags.length > 0) {
        ui.photoUploadTags.forEach((t: string) => formData.append('tagIds[]', t));
      }
      const { data: res } = await api.post(`/properties/${id}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      data.setPhotos(res.data);
      useToastStore.getState().showToast(`${files.length} foto${files.length !== 1 ? 's' : ''} cargada${files.length !== 1 ? 's' : ''}`);
      ui.setPhotoUploadFolder('');
      ui.setPhotoUploadTags([]);
    } catch {
      useToastStore.getState().showToast('Error al cargar las fotos');
    } finally {
      ui.setUploadingPhotos(false);
      data.setPhotoPreview([]);
    }
  }, [id, ui.photoUploadFolder, ui.photoUploadTags]);

  const handlePhotoSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const previews = files.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    data.setPhotoPreview(previews);
    handlePhotoUpload(files);
  }, [handlePhotoUpload]);

  const togglePhotoUploadTag = useCallback((tagId: string) => {
    ui.setPhotoUploadTags((prev: string[]) =>
      prev.includes(tagId) ? prev.filter((t: string) => t !== tagId) : [...prev, tagId],
    );
  }, []);

  const handleDeletePhoto = useCallback(async (photoId: string) => {
    ui.setDeletingPhoto(true);
    try {
      const { data: res } = await api.delete(`/properties/${id}/photos/${photoId}`);
      data.setPhotos((prev: any[]) => prev.filter((p: any) => p.id !== photoId));
      ui.setPendingDeletePhotoId(null);
      useToastStore.getState().showToast(res.data.notifiedTenant ? 'Foto eliminada. Se notificó al inquilino.' : 'Foto eliminada.');
    } catch {
      useToastStore.getState().showToast('Error al eliminar la foto');
    } finally {
      ui.setDeletingPhoto(false);
    }
  }, [id]);

  const handleDeleteProperty = useCallback(async () => {
    ui.setDeletingProperty(true);
    try {
      await api.delete(`/properties/${id}`);
      useToastStore.getState().showToast('Inmueble eliminado');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['owner-subscription-summary'] });
      router.push('/properties');
    } catch {
      useToastStore.getState().showToast('Error al eliminar el inmueble');
    } finally {
      ui.setDeletingProperty(false);
    }
  }, [id]);

  const handleSelectClaim = useCallback((claim: Claim) => {
    ui.setSelectedClaim(claim);
    ui.setClaimUpdate({ status: '', comment: '', priority: claim.priority });
  }, []);

  return {
    openEditModal, openContractModal,
    handleSaveEdit, handleSaveContract, handleSaveTenant,
    handleDeleteTenant, handleUpdateClaim, handleAddPayment,
    handleExportPdf, publishToPortal, unpublishFromPortal,
    handleContractDocUpload, handlePhotoSelect, handlePhotoUpload,
    togglePhotoUploadTag, handleDeletePhoto, handleDeleteProperty,
    handleSelectClaim,
  };
}
