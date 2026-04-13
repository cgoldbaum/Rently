import { z } from 'zod';

export const createContractSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  initialAmount: z.number().positive(),
  paymentDay: z.number().int().min(1).max(31),
  indexType: z.enum(['IPC', 'ICL']),
  adjustFrequency: z.number().int().positive(),
});

export const updateContractSchema = createContractSchema.partial();

export type CreateContractInput = z.infer<typeof createContractSchema>;
export type UpdateContractInput = z.infer<typeof updateContractSchema>;
