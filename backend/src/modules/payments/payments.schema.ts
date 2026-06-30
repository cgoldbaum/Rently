import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive().max(999_999_999),
  currency: z.enum(['ARS', 'USD']).optional(),
  period: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Period must be in YYYY-MM format'),
  dueDate: z.string().datetime(),
  paidDate: z.string().datetime().optional(),
  status: z.enum(['PENDING', 'PAID', 'LATE', 'PENDING_CONFIRMATION']).optional(),
  method: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'LATE', 'PENDING_CONFIRMATION']),
  paidDate: z.string().datetime().optional(),
  method: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type UpdatePaymentInput = z.infer<typeof updatePaymentSchema>;
