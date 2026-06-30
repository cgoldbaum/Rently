import { AppError } from '../../lib/AppError';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import prisma from '../../lib/prisma';
import { sendEmail, buildBrandedEmail } from '../../lib/email';
import { RegisterInput, LoginInput } from './auth.schema';

function generateAccessToken(userId: string, role: string, tenantId?: string): string {
  return jwt.sign({ userId, role, tenantId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, jti: randomBytes(16).toString('hex') },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' } as jwt.SignOptions
  );
}

/**
 * Carga el usuario junto con sus capacidades:
 * - canOwner: puede operar como propietario.
 * - canTenant: tiene al menos un perfil de inquilino (uno o varios alquileres).
 * - tenantIds: ids de sus perfiles de inquilino (uno por alquiler).
 * El tenantId "por defecto" (primero) se usa para el token; el alquiler activo
 * se resuelve por request con el header X-Tenant-Id.
 */
async function loadAuthUser(user: { id: string; email: string; name: string; phone?: string | null; role: string }) {
  const tenantProfiles = await prisma.tenant.findMany({
    where: { userId: user.id },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  const tenantIds = tenantProfiles.map((t) => t.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    phone: user.phone ?? null,
    role: user.role,
    tenantId: tenantIds[0],
    tenantIds,
    canOwner: user.role === 'OWNER',
    canTenant: tenantIds.length > 0,
  };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError('Email already in use', 409, 'EMAIL_IN_USE');
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const role = input.role === 'TENANT' ? 'TENANT' : 'OWNER';

  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role },
  });

  // Vincular cualquier perfil de inquilino pre-cargado con el mismo email (sin importar el rol):
  // permite que un propietario también sea inquilino.
  await prisma.tenant.updateMany({
    where: { email: input.email, userId: null },
    data: { userId: user.id },
  });

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new AppError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw new AppError('Email o contraseña incorrectos', 401, 'INVALID_CREDENTIALS');
  }

  const authUser = await loadAuthUser(user);

  // El login admite elegir la vista de entrada. Sólo bloqueamos si la cuenta no tiene
  // esa capacidad (no hay perfil de inquilino, o no es propietario).
  if (input.role === 'OWNER' && !authUser.canOwner) {
    throw new AppError('Esta cuenta no es de propietario.', 403, 'ROLE_MISMATCH');
  }
  if (input.role === 'TENANT' && !authUser.canTenant) {
    throw new AppError('Esta cuenta no tiene ningún alquiler asociado.', 403, 'ROLE_MISMATCH');
  }

  const accessToken = generateAccessToken(user.id, user.role, authUser.tenantId);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return { accessToken, refreshToken, user: authUser };
}

export async function refresh(token: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };
  } catch {
    throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new AppError('Refresh token expired or not found', 401, 'INVALID_TOKEN');
  }

  await prisma.refreshToken.deleteMany({ where: { token } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.userId } });
  const authUser = await loadAuthUser(user);

  const newRefreshToken = generateRefreshToken(payload.userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: payload.userId, expiresAt },
  });

  const accessToken = generateAccessToken(user.id, user.role, authUser.tenantId);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return loadAuthUser(user);
}

export async function updateMe(userId: string, data: { name?: string; phone?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone },
  });
  return loadAuthUser(user);
}

export async function deleteMe(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const link = `${appUrl}/reset-password?token=${token}`;
    await sendEmail(
      email,
      'Recuperá tu contraseña — Rently',
      buildBrandedEmail(`
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">Hola, ${user.name} 👋</h2>
            <p style="margin:0 0 24px;font-size:15px;color:#7a6757;line-height:1.6;">
              Recibimos una solicitud para restablecer tu contraseña. Hacé click en el botón para continuar:
            </p>
            <a href="${link}" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
              Restablecer contraseña
            </a>
            <p style="margin:24px 0 0;font-size:13px;color:#b09a87;line-height:1.5;">
              Si no solicitaste este cambio, podés ignorar este email. El link expira en <strong>1 hora</strong>.
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#c9b9a8;">
              O copiá este link en tu navegador:<br>
              <span style="color:#c4713a;word-break:break-all;">${link}</span>
            </p>`, 'Este email fue enviado automáticamente, no respondas a este mensaje.')
    );
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    throw new AppError('Token inválido o expirado', 400, 'INVALID_TOKEN');
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);
}
