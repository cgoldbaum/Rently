/** Única fuente de verdad de los tipos de propiedad; de aquí derivan el tipo y los enums Zod. */
export const PROPERTY_TYPES = ['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH', 'GARAGE', 'DUPLEX'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: 'OWNER' | 'TENANT';
  /** Perfil de inquilino activo (alquiler seleccionado). */
  tenantId?: string;
  /** Todos los perfiles de inquilino del usuario (un id por alquiler). */
  tenantIds?: string[];
  /** Puede operar como propietario. */
  canOwner?: boolean;
  /** Tiene al menos un alquiler (puede operar como inquilino). */
  canTenant?: boolean;
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

// ── Payment STATUS ───────────────────────────────────────────────────────────

export const PAYMENT_STATUSES = ['PENDING', 'PAID', 'LATE', 'PENDING_CONFIRMATION'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// ── Contract / Payment (shared type for frontend + mobile) ───────────────────

export interface Contract {
  id: string;
  startDate: Date | string;
  endDate: Date | string;
  initialAmount: number;
  currentAmount: number;
  currency?: string | null;
  paymentDay: number;
  indexType: string;
  adjustFrequency: number | null;
  nextAdjustDate?: Date | string | null;
}

export interface Payment {
  id: string;
  amount: number;
  currency?: string | null;
  period: string;
  dueDate: Date | string;
  paidDate?: Date | string | null;
  status: PaymentStatus | string;
  method?: string | null;
  /** Owner: installment grouping */
  installmentGroupId?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  /** Tenant: cash payment note */
  cashNote?: string | null;
}

// ── Claim ────────────────────────────────────────────────────────────────────

export const CLAIM_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED'] as const;
export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export const CLAIM_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const;
export type ClaimPriority = (typeof CLAIM_PRIORITIES)[number];

export const CLAIM_CATEGORIES = ['PLUMBING', 'ELECTRICITY', 'STRUCTURE', 'OTHER'] as const;
export type ClaimCategory = (typeof CLAIM_CATEGORIES)[number];
