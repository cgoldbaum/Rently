import { z } from 'zod';
import { PROPERTY_TYPES } from '../types';

// ── Mensajes ────────────────────────────────────────────────────────────────
// Los textos de error se traducen vía el `customError` map de Zod (ver
// i18n/zodErrorMap.ts), que cada app activa con `applyZodErrorMap`. Los issues
// estándar (min/max/email/required) salen genéricos y traducidos; los `.refine()`
// pasan `params.i18n` con la subclave bajo `zod:custom.*`.
const i18n = (key: string) => ({ params: { i18n: key } });

// ── Shared building blocks ─────────────────────────────────────────────────

const passwordField = z
  .string()
  .min(8)
  .max(64)
  .refine(v => /[A-Z]/.test(v), i18n('password.uppercase'))
  .refine(v => /\d/.test(v), i18n('password.number'));

const nameField = z
  .string()
  .min(3)
  .max(60)
  .refine(v => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(v), i18n('name.format'));

const emailField = z.string().min(1).email();

const phoneField = z
  .string()
  .refine(v => v === '' || /^\+?[\d\s\-().]{7,20}$/.test(v), i18n('phone.format'));

// ── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
});

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    ...i18n('password.match'),
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    ...i18n('password.match'),
    path: ['confirmPassword'],
  });

// ── Profile ────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: nameField,
  phone: phoneField,
});

// ── Property ───────────────────────────────────────────────────────────────

export const propertySchema = z.object({
  name: z.string().max(80),
  address: z
    .string()
    .min(5)
    .max(150)
    .refine(v => /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s.,\-#°/]+$/.test(v), i18n('address.format')),
  country: z.enum(['AR', 'CL', 'CO', 'UY']),
  type: z.enum(PROPERTY_TYPES),
  surface: z.coerce.number().positive().max(99_999),
  antiquity: z.coerce.number().int().min(0).max(200).optional(),
  description: z.string().max(500),
});

// ── Contract ───────────────────────────────────────────────────────────────

export const contractSchema = z
  .object({
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    initialAmount: z.coerce.number().positive().max(999_999_999),
    currency: z.enum(['ARS', 'USD']),
    paymentDay: z.coerce.number().int().min(1).max(28),
    indexType: z.string().min(1),
    adjustFrequency: z.coerce.number().int().min(0).max(24).optional(),
  })
  .refine(d => d.startDate && d.endDate && new Date(d.endDate) > new Date(d.startDate), {
    ...i18n('contract.endAfterStart'),
    path: ['endDate'],
  })
  .refine(
    d => {
      if (!d.startDate || !d.endDate) return true;
      const s = new Date(d.startDate);
      const e = new Date(d.endDate);
      return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) >= 1;
    },
    { ...i18n('contract.minOneMonth'), path: ['endDate'] },
  )
  .superRefine((d, ctx) => {
    if (d.indexType !== 'MANUAL' && (!d.adjustFrequency || d.adjustFrequency < 1)) {
      ctx.addIssue({
        code: 'custom',
        params: { i18n: 'contract.adjustFreqMin' },
        path: ['adjustFrequency'],
      });
    }
  });

// ── Tenant ─────────────────────────────────────────────────────────────────

export const tenantSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
});

// ── Payment ────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  period: z.string().refine(v => /^\d{4}-(0[1-9]|1[0-2])$/.test(v), i18n('payment.periodFormat')),
  amount: z.coerce.number().positive().max(999_999_999),
  currency: z.enum(['ARS', 'USD']),
  dueDate: z.string().min(1),
  method: z.string(),
});

// ── Claims ─────────────────────────────────────────────────────────────────

export const claimSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(1000),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
});

export const claimDescriptionSchema = z.object({
  description: z.string().min(10).max(1000),
});

// ── Helper ─────────────────────────────────────────────────────────────────

export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
