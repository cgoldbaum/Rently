import { z } from 'zod';

const i18n = (key: string) => ({ params: { i18n: key } });

export const createPropertySchema = z.object({
  name: z.string().max(80).optional(),
  address: z.string().min(5).max(150).refine(
    v => /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s.,\-#°/]+$/.test(v),
    i18n('address.format'),
  ),
  country: z.enum(['AR', 'CL', 'CO', 'UY']).default('AR'),
  // Mantener en sync con PROPERTY_TYPES de shared/src/types.ts.
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH', 'GARAGE', 'DUPLEX']),
  surface: z.number().positive().max(99_999),
  antiquity: z.number().int().min(0).max(200).optional(),
  condition: z.enum(['EXCELLENT', 'GOOD', 'REGULAR', 'NEEDS_WORK']).optional(),
  description: z.string().max(500).optional(),
  // No usar .cuid(): los datos de seed usan ids legibles (ej. "prop-demo-1"), no CUIDs.
  parentPropertyId: z.string().min(1).nullable().optional(),
});

export const updatePropertySchema = createPropertySchema.partial();

export type CreatePropertyInput = z.infer<typeof createPropertySchema>;
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
