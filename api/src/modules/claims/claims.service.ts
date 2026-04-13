import prisma from '../../lib/prisma';
import { CreateClaimInput, UpdateClaimInput } from './claims.schema';

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

  const claim = await prisma.claim.create({
    data: { ...input, tenantId: tenant.id },
  });

  return claim;
}

export async function listClaimsByOwner(userId: string) {
  const claims = await prisma.claim.findMany({
    where: {
      tenant: {
        contract: {
          property: { userId },
        },
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

  return claims;
}

export async function listClaimsByProperty(propertyId: string) {
  const claims = await prisma.claim.findMany({
    where: {
      tenant: {
        contract: { propertyId },
      },
    },
    include: {
      history: { orderBy: { changedAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return claims;
}

export async function updateClaim(claimId: string, userId: string, input: UpdateClaimInput) {
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

  await prisma.$transaction([
    prisma.claim.update({
      where: { id: claimId },
      data: {
        status: input.status,
        ...(input.priority ? { priority: input.priority } : {}),
      },
    }),
    prisma.claimHistory.create({
      data: {
        claimId,
        oldStatus: claim.status,
        newStatus: input.status,
        comment: input.comment,
      },
    }),
  ]);

  return prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: { include: { contract: { include: { property: true } } } },
      history: { orderBy: { changedAt: 'desc' } },
    },
  });
}
