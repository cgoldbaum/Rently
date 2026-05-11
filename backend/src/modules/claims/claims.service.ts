import prisma from '../../lib/prisma';
import { CreateClaimInput, ResolveClaimInput } from './claims.schema';

export async function createPublicClaim(linkToken: string, input: CreateClaimInput) {
  const tenant = await prisma.tenant.findUnique({
    where: { linkToken },
    include: { contract: true },
  });

  if (!tenant) {
    throw Object.assign(new Error('Invalid link token'), { code: 'NOT_FOUND', status: 404 });
  }

  if (tenant.contract.endDate < new Date()) {
    throw Object.assign(new Error('Contract has expired'), { code: 'LINK_EXPIRED', status: 410 });
  }

  return prisma.claim.create({
    data: { ...input, tenantId: tenant.id },
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
    throw Object.assign(new Error('Claim not found'), { code: 'NOT_FOUND', status: 404 });
  }

  if (claim.tenant.contract.property.userId !== userId) {
    throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
  }

  if (claim.status === 'RESOLVED') {
    throw Object.assign(new Error('Claim already resolved'), { code: 'BAD_REQUEST', status: 400 });
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
    await prisma.notification.create({
      data: {
        userId: claim.tenant.userId,
        type: 'CLAIM',
        message: `Tu reclamo fue marcado como resuelto por el propietario`,
        referenceId: claim.id,
      },
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
