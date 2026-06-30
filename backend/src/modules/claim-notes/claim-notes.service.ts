import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

async function assertClaimOwnership(claimId: string, userId: string) {
  const claim = await prisma.claim.findUnique({
    where: { id: claimId },
    include: { tenant: { include: { contract: { include: { property: true } } } } },
  });
  if (!claim) throw new AppError('Claim not found', 404, 'NOT_FOUND');
  if (claim.tenant.contract.property.userId !== userId) {
    throw new AppError('Access denied', 403, 'FORBIDDEN');
  }
  return claim;
}

export async function listNotes(claimId: string, userId: string) {
  await assertClaimOwnership(claimId, userId);
  return prisma.claimNote.findMany({
    where: { claimId },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
}

export async function addNote(claimId: string, userId: string, content: string) {
  await assertClaimOwnership(claimId, userId);
  return prisma.claimNote.create({
    data: { claimId, authorId: userId, content },
    include: { author: { select: { id: true, name: true } } },
  });
}
