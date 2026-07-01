import { z } from 'zod';

const i18n = (key: string) => ({ params: { i18n: key } });

export const registerSchema = z.object({
  name: z
    .string()
    .min(3)
    .max(60)
    .refine(
      v => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(v),
      i18n('name.format'),
    ),
  email: z
    .string()
    .min(1)
    .email(),
  password: z
    .string()
    .min(8)
    .max(64)
    .refine(v => /[A-Z]/.test(v), i18n('password.uppercase'))
    .refine(v => /\d/.test(v), i18n('password.number')),
  role: z.enum(['OWNER', 'TENANT']).default('OWNER'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .min(1)
    .email(),
  password: z
    .string()
    .min(1),
  role: z.enum(['OWNER', 'TENANT']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
