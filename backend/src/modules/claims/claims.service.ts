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

  const updateData: Record<string, unknown> = {};
  if (input.priority) updateData.priority = input.priority;

  if (input.status) {
    updateData.status = input.status;
    await prisma.$transaction([
      prisma.claim.update({ where: { id: claimId }, data: updateData }),
      prisma.claimHistory.create({
        data: {
          claimId,
          oldStatus: claim.status,
          newStatus: input.status,
          comment: input.comment,
        },
      }),
    ]);

    // Notify tenant when claim status changes
    if (claim.tenant.userId) {
      const statusLabels: Record<string, string> = {
        OPEN: 'abierto',
        IN_PROGRESS: 'en curso',
        RESOLVED: 'resuelto',
      };
      await prisma.notification.create({
        data: {
          userId: claim.tenant.userId,
          type: 'CLAIM',
          message: `Tu reclamo fue actualizado: ${statusLabels[input.status] ?? input.status}`,
          referenceId: claim.id,
        },
      });
    }
  } else if (Object.keys(updateData).length > 0) {
    await prisma.claim.update({ where: { id: claimId }, data: updateData });
  }

  return prisma.claim.findUnique({
    where: { id: claimId },
    include: {
      tenant: { include: { contract: { include: { property: true } } } },
      history: { orderBy: { changedAt: 'desc' } },
    },
  });
}
