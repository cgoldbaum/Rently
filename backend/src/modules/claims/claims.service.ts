import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateClaimInput, ResolveClaimInput } from './claims.schema';
import { sendPushToUser } from '../../lib/pushNotifications';
import { createNotification } from '../../lib/notify';

export async function createPublicClaim(linkToken: string, input: CreateClaimInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken },
    include: { contract: true },
  });

  if (!tenant) {
    throw new AppError('Invalid link token', 404, 'NOT_FOUND');
  }

  if (tenant.contract.endDate < new Date()) {
    throw new AppError('Contract has expired', 410, 'LINK_EXPIRED');
  }

  return prisma.claim.create({
    data: { ...input, tenantId: tenant.id },
  });
}

export async function markClaimInProgress(
  claimId: string,
  userId: string,
  input: { comment?: string }
) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: {
        include: {
          contract: { include: { property: true } },
        },
      },
    },
  });

  if (!claim) {
    throw new AppError('Claim not found', 404, 'NOT_FOUND');
  }

  if (claim.tenant.contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  if (claim.status !== 'OPEN') {
    throw new AppError('Only open claims can be marked in progress', 400, 'BAD_REQUEST');
  }

  await prisma.$transaction([
    prisma.claim.update({
      where: { id: claimId },
      data: { status: 'IN_PROGRESS' },
    }),
    prisma.claimHistory.create({
      data: {
        claimId,
        oldStatus: claim.status,
        newStatus: 'IN_PROGRESS',
        comment: input.comment,
      },
    }),
  ]);

  if (claim.tenant.userId) {
    await createNotification({
      userId: claim.tenant.userId,
      type: 'CLAIM',
      message: `Tu reclamo fue marcado como en curso por el propietario`,
      referenceId: claim.id,
    });
    sendPushToUser(claim.tenant.userId, 'Reclamo en curso', 'Tu reclamo fue marcado como en curso por el propietario', {
      type: 'claim',
      claimId: claim.id,
    });
  }

  return prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: { include: { contract: { include: { property: true } } } },
      history: { orderBy: { changedAt: 'desc' } },
    },
  });
}

export async function listClaimsByOwner(userId: string) {
  return prisma.claim.findMany({
    where: {
      tenant: {
        contract: { property: { userId } },
      },
    },
    include: {
      tenant: {
        include: {
          contract: { include: { property: true } },
        },
      },
      history: { orderBy: { changedAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listClaimsByProperty(propertyId: string, userId: string) {
  return prisma.claim.findMany({
    where: {
      tenant: {
        contract: { propertyId, property: { userId } },
      },
    },
    include: {
      tenant: {
        include: {
          contract: { include: { property: true } },
        },
      },
      history: { orderBy: { changedAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function resolveClaim(
  claimId: string,
  userId: string,
  input: ResolveClaimInput & { photoUrl?: string }
) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: {
        include: {
          contract: { include: { property: true } },
        },
      },
    },
  });

  if (!claim) {
    throw new AppError('Claim not found', 404, 'NOT_FOUND');
  }

  if (claim.tenant.contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }

  if (claim.status === 'RESOLVED') {
    throw new AppError('Claim already resolved', 400, 'BAD_REQUEST');
  }

  await prisma.$transaction([
    prisma.claim.update({
      where: { id: claimId },
      data: { status: 'RESOLVED' },
    }),
    prisma.claimHistory.create({
      data: {
        claimId,
        oldStatus: claim.status,
        newStatus: 'RESOLVED',
        comment: input.comment,
        photoUrl: input.photoUrl,
      },
    }),
  ]);

  if (claim.tenant.userId) {
    await createNotification({
      userId: claim.tenant.userId,
      type: 'CLAIM',
      message: `Tu reclamo fue marcado como resuelto por el propietario`,
      referenceId: claim.id,
    });
    sendPushToUser(claim.tenant.userId, 'Reclamo resuelto', 'Tu reclamo fue marcado como resuelto por el propietario', {
      type: 'claim',
      claimId: claim.id,
    });
  }

  return prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: { include: { contract: { include: { property: true } } } },
      history: { orderBy: { changedAt: 'desc' } },
    },
  });
}
