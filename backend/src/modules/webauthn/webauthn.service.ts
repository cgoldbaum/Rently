import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type VerifiedAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import prisma from '../../lib/prisma';
import jwt from 'jsonwebtoken';

const RP_NAME = 'Rently';

function getRpId(): string {
  const origin = process.env.RP_ORIGIN || process.env.APP_URL || 'http://localhost:3001';
  try {
    return new URL(origin).hostname;
  } catch {
    return 'localhost';
  }
}

function getOrigin(): string {
  return process.env.RP_ORIGIN || process.env.APP_URL || 'http://localhost:3001';
}

// In-memory challenge store (scoped to process; fine for single-instance Railway deployments)
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();

function storeChallenge(key: string, challenge: string) {
  challengeStore.set(key, { challenge, expiresAt: Date.now() + 5 * 60 * 1000 });
}

function consumeChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    challengeStore.delete(key);
    return null;
  }
  challengeStore.delete(key);
  return entry.challenge;
}

// ── Registration ─────────────────────────────────────────────────────────────

export async function startRegistration(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const existingCredentials = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { credentialId: true, transports: true },
  });

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userName: user.email,
    userDisplayName: user.name,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(c => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  storeChallenge(`reg:${userId}`, options.challenge);
  return options;
}

export async function finishRegistration(userId: string, body: RegistrationResponseJSON) {
  const expectedChallenge = consumeChallenge(`reg:${userId}`);
  if (!expectedChallenge) {
    throw Object.assign(new Error('Challenge expirado, intentá de nuevo'), { status: 400 });
  }

  let verification: VerifiedRegistrationResponse;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
    });
  } catch (err: unknown) {
    throw Object.assign(new Error('Verificación fallida: ' + (err as Error).message), { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    throw Object.assign(new Error('No se pudo verificar el dispositivo'), { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  await prisma.webAuthnCredential.create({
    data: {
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: BigInt(credential.counter),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: body.response.transports ?? [],
    },
  });

  return { ok: true };
}

// ── Authentication ────────────────────────────────────────────────────────────

export async function startAuthentication(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // If no user or no credentials, still return valid options (prevents email enumeration)
  const credentials = user
    ? await prisma.webAuthnCredential.findMany({ where: { userId: user.id } })
    : [];

  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: 'preferred',
    allowCredentials: credentials.map(c => ({
      id: c.credentialId,
      transports: c.transports as AuthenticatorTransportFuture[],
    })),
  });

  const challengeKey = `auth:${email}`;
  storeChallenge(challengeKey, options.challenge);
  return options;
}

export async function finishAuthentication(email: string, body: AuthenticationResponseJSON) {
  const expectedChallenge = consumeChallenge(`auth:${email}`);
  if (!expectedChallenge) {
    throw Object.assign(new Error('Challenge expirado, intentá de nuevo'), { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw Object.assign(new Error('Credencial no encontrada'), { status: 401 });
  }

  const credential = await prisma.webAuthnCredential.findUnique({
    where: { credentialId: body.id },
  });
  if (!credential || credential.userId !== user.id) {
    throw Object.assign(new Error('Credencial no encontrada'), { status: 401 });
  }

  let verification: VerifiedAuthenticationResponse;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge,
      expectedOrigin: getOrigin(),
      expectedRPID: getRpId(),
      credential: {
        id: credential.credentialId,
        publicKey: new Uint8Array(credential.publicKey),
        counter: Number(credential.counter),
        transports: credential.transports as AuthenticatorTransportFuture[],
      },
    });
  } catch (err: unknown) {
    throw Object.assign(new Error('Verificación fallida: ' + (err as Error).message), { status: 401 });
  }

  if (!verification.verified) {
    throw Object.assign(new Error('No se pudo verificar la identidad'), { status: 401 });
  }

  // Update counter
  await prisma.webAuthnCredential.update({
    where: { credentialId: credential.credentialId },
    data: { counter: BigInt(verification.authenticationInfo.newCounter) },
  });

  // Issue tokens (same as regular login)
  let tenantId: string | undefined;
  if (user.role === 'TENANT') {
    const tenant = await prisma.tenant.findFirst({ where: { userId: user.id } });
    tenantId = tenant?.id;
  }

  const accessToken = jwt.sign(
    { userId: user.id, role: user.role, tenantId },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' } as jwt.SignOptions,
  );
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.REFRESH_TOKEN_SECRET!,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d' } as jwt.SignOptions,
  );

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

// ── List / Delete credentials ─────────────────────────────────────────────────

export async function listCredentials(userId: string) {
  const creds = await prisma.webAuthnCredential.findMany({
    where: { userId },
    select: { id: true, deviceType: true, backedUp: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  return creds;
}

export async function deleteCredential(userId: string, credentialDbId: string) {
  const cred = await prisma.webAuthnCredential.findUnique({ where: { id: credentialDbId } });
  if (!cred || cred.userId !== userId) {
    throw Object.assign(new Error('Credencial no encontrada'), { status: 404 });
  }
  await prisma.webAuthnCredential.delete({ where: { id: credentialDbId } });
}
