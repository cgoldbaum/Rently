import { z } from 'zod';

export const createPropertySchema = z.object({
  name: z.string().max(80).optional(),
  address: z.string().min(5, 'Address is required').max(150).refine(
    v => /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s.,\-#°/]+$/.test(v),
    'Address contains invalid characters',
  ),
  country: z.enum(['AR', 'CL', 'CO', 'UY']).default('AR'),
  // El backend se compila aislado (Railway, root /backend) y no puede importar @rently/shared.
  // Mantener en sync con PROPERTY_TYPES de shared/src/types.ts.
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH', 'GARAGE', 'DUPLEX']),
  surface: z.number().positive('Surface must be positive').max(99_999),
  antiquity: z.number().int().min(0).max(200).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'REGULAR', 'NEEDS_WORK']).optional(),
  description: z.string().max(500).optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
