import { z } from 'zod';

export const createContractSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  initialAmount: z.number().positive().max(999_999_999),
  paymentDay: z.number().int().min(1).max(28),
  indexType: z.enum(['IPC', 'ICL', 'MANUAL']),
  adjustFrequency: z.number().int().min(0).max(24).optional().default(0),
  currency: z.enum(['ARS', 'USD']).optional(),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
