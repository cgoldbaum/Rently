import prisma from '../../lib/prisma';

export async function getDashboard(userId: string) {
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: true,
    },
  });

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  let occupiedProperties = 0;
  let vacantProperties = 0;
  let expiringProperties = 0;

  for (const p of properties) {
    if (!p.contract || p.contract.endDate < now) {
      vacantProperties++;
    } else if (p.contract.endDate <= thirtyDaysFromNow) {
      expiringProperties++;
      occupiedProperties++;
    } else {
      occupiedProperties++;
    }
  }

  const openClaims = await prisma.claim.count({
    where: {
      status: 'OPEN',
      tenant: {
        contract: {
          property: { userId },
        },
      },
    },
  });

  return {
    totalProperties: properties.length,
    occupiedProperties,
    vacantProperties,
    expiringProperties,
    openClaims,
  };
}
