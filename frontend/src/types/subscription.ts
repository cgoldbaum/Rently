// Tipos de suscripción (definidos localmente para que el frontend no dependa
// del paquete @rently/shared en el build aislado de Railway).

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
