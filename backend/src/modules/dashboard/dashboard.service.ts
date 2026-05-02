import prisma from '../../lib/prisma';

const CATEGORY_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

function currencySymbol(currency: string) {
  return currency === 'USD' ? 'USD ' : '$';
}

function getUsdArsRate() {
  const value = Number(process.env.USD_ARS_RATE ?? '1200');
  return Number.isFinite(value) && value > 0 ? value : 1200;
}

export async function getNotifications(userId: string) {
  const now = new Date();
  const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: {
        include: {
          payments: { where: { status: { in: ['LATE', 'PENDING'] } } },
          tenant: {
            include: {
              claims: { where: { status: { not: 'RESOLVED' } }, orderBy: { createdAt: 'desc' } },
            },
          },
        },
      },
    },
  });

  const notifications: {
    type: string; subtype: string; message: string; detail: string;
    propertyAddress: string; date: Date; id: string;
  }[] = [];

  for (const property of properties) {
    if (!property.contract) continue;

    // Reclamos abiertos o en curso
    for (const claim of property.contract.tenant?.claims ?? []) {
      notifications.push({
        type: 'claim',
        subtype: claim.status,
        message: claim.status === 'OPEN' ? 'Nuevo reclamo recibido' : 'Reclamo en curso',
        detail: CATEGORY_LABELS[claim.category] ?? claim.category,
        propertyAddress: property.name ?? property.address,
        date: claim.createdAt,
        id: claim.id,
      });
    }

    // Pagos vencidos o pendientes sin pagar
    for (const payment of property.contract.payments) {
      if (payment.status === 'LATE') {
        notifications.push({
          type: 'payment',
          subtype: 'LATE',
          message: 'Pago vencido sin cobrar',
          detail: `${currencySymbol(property.contract.currency)}${payment.amount.toLocaleString('es-AR')} · ${payment.period ?? ''}`,
          propertyAddress: property.name ?? property.address,
          date: payment.dueDate,
          id: payment.id,
        });
      } else if (payment.status === 'PENDING' && payment.dueDate < now) {
        notifications.push({
          type: 'payment',
          subtype: 'OVERDUE',
          message: 'Pago pendiente vencido',
          detail: `${currencySymbol(property.contract.currency)}${payment.amount.toLocaleString('es-AR')} · ${payment.period ?? ''}`,
          propertyAddress: property.name ?? property.address,
          date: payment.dueDate,
          id: payment.id,
        });
      }
    }

    // Ajuste próximo (≤15 días)
    const nextAdjust = property.contract.nextAdjustDate;
    if (nextAdjust >= now && nextAdjust <= in15Days) {
      const daysLeft = Math.ceil((nextAdjust.getTime() - now.getTime()) / 86400000);
      notifications.push({
        type: 'adjustment',
        subtype: 'UPCOMING',
        message: `Ajuste por ${property.contract.indexType} en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        detail: `Monto actual: ${currencySymbol(property.contract.currency)}${property.contract.currentAmount.toLocaleString('es-AR')}`,
        propertyAddress: property.name ?? property.address,
        date: nextAdjust,
        id: property.contract.id,
      });
    }

    // Contrato por vencer (≤60 días)
    const endDate = property.contract.endDate;
    if (endDate >= now && endDate <= in60Days) {
      const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / 86400000);
      notifications.push({
        type: 'contract',
        subtype: 'EXPIRING',
        message: `Contrato vence en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
        detail: `Vencimiento: ${endDate.toLocaleDateString('es-AR')}`,
        propertyAddress: property.name ?? property.address,
        date: endDate,
        id: property.contract.id + '_exp',
      });
    }
  }

  return notifications
    .sort((a, b) => {
      // Prioridad: LATE > OPEN claim > EXPIRING > ADJUSTMENT > IN_PROGRESS
      const priority: Record<string, number> = { LATE: 0, OVERDUE: 1, OPEN: 2, EXPIRING: 3, UPCOMING: 4, IN_PROGRESS: 5 };
      const pa = priority[a.subtype] ?? 9;
      const pb = priority[b.subtype] ?? 9;
      if (pa !== pb) return pa - pb;
      return b.date.getTime() - a.date.getTime();
    })
    .slice(0, 30);
}

export async function getDashboard(userId: string) {
  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: true,
    },
  });

  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  let occupiedProperties = 0;
  let vacantProperties = 0;
  let expiringProperties = 0;
  let totalArs = 0;
  let totalUsd = 0;

  for (const p of properties) {
    if (!p.contract || p.contract.endDate < now) {
      vacantProperties++;
    } else if (p.contract.endDate <= sixtyDaysFromNow) {
      expiringProperties++;
      occupiedProperties++;
    } else {
      occupiedProperties++;
    }

    if (p.contract) {
      if (p.contract.currency === 'USD') totalUsd += p.contract.currentAmount;
      else totalArs += p.contract.currentAmount;
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

  const usdArsRate = getUsdArsRate();
  const totalArsEstimated = totalArs + totalUsd * usdArsRate;

  return {
    totalProperties: properties.length,
    occupiedProperties,
    vacantProperties,
    expiringProperties,
    openClaims,
    rentTotals: {
      ars: totalArs,
      usd: totalUsd,
      arsEstimatedFromUsd: totalArsEstimated,
      usdArsRate,
    },
  };
}
