import { z } from 'zod';

export const createClaimSchema = z.object({
  category: z.enum(['PLUMBING', 'ELECTRICITY', 'STRUCTURE', 'OTHER']),
  description: z.string().min(1, 'Description is required'),
  photoUrl: z.string().url().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
});

export const updateClaimSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  comment: z.string().optional(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
});

export type CreateClaimInput = z.infer<typeof createClaimSchema>;
export type UpdateClaimInput = z.infer<typeof updateClaimSchema>;
