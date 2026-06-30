import { z } from 'zod';

export const subscriptionPlanCodeSchema = z.enum(['STARTER', 'PRO', 'AGENCY']);

export const subscriptionCheckoutSchema = z.object({
  planCode: subscriptionPlanCodeSchema,
});

export type SubscriptionPlanCodeInput = z.infer<typeof subscriptionPlanCodeSchema>;
export type SubscriptionCheckoutInput = z.infer<typeof subscriptionCheckoutSchema>;
