import prisma from '../../lib/prisma';

type ContractForSchedule = {
  id: string;
  startDate: Date;
  endDate: Date;
  currentAmount: number;
  currency: 'ARS' | 'USD';
  paymentDay: number;
};

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function dueDateFor(month: Date, paymentDay: number) {
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(paymentDay, lastDay));
}

function periodFor(date: Date) {
  return date.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
}

async function ensurePaymentsForContract(contract: ContractForSchedule) {
  const now = new Date();
  const firstMonth = monthStart(contract.startDate);
  const lastContractMonth = monthStart(contract.endDate);
  const windowStart = addMonths(monthStart(now), -6);
  const windowEnd = addMonths(monthStart(now), 2);
  let cursor = firstMonth.getTime() > windowStart.getTime() ? firstMonth : windowStart;
  const lastMonth = lastContractMonth.getTime() < windowEnd.getTime() ? lastContractMonth : windowEnd;

  while (cursor.getTime() <= lastMonth.getTime()) {
    const dueDate = dueDateFor(cursor, contract.paymentDay);
    const period = periodFor(dueDate);
    const isLate = dueDate.getTime() < now.getTime();

    await prisma.payment.upsert({
      where: {
        contractId_period: { contractId: contract.id, period },
      },
      create: {
        contractId: contract.id,
        amount: contract.currentAmount,
        currency: contract.currency,
        period,
        dueDate,
        status: isLate ? 'LATE' : 'PENDING',
      },
      update: {
        amount: contract.currentAmount,
        currency: contract.currency,
        dueDate,
        status: isLate ? 'LATE' : 'PENDING',
      },
    });

    cursor = addMonths(cursor, 1);
  }
}

export async function ensurePaymentsForOwner(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { property: { userId }, tenant: { isNot: null } },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      currentAmount: true,
      currency: true,
      paymentDay: true,
    },
  });

  for (const contract of contracts) {
    await ensurePaymentsForContract(contract);
  }
}

export async function ensurePaymentsForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { contract: true },
  });

  if (tenant?.contract) {
    await ensurePaymentsForContract(tenant.contract);
  }
}
