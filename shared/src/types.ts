export interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'TENANT';
  tenantId?: string;
}

export type SubscriptionPlanCode = 'STARTER' | 'PRO' | 'AGENCY';
export type OwnerSubscriptionStatus = 'ACTIVE' | 'PENDING' | 'PAST_DUE' | 'CANCELED' | 'EXPIRED';

export interface SubscriptionPlan {
  id: string;
  code: SubscriptionPlanCode;
  name: string;
  description?: string | null;
  propertyLimit: number | null;
  price: number;
  currency: 'ARS' | 'USD';
  active?: boolean;
}

export interface SubscriptionSummary {
  subscription: {
    id: string;
    status: OwnerSubscriptionStatus;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    graceUntil?: string | null;
    initPoint?: string | null;
    plan: SubscriptionPlan;
  } | null;
  usage: {
    properties: number;
    propertyLimit: number | null;
    canCreateProperty: boolean;
    blockingReason: string | null;
  };
  plans: SubscriptionPlan[];
}

export interface PhotoTag {
  id: string;
  name: string;
  color?: string | null;
  isDefault: boolean;
  createdAt: string;
}

export interface PhotoFolder {
  id: string;
  propertyId: string;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { photos: number };
}

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  caption?: string | null;
  folderId?: string | null;
  folder?: PhotoFolder | null;
  tags: { tag: PhotoTag }[];
  takenAt?: string | null;
  deletedAt?: string | null;
  uploadedAt: string;
}
