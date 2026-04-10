import { z } from 'zod';

export const createAdjustmentSchema = z.object({
  indexType: z.enum(['IPC', 'ICL']),
  previousAmount: z.number().positive(),
  newAmount: z.number().positive(),
  variation: z.number(),
  notified: z.boolean().optional(),
});

export type CreateAdjustmentInput = z.infer<typeof createAdjustmentSchema>;
