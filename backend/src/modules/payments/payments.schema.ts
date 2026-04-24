import { z } from 'zod';

export const createPaymentSchema = z.object({
  amount: z.number().positive(),
  period: z.string().min(1),
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
