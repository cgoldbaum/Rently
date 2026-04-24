import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { RegisterInput, LoginInput } from './auth.schema';

function generateAccessToken(userId: string, role: string, tenantId?: string): string {
  return jwt.sign({ userId, role, tenantId }, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  } as jwt.SignOptions);
}

function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET!, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d',
  } as jwt.SignOptions);
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('Email already in use'), { code: 'EMAIL_IN_USE', status: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const role = input.role === 'TENANT' ? 'TENANT' : 'OWNER';

  const user = await prisma.user.create({
    data: { email: input.email, name: input.name, passwordHash, role },
  });

  // Link to an existing Tenant record with the same email (owner may have pre-loaded the tenant)
  if (role === 'TENANT') {
    await prisma.tenant.updateMany({
      where: { email: input.email, userId: null },
      data: { userId: user.id },
    });
  }

  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('Email o contraseña incorrectos'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Email o contraseña incorrectos'), { code: 'INVALID_CREDENTIALS', status: 401 });
  }

  if (input.role && input.role !== user.role) {
    throw Object.assign(
      new Error('Rol incorrecto. Verificá si sos propietario o inquilino.'),
      { code: 'ROLE_MISMATCH', status: 403 }
    );
  }

  let tenantId: string | undefined;
  if (user.role === 'TENANT') {
    const tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    tenantId = tenant?.id;
  }

  const accessToken = generateAccessToken(user.id, user.role, tenantId);
  const refreshToken = generateRefreshToken(user.id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: refreshToken, userId: user.id, expiresAt },
  });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId },
  };
}

export async function refresh(token: string) {
  let payload: { userId: string };
  try {
    payload = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as { userId: string };
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { code: 'INVALID_TOKEN', status: 401 });
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token expired or not found'), { code: 'INVALID_TOKEN', status: 401 });
  }

  await prisma.refreshToken.delete({ where: { token } });

  const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.userId } });
  let tenantId: string | undefined;
  if (user.role === 'TENANT') {
    const tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    tenantId = tenant?.id;
  }

  const newRefreshToken = generateRefreshToken(payload.userId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({
    data: { token: newRefreshToken, userId: payload.userId, expiresAt },
  });

  const accessToken = generateAccessToken(user.id, user.role, tenantId);
  return { accessToken, refreshToken: newRefreshToken };
}

export async function logout(token: string) {
  await prisma.refreshToken.deleteMany({ where: { token } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  let tenantId: string | undefined;
  if (user.role === 'TENANT') {
    const tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    tenantId = tenant?.id;
  }
  return { id: user.id, email: user.email, name: user.name, phone: user.phone ?? null, role: user.role, tenantId };
}

export async function updateMe(userId: string, data: { name?: string; phone?: string }) {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: data.name, phone: data.phone },
  });
  return { id: user.id, email: user.email, name: user.name, phone: user.phone ?? null, role: user.role };
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
      'Recuperación de contraseña — Rently',
      `<p>Hola ${user.name},</p><p>Hacé click en el siguiente link para restablecer tu contraseña:</p><p><a href="${link}">${link}</a></p><p>El link expira en 1 hora.</p>`
    );
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!record || record.used || record.expiresAt < new Date()) {
    throw Object.assign(new Error('Token inválido o expirado'), { code: 'INVALID_TOKEN', status: 400 });
  }
  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { used: true } }),
  ]);
}
