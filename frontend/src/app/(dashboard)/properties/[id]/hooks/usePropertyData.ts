'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import type { Property, Claim, Payment, PortalListing, AdjustmentHistory, PropertyPhoto, PhotoFolder, PhotoTag } from '../types';

export function usePropertyData(id: string) {
  const router = useRouter();
  const [property, setProperty] = useState<Property | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [adjustments, setAdjustments] = useState<AdjustmentHistory[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [expenseReceipts, setExpenseReceipts] = useState<{ id: string; period: string; fileUrl: string; fileName: string | null; uploadedAt: string }[]>([]);
  const [listings, setListings] = useState<PortalListing[]>([]);
  const [folders, setFolders] = useState<PhotoFolder[]>([]);
  const [photoTags, setPhotoTags] = useState<PhotoTag[]>([]);
  const [contractDoc, setContractDoc] = useState<{ fileUrl: string; fileName?: string; uploadedAt: string } | null>(null);
  const [photoPreview, setPhotoPreview] = useState<{ url: string; name: string }[]>([]);
  const [photoFolderFilter, setPhotoFolderFilter] = useState('');

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

  return {
    property, setProperty,
    claims, setClaims,
    adjustments, setAdjustments,
    payments, setPayments,
    photos, setPhotos,
    expenseReceipts, setExpenseReceipts,
    listings, setListings,
    folders, setFolders,
    photoTags, setPhotoTags,
    contractDoc, setContractDoc,
    photoPreview, setPhotoPreview,
    photoFolderFilter, setPhotoFolderFilter,
  };
}
