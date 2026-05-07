import { z } from 'zod';

// ── Shared building blocks ─────────────────────────────────────────────────

const passwordField = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(64, 'La contraseña no puede superar los 64 caracteres')
  .refine(v => /[A-Z]/.test(v), 'La contraseña debe incluir al menos una mayúscula')
  .refine(v => /\d/.test(v), 'La contraseña debe incluir al menos un número');

const nameField = z
  .string()
  .min(3, 'El nombre debe tener al menos 3 caracteres')
  .max(60, 'El nombre no puede superar los 60 caracteres')
  .refine(
    v => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s'-]+$/.test(v),
    'El nombre solo puede contener letras, espacios y guiones',
  );

const emailField = z
  .string()
  .min(1, 'El email es requerido')
  .email('Ingresá un correo electrónico válido (ej: usuario@gmail.com)');

const phoneField = z.string().refine(
  v => v === '' || /^\+?[\d\s\-().]{7,20}$/.test(v),
  'El teléfono debe contener entre 7 y 20 dígitos (ej: +54 11 1234-5678)',
);

// ── Auth ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, 'La contraseña es requerida'),
});

export const registerSchema = z
  .object({
    name: nameField,
    email: emailField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine(d => d.password === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({ email: emailField });

export const resetPasswordSchema = z
  .object({
    newPassword: passwordField,
    confirmPassword: z.string(),
  })
  .refine(d => d.newPassword === d.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

// ── Profile ────────────────────────────────────────────────────────────────

export const profileSchema = z.object({
  name: nameField,
  phone: phoneField,
});

// ── Property ───────────────────────────────────────────────────────────────

export const propertySchema = z.object({
  name: z.string().max(80, 'El nombre no puede superar los 80 caracteres'),
  address: z
    .string()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(150, 'La dirección no puede superar los 150 caracteres')
    .refine(
      v => /^[a-zA-Z0-9áéíóúÁÉÍÓÚüÜñÑ\s.,\-#°/]+$/.test(v),
      'La dirección contiene caracteres inválidos',
    ),
  country: z.enum(['AR', 'CL', 'CO', 'UY']),
  type: z.enum(['APARTMENT', 'HOUSE', 'COMMERCIAL', 'PH']),
  surface: z.coerce
    .number({ invalid_type_error: 'La superficie debe ser un número' })
    .positive('La superficie debe ser mayor a 0')
    .max(99_999, 'La superficie no puede superar los 99.999 m²'),
  antiquity: z.coerce.number().int().min(0).max(200).optional(),
  description: z.string().max(500, 'La descripción no puede superar los 500 caracteres'),
});

// ── Contract ───────────────────────────────────────────────────────────────

export const contractSchema = z
  .object({
    startDate: z.string().min(1, 'La fecha de inicio es requerida'),
    endDate: z.string().min(1, 'La fecha de fin es requerida'),
    initialAmount: z.coerce
      .number({ invalid_type_error: 'El monto debe ser un número' })
      .positive('El monto debe ser mayor a 0')
      .max(999_999_999, 'El monto es demasiado alto'),
    currency: z.enum(['ARS', 'USD']),
    paymentDay: z.coerce
      .number()
      .int()
      .min(1, 'El día de pago debe ser al menos 1')
      .max(28, 'El día de pago debe ser entre 1 y 28 (evita problemas en meses cortos)'),
    indexType: z.string().min(1, 'Seleccioná un índice de ajuste'),
    adjustFrequency: z.coerce
      .number()
      .int()
      .min(1, 'La frecuencia debe ser al menos 1 mes')
      .max(24, 'La frecuencia no puede superar los 24 meses'),
  })
  .refine(d => d.startDate && d.endDate && new Date(d.endDate) > new Date(d.startDate), {
    message: 'La fecha de fin debe ser posterior a la de inicio',
    path: ['endDate'],
  })
  .refine(
    d => {
      if (!d.startDate || !d.endDate) return true;
      const s = new Date(d.startDate);
      const e = new Date(d.endDate);
      return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) >= 1;
    },
    { message: 'El contrato debe durar al menos un mes', path: ['endDate'] },
  );

// ── Tenant ─────────────────────────────────────────────────────────────────

export const tenantSchema = z.object({
  name: nameField,
  email: emailField,
  phone: phoneField,
});

// ── Payment ────────────────────────────────────────────────────────────────

export const paymentSchema = z.object({
  period: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'El período debe tener el formato YYYY-MM (ej: 2026-04)'),
  amount: z.coerce
    .number({ invalid_type_error: 'El monto debe ser un número' })
    .positive('El monto debe ser mayor a 0')
    .max(999_999_999, 'El monto es demasiado alto'),
  currency: z.enum(['ARS', 'USD']),
  dueDate: z.string().min(1, 'La fecha de vencimiento es requerida'),
  method: z.string(),
});

// ── Claims ─────────────────────────────────────────────────────────────────

export const claimSchema = z.object({
  title: z
    .string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(100, 'El título no puede superar los 100 caracteres'),
  description: z
    .string()
    .min(10, 'Describí el problema con al menos 10 caracteres')
    .max(1000, 'La descripción no puede superar los 1000 caracteres'),
});

export const claimDescriptionSchema = z.object({
  description: z
    .string()
    .min(10, 'Describí el problema con al menos 10 caracteres')
    .max(1000, 'La descripción no puede superar los 1000 caracteres'),
});

// ── Helper ─────────────────────────────────────────────────────────────────

/** Extrae el primer mensaje de error por campo de un ZodError */
export function getFieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.');
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}
