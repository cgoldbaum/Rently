import prisma from '../../lib/prisma';

export type RecommendationType = 'raise_rent' | 'lower_risk' | 'renew_soon' | 'vacant' | 'maintain';

interface PropertyPerformance {
  propertyId: string;
  propertyName: string;
  address: string;
  status: string;
  currency: string;
  currentRent: number;
  initialRent: number;
  rentGrowthPct: number;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractMonths: number;
  tenantName: string | null;
  totalIncome12m: number;
  totalIncomeAllTime: number;
  paidOnTimeCount: number;
  paidLateCount: number;
  lateUnpaidCount: number;
  onTimeRate: number;
  claimsLast12m: number;
  openClaims: number;
  score: number;
  recommendation: RecommendationType;
  recommendationDetail: string;
}

export interface PerformanceReport {
  summary: {
    totalIncome12m: number;
    avgOnTimeRate: number;
    propertiesWithAlerts: number;
    topPropertyName: string | null;
  };
  properties: PropertyPerformance[];
}

function monthsBetween(a: Date, b: Date): number {
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
}

function buildRecommendation(
  status: string,
  onTimeRate: number,
  lateUnpaidCount: number,
  claimsLast12m: number,
  contractMonths: number,
  daysToExpiry: number | null,
): { rec: RecommendationType; detail: string } {
  if (status === 'VACANT' || !status) {
    return { rec: 'vacant', detail: 'Propiedad sin inquilino. Publicar para alquilar.' };
  }
  if (lateUnpaidCount >= 2 || onTimeRate < 0.7) {
    return { rec: 'lower_risk', detail: 'Pagos irregulares. Evaluar condiciones del contrato o iniciar gestión de cobro.' };
  }
  if (daysToExpiry !== null && daysToExpiry >= 0 && daysToExpiry <= 60) {
    return { rec: 'renew_soon', detail: `Contrato vence en ${daysToExpiry} días. Negociar renovación cuanto antes.` };
  }
  if (onTimeRate >= 0.9 && contractMonths >= 6 && claimsLast12m <= 1 && lateUnpaidCount === 0) {
    return { rec: 'raise_rent', detail: 'Buen inquilino y contrato estable. Considerar aumentar el alquiler en la próxima renovación.' };
  }
  return { rec: 'maintain', detail: 'Condiciones estables. Mantener contrato actual.' };
}

export async function getPerformanceReport(userId: string): Promise<PerformanceReport> {
  const now = new Date();
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const properties = await prisma.property.findMany({
    where: { userId },
    include: {
      contract: {
        include: {
          tenant: {
            include: {
              claims: {
                select: { id: true, status: true, createdAt: true },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              currency: true,
              status: true,
              dueDate: true,
              paidDate: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const results: PropertyPerformance[] = properties.map(prop => {
    const contract = prop.contract;
    const propertyName = prop.name ?? prop.address;

    if (!contract) {
      return {
        propertyId: prop.id,
        propertyName,
        address: prop.address,
        status: 'VACANT',
        currency: 'USD',
        currentRent: 0,
        initialRent: 0,
        rentGrowthPct: 0,
        contractStartDate: null,
        contractEndDate: null,
        contractMonths: 0,
        tenantName: null,
        totalIncome12m: 0,
        totalIncomeAllTime: 0,
        paidOnTimeCount: 0,
        paidLateCount: 0,
        lateUnpaidCount: 0,
        onTimeRate: 0,
        claimsLast12m: 0,
        openClaims: 0,
        score: 0,
        recommendation: 'vacant',
        recommendationDetail: 'Propiedad sin inquilino. Publicar para alquilar.',
      };
    }

    const isExpired = contract.endDate < now;
    const effectiveStatus = isExpired ? 'VACANT' : prop.status;
    const daysToExpiry = isExpired ? null : Math.ceil((contract.endDate.getTime() - now.getTime()) / 86400000);
    const contractMonths = Math.max(0, monthsBetween(contract.startDate, now));

    const allPayments = contract.payments;

    const paidPayments = allPayments.filter(p => p.status === 'PAID');
    const lateUnpaidCount = allPayments.filter(p => p.status === 'LATE').length;

    const paidOnTimeCount = paidPayments.filter(p => p.paidDate && p.paidDate <= p.dueDate).length;
    const paidLateCount = paidPayments.filter(p => !p.paidDate || p.paidDate > p.dueDate).length;
    const totalPaid = paidPayments.length;
    const onTimeRate = totalPaid > 0 ? paidOnTimeCount / totalPaid : 1;

    const paid12m = paidPayments.filter(p => p.paidDate && p.paidDate >= twelveMonthsAgo);
    const totalIncome12m = paid12m.reduce((s, p) => s + p.amount, 0);
    const totalIncomeAllTime = paidPayments.reduce((s, p) => s + p.amount, 0);

    const allClaims = contract.tenant?.claims ?? [];
    const claimsLast12m = allClaims.filter(c => c.createdAt >= twelveMonthsAgo).length;
    const openClaims = allClaims.filter(c => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length;

    const rentGrowthPct = contract.initialAmount > 0
      ? ((contract.currentAmount - contract.initialAmount) / contract.initialAmount) * 100
      : 0;

    const { rec, detail } = buildRecommendation(
      effectiveStatus,
      onTimeRate,
      lateUnpaidCount,
      claimsLast12m,
      contractMonths,
      daysToExpiry,
    );

    // Score: income drives ranking, penalise late/claims
    const score = totalIncome12m * (0.5 + onTimeRate * 0.5) - lateUnpaidCount * 200 - claimsLast12m * 50;

    return {
      propertyId: prop.id,
      propertyName,
      address: prop.address,
      status: effectiveStatus,
      currency: contract.currency,
      currentRent: contract.currentAmount,
      initialRent: contract.initialAmount,
      rentGrowthPct,
      contractStartDate: contract.startDate.toISOString(),
      contractEndDate: contract.endDate.toISOString(),
      contractMonths,
      tenantName: contract.tenant?.name ?? null,
      totalIncome12m,
      totalIncomeAllTime,
      paidOnTimeCount,
      paidLateCount,
      lateUnpaidCount,
      onTimeRate,
      claimsLast12m,
      openClaims,
      score,
      recommendation: rec,
      recommendationDetail: detail,
    };
  });

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const occupied = results.filter(r => r.status !== 'VACANT');
  const totalIncome12m = results.reduce((s, r) => s + r.totalIncome12m, 0);
  const avgOnTimeRate = occupied.length > 0
    ? occupied.reduce((s, r) => s + r.onTimeRate, 0) / occupied.length
    : 0;
  const propertiesWithAlerts = results.filter(r => r.recommendation === 'lower_risk').length;
  const topProperty = results.find(r => r.status !== 'VACANT') ?? null;

  return {
    summary: {
      totalIncome12m,
      avgOnTimeRate,
      propertiesWithAlerts,
      topPropertyName: topProperty?.propertyName ?? null,
    },
    properties: results,
  };
}
