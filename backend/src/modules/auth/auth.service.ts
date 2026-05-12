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

  await prisma.refreshToken.deleteMany({ where: { token } });

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
      'Recuperá tu contraseña — Rently',
      `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
        <tr><td align="center">
          <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(43,29,16,0.08);">
            <tr><td style="background:#c4713a;padding:28px 40px;">
              <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Rently</span>
            </td></tr>
            <tr><td style="padding:36px 40px;">
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
              </p>
            </td></tr>
            <tr><td style="padding:20px 40px;background:#f5f0e8;border-top:1px solid #ede7dc;">
              <p style="margin:0;font-size:12px;color:#b09a87;text-align:center;">
                © ${new Date().getFullYear()} Rently — Este email fue enviado automáticamente, no respondas a este mensaje.
              </p>
            </td></tr>
          </table>
        </td></tr>
      </table>
      </body></html>`
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
