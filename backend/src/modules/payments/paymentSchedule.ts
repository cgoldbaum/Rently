import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { addMonths, periodKey } from '../../lib/helpers';
import { getT, languageOf, DEFAULT_LANGUAGE } from '../../i18n';

type ContractForSchedule = {
  id: string;
  startDate: Date;
  endDate: Date;
  currentAmount: number;
  currency: 'ARS' | 'USD';
  paymentDay: number;
  tenants?: { email: string; name: string }[];
  property?: { name: string | null; address: string; user?: { email: string; name: string; language?: string | null } } | null;
};

function monthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function dueDateFor(month: Date, paymentDay: number) {
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return new Date(month.getFullYear(), month.getMonth(), Math.min(paymentDay, lastDay));
}

function nextMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

async function ensurePaymentsForContract(contract: ContractForSchedule) {
  const now = new Date();
  const firstMonth = monthStart(contract.startDate);
  const lastContractMonth = monthStart(contract.endDate);
  const windowStart = addMonths(monthStart(now), -6);
  const windowEnd = addMonths(monthStart(now), 2);
  let cursor = firstMonth.getTime() > windowStart.getTime() ? firstMonth : windowStart;
  const lastMonth = lastContractMonth.getTime() < windowEnd.getTime() ? lastContractMonth : windowEnd;
  const ownerT = getT(languageOf(contract.property?.user ?? null));

  while (cursor.getTime() <= lastMonth.getTime()) {
    const dueDate = dueDateFor(cursor, contract.paymentDay);
    const period = periodKey(dueDate);
    const existing = await prisma.payment.findFirst({
      where: {
        contractId: contract.id,
        period,
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
      // Notificar a los inquilinos y al propietario por email que el pago pasó a mora
      for (const tenant of contract.tenants ?? []) {
        if (!tenant.email) continue;
        const fmtAmount = `${contract.currency === 'ARS' ? '$' : 'USD'} ${Math.round(contract.currentAmount).toLocaleString()}`;
        const propertyLabel = contract.property?.name ?? contract.property?.address ?? 'tu propiedad';
        const tenantT = getT(DEFAULT_LANGUAGE);
        await sendEmail(
          tenant.email,
          tenantT('notify:paymentOverdue.tenantSubject'),
          `<p>Hola ${tenant.name},</p>
           <p>${tenantT('notify:paymentOverdue.tenantBody', { amount: fmtAmount, period: existing.period, property: propertyLabel })}</p>
           <p>— Rently</p>`
        ).catch(() => {});
      }
      if (contract.property?.user?.email) {
        const fmtAmount = `${contract.currency === 'ARS' ? '$' : 'USD'} ${Math.round(contract.currentAmount).toLocaleString()}`;
        const propertyLabel = contract.property?.name ?? contract.property?.address ?? 'la propiedad';
        await sendEmail(
          contract.property.user.email,
          ownerT('notify:paymentOverdue.ownerSubject'),
          `<p>Hola ${contract.property.user.name},</p>
           <p>${ownerT('notify:paymentOverdue.ownerBody', { amount: fmtAmount, period: existing.period, property: propertyLabel })}</p>
           <p>— Rently</p>`
        ).catch(() => {});
      }
    }

    cursor = addMonths(cursor, 1);
  }
}

export async function ensurePaymentsForOwner(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { property: { userId }, tenants: { some: {} } },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      currentAmount: true,
      currency: true,
      paymentDay: true,
      tenants: { select: { email: true, name: true } },
      property: { select: { name: true, address: true, user: { select: { email: true, name: true } } } },
    },
  });

  for (const contract of contracts) {
    try {
      await ensurePaymentsForContract(contract);
    } catch (err) {
      console.error(`[ensurePayments] Contract ${contract.id}:`, err);
    }
  }
}

export async function ensurePaymentsForTenant(tenantId: string) {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      contract: {
        include: {
          tenants: { select: { email: true, name: true } },
      property: { select: { name: true, address: true, user: { select: { email: true, name: true, language: true } } } },
        },
      },
    },
  });

  if (tenant?.contract) {
    await ensurePaymentsForContract(tenant.contract);
  }
}
