import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';

type ContractForSchedule = {
  id: string;
  startDate: Date;
  endDate: Date;
  currentAmount: number;
  currency: 'ARS' | 'USD';
  paymentDay: number;
  tenant?: { email: string; name: string } | null;
  property?: { name: string | null; address: string; user?: { email: string; name: string } } | null;
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

function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
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
    const existing = await prisma.payment.findFirst({
      where: {
        contractId: contract.id,
        dueDate: {
          gte: monthStart(dueDate),
          lt: nextMonth(dueDate),
        },
      },
    });

    if (!existing) {
      await prisma.payment.create({
        data: {
          contractId: contract.id,
          amount: contract.currentAmount,
          currency: contract.currency,
          period,
          dueDate,
          status: dueDate.getTime() < now.getTime() ? 'LATE' : 'PENDING',
        },
      });
    } else if (existing.status === 'PENDING' && existing.dueDate.getTime() < now.getTime()) {
      await prisma.payment.update({
        where: { id: existing.id },
        data: { status: 'LATE' },
      });
      // Notificar al inquilino y propietario por email que el pago pasó a mora
      if (contract.tenant?.email) {
        const fmtAmount = `${contract.currency === 'ARS' ? '$' : 'USD'} ${Math.round(contract.currentAmount).toLocaleString('es-AR')}`;
        const propertyLabel = contract.property?.name ?? contract.property?.address ?? 'tu propiedad';
        await sendEmail(
          contract.tenant.email,
          'Rently – Pago vencido',
          `<p>Hola ${contract.tenant.name},</p>
           <p>Tu pago de <strong>${fmtAmount}</strong> por el período <strong>${existing.period}</strong> en <strong>${propertyLabel}</strong> está <strong>vencido</strong>.</p>
           <p>Por favor regularizá tu situación cuanto antes.</p>
           <p>— Rently</p>`
        ).catch(() => {});
      }
      if (contract.property?.user?.email) {
        const fmtAmount = `${contract.currency === 'ARS' ? '$' : 'USD'} ${Math.round(contract.currentAmount).toLocaleString('es-AR')}`;
        const propertyLabel = contract.property?.name ?? contract.property?.address ?? 'tu propiedad';
        await sendEmail(
          contract.property.user.email,
          'Rently – Cobro en mora',
          `<p>Hola ${contract.property.user.name},</p>
           <p>El cobro de <strong>${fmtAmount}</strong> del período <strong>${existing.period}</strong> en <strong>${propertyLabel}</strong> está <strong>en mora</strong>. El inquilino no realizó el pago a tiempo.</p>
           <p>— Rently</p>`
        ).catch(() => {});
      }
    }

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
      tenant: { select: { email: true, name: true } },
      property: { select: { name: true, address: true, user: { select: { email: true, name: true } } } },
    },
  });

  for (const contract of contracts) {
    await ensurePaymentsForContract(contract);
  }
}

export async function ensurePaymentsForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          tenant: { select: { email: true, name: true } },
          property: { select: { name: true, address: true, user: { select: { email: true, name: true } } } },
        },
      },
    },
  });

  if (tenant?.contract) {
    await ensurePaymentsForContract(tenant.contract);
  }
}
