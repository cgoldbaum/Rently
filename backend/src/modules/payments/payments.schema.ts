import { z } from 'zod';

const i18n = (key: string) => ({ params: { i18n: key } });

export const createPaymentSchema = z.object({
  amount: z.number().positive().max(999_999_999),
  currency: z.enum(['ARS', 'USD']).optional(),
  period: z.string().refine(v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v), i18n('payment.periodFormat')),
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
