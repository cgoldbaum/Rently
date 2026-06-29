
export interface Tenant {
  id: string; name: string; email: string; phone?: string; linkToken: string;
}
export interface Contract {
  id: string; startDate: string; endDate: string; initialAmount: number; currentAmount: number;
  currency?: 'ARS' | 'USD';
  paymentDay: number; indexType: string; adjustFrequency: number; nextAdjustDate: string;
  tenants?: Tenant[];
  document?: { fileUrl: string; fileName?: string; uploadedAt: string } | null;
}
export interface Property {
  id: string; name?: string; address: string; country?: string; type: string; surface: number; status: string;
  antiquity?: number; description?: string;
  contract?: Contract;
}
export interface Claim {
  id: string; category: string; description: string; status: string; priority: string;
  photoUrl?: string; createdAt: string;
  history: { oldStatus: string; newStatus: string; comment?: string; changedAt: string }[];
}
export interface AdjustmentHistory {
  id: string; indexType: string; previousAmount: number; newAmount: number; variation: number; appliedAt: string; notified: boolean;
}
export interface Payment {
  id: string; amount: number; currency?: 'ARS' | 'USD'; period: string; dueDate: string; paidDate?: string; status: string; method?: string;
}
export interface PhotoTag {
  id: string; name: string; color?: string; isDefault: boolean;
}
export interface PhotoTagRel { tag: PhotoTag; }
export interface PropertyPhoto {
  id: string; fileUrl: string; thumbnailUrl?: string; caption?: string; folderId?: string | null; uploadedAt: string; tags: PhotoTagRel[];
}
export interface PhotoFolder {
  id: string; name: string; description?: string | null; _count?: { photos: number };
}
export interface PortalListing {
  id: string; portal: string; status: string; listingUrl: string; publishedAt: string;
}
