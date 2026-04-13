import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().optional(),
  address: z.string().min(1, 'Address is required'),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH']),
  surface: z.number().positive('Surface must be positive'),
  antiquity: z.number().int().min(0).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'REGULAR', 'NEEDS_WORK']).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
