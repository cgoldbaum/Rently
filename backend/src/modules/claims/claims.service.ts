import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { CreateClaimInput, ResolveClaimInput } from './claims.schema';
import { sendPushToUser } from '../../lib/pushNotifications';
import { createNotification } from '../../lib/notify';
import { getT, languageOf } from '../../i18n';

export async function createPublicClaim(linkToken: string, input: CreateClaimInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken },
    include: { contract: true },
  });

  if (!tenant) {
    throw new AppError('errors:claim.invalidLink', 404, 'NOT_FOUND');
  }

  if (tenant.contract.endDate < new Date()) {
    throw new AppError('errors:claim.linkExpired', 410, 'LINK_EXPIRED');
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
    throw new AppError('errors:claim.notFound', 404, 'NOT_FOUND');
  }

  if (claim.tenant.contract.property.userId !== userId) {
    throw new AppError('errors:claim.accessDenied', 403, 'FORBIDDEN');
  }

  if (claim.status !== 'OPEN') {
    throw new AppError('errors:claim.onlyOpenCanProgress', 400, 'BAD_REQUEST');
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
    const t = getT(languageOf(await prisma.user.findUnique({ where: { id: claim.tenant.userId }, select: { language: true } })));
    const msg = t('notify:claimUpdate.inProgressMessage');
    await createNotification({
      userId: claim.tenant.userId,
      type: 'CLAIM',
      message: msg,
      referenceId: claim.id,
    });
    sendPushToUser(claim.tenant.userId, t('notify:claimUpdate.inProgressTitle'), msg, {
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
    throw new AppError('errors:claim.notFound', 404, 'NOT_FOUND');
  }

  if (claim.tenant.contract.property.userId !== userId) {
    throw new AppError('errors:claim.accessDenied', 403, 'FORBIDDEN');
  }

  if (claim.status === 'RESOLVED') {
    throw new AppError('errors:claim.alreadyResolved', 400, 'BAD_REQUEST');
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
    const t = getT(languageOf(await prisma.user.findUnique({ where: { id: claim.tenant.userId }, select: { language: true } })));
    const msg = t('notify:claimUpdate.resolvedMessage');
    await createNotification({
      userId: claim.tenant.userId,
      type: 'CLAIM',
      message: msg,
      referenceId: claim.id,
    });
    sendPushToUser(claim.tenant.userId, t('notify:claimUpdate.resolvedTitle'), msg, {
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
