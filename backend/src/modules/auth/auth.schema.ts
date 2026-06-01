import { z } from 'zod';

export const registerSchema = z.object({
  name: z
    .string()
    .min(3, 'El nombre debe tener al menos 3 caracteres'),
  email: z
    .string()
    .email('Ingresá un correo electrónico válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .refine(v => /[A-Z]/.test(v), 'La contraseña debe incluir al menos una mayúscula')
    .refine(v => /\d/.test(v), 'La contraseña debe incluir al menos un número'),
  role: z.enum(['OWNER', 'TENANT']).default('OWNER'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Ingresá un correo electrónico válido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
  role: z.enum(['OWNER', 'TENANT']).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
