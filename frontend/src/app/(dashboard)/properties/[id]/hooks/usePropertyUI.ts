'use client';

import { useState } from 'react';
import type { Claim, Tenant } from '../types';

export function usePropertyUI() {
  const [tab, setTab] = useState('overview');
  const [previewPortal, setPreviewPortal] = useState<{ key: string; name: string; color: string } | null>(null);
  const [portalBusy, setPortalBusy] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [confirmDeleteProperty, setConfirmDeleteProperty] = useState(false);
  const [deletingProperty, setDeletingProperty] = useState(false);

  // Edit property modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', address: '', country: 'AR', type: 'APARTMENT', surface: '', antiquity: '', description: '' });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Contract modal
  const [showContractModal, setShowContractModal] = useState(false);
  const [contractForm, setContractForm] = useState({ startDate: '', endDate: '', initialAmount: '', paymentDay: '1', indexType: 'ICL', adjustFrequency: '3', currency: 'USD' as 'ARS' | 'USD' });
  const [savingContract, setSavingContract] = useState(false);
  const [contractErrors, setContractErrors] = useState<Record<string, string>>({});

  // Tenant modal
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [tenantForm, setTenantForm] = useState({ name: '', email: '', phone: '' });
  const [savingTenant, setSavingTenant] = useState(false);
  const [tenantErrors, setTenantErrors] = useState<Record<string, string>>({});
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
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({});

  // Contract document
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [importingContract, setImportingContract] = useState(false);

  // Photos
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [pendingDeletePhotoId, setPendingDeletePhotoId] = useState<string | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);
  const [photoUploadFolder, setPhotoUploadFolder] = useState('');
  const [photoUploadTags, setPhotoUploadTags] = useState<string[]>([]);

  return {
    tab, setTab,
    previewPortal, setPreviewPortal,
    portalBusy, setPortalBusy,
    exportingPdf, setExportingPdf,
    confirmDeleteProperty, setConfirmDeleteProperty,
    deletingProperty, setDeletingProperty,

    showEditModal, setShowEditModal,
    editForm, setEditForm,
    savingEdit, setSavingEdit,
    editErrors, setEditErrors,

    showContractModal, setShowContractModal,
    contractForm, setContractForm,
    savingContract, setSavingContract,
    contractErrors, setContractErrors,

    showTenantModal, setShowTenantModal,
    tenantForm, setTenantForm,
    savingTenant, setSavingTenant,
    tenantErrors, setTenantErrors,
    deleteTenantTarget, setDeleteTenantTarget,
    deletingTenant, setDeletingTenant,

    selectedClaim, setSelectedClaim,
    claimUpdate, setClaimUpdate,
    updatingClaim, setUpdatingClaim,

    showPaymentModal, setShowPaymentModal,
    paymentForm, setPaymentForm,
    savingPayment, setSavingPayment,
    paymentErrors, setPaymentErrors,

    uploadingDoc, setUploadingDoc,
    importingContract, setImportingContract,

    uploadingPhotos, setUploadingPhotos,
    pendingDeletePhotoId, setPendingDeletePhotoId,
    deletingPhoto, setDeletingPhoto,
    photoUploadFolder, setPhotoUploadFolder,
    photoUploadTags, setPhotoUploadTags,
  };
}
