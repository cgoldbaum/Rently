import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { formatDateShort } from '../../lib/helpers';
import { getT, languageOf, DEFAULT_LANGUAGE, type Language } from '../../i18n';

function validateScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    throw new AppError('errors:inspection.invalidDate', 400, 'VALIDATION_ERROR');
  }
  return date;
}

export async function listInspections(userId: string) {
  return prisma.inspection.findMany({
    where: { property: { userId } },
    include: { property: { select: { id: true, name: true, address: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function createInspection(userId: string, input: {
  propertyId: string;
  scheduledAt: string;
  notes?: string;
  type?: string;
}) {
  const property = await prisma.property.findFirst({
    where: { id: input.propertyId, userId },
    include: { contract: { include: { tenants: true } } },
  });
  if (!property) {
    throw new AppError('errors:inspection.propertyNotFound', 404, 'NOT_FOUND');
  }

  const scheduledAt = validateScheduledAt(input.scheduledAt);

  const inspection = await prisma.inspection.create({
    data: {
      propertyId: input.propertyId,
      scheduledAt,
      notes: input.notes,
      type: input.type ?? 'VISIT',
    },
    include: { property: { select: { id: true, name: true, address: true } } },
  });

  // Notificar a los inquilinos por email si hay contrato activo
  const tenants = property.contract?.tenants ?? [];
  for (const tenant of tenants) {
    if (!tenant.email) continue;
    const lng: Language = tenant.userId
      ? languageOf(await prisma.user.findUnique({ where: { id: tenant.userId }, select: { language: true } }))
      : DEFAULT_LANGUAGE;
    const t = getT(lng);
    const propertyLabel = property.name ?? property.address;
    const dateStr = formatDateShort(scheduledAt);
    const timeStr = scheduledAt.toLocaleTimeString(lng === 'es' ? 'es-AR' : 'en-US', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = input.type === 'INSPECTION' ? t('notify:inspection.typeInspection') : t('notify:inspection.typeVisit');
    await sendEmail(
      tenant.email,
      t('notify:inspection.subject', { type: typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1) }),
      `<p>${t('notify:inspection.greeting', { name: tenant.name })}</p>
       <p>${t('notify:inspection.body', { type: typeLabel, property: propertyLabel })}</p>
       <p>${t('notify:inspection.dateLine', { date: dateStr, time: timeStr })}</p>
       ${input.notes ? `<p>${t('notify:inspection.notesLine', { notes: input.notes })}</p>` : ''}
       <p>${t('notify:inspection.questions')}</p>
       <p>— Rently</p>`
    );

    // Notificación in-app si el inquilino tiene cuenta
    if (tenant.userId) {
      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: 'CLAIM',
          message: t('notify:inspection.inAppMessage', { date: dateStr, property: propertyLabel }),
          referenceId: inspection.id,
        },
      });
    }
  }

  return inspection;
}

export async function updateInspection(id: string, userId: string, input: {
  scheduledAt?: string;
  notes?: string;
  type?: string;
}) {
  const existing = await prisma.inspection.findFirst({
    where: { id, property: { userId } },
  });
  if (!existing) {
    throw new AppError('errors:inspection.notFound', 404, 'NOT_FOUND');
  }

  const scheduledAt = input.scheduledAt ? validateScheduledAt(input.scheduledAt) : undefined;

  return prisma.inspection.update({
    where: { id },
    data: {
      scheduledAt,
      notes: input.notes,
      type: input.type,
    },
    include: { property: { select: { id: true, name: true, address: true } } },
  });
}

export async function deleteInspection(id: string, userId: string) {
  const existing = await prisma.inspection.findFirst({
    where: { id, property: { userId } },
  });
  if (!existing) {
    throw new AppError('errors:inspection.notFound', 404, 'NOT_FOUND');
  }
  await prisma.inspection.delete({ where: { id } });
}

export async function splitPaymentIntoInstallments(
  paymentId: string,
  userId: string,
  installmentCount: number,
  dueDates: string[]
) {
  if (installmentCount < 2 || installmentCount > 6) {
    throw new AppError('errors:inspection.invalidInstallments', 400, 'VALIDATION_ERROR');
  }
  if (dueDates.length !== installmentCount) {
    throw new AppError('errors:inspection.missingInstallmentDates', 400, 'VALIDATION_ERROR');
  }

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      contract: {
        include: { property: true },
      },
    },
  });

  if (!payment) {
    throw new AppError('errors:payment.notFound', 404, 'NOT_FOUND');
  }
  if (payment.contract.property.userId !== userId) {
    throw new AppError('errors:inspection.accessDenied', 403, 'FORBIDDEN');
  }
  if (payment.status === 'PAID') {
    throw new AppError('errors:payment.cannotSplitConfirmed', 400, 'VALIDATION_ERROR');
  }
  if (payment.installmentCount > 1) {
    throw new AppError('errors:payment.alreadySplit', 400, 'VALIDATION_ERROR');
  }

  // Validar coherencia de fechas
  const parsedDates = dueDates.map((d, i) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      throw new AppError('errors:inspection.invalidInstallmentDate', 400, 'VALIDATION_ERROR', undefined, { index: i + 1 });
    }
    if (date < new Date(payment.contract.startDate ?? 0)) {
      throw new AppError('errors:inspection.installmentDateBeforeContract', 400, 'VALIDATION_ERROR', undefined, { index: i + 1 });
    }
    return date;
  });

  // Verificar que las fechas están en orden ascendente
  for (let i = 1; i < parsedDates.length; i++) {
    if (parsedDates[i] <= parsedDates[i - 1]) {
      throw new AppError('errors:inspection.installmentNonAscending', 400, 'VALIDATION_ERROR');
    }
  }

  const installmentAmount = Math.round((payment.amount / installmentCount) * 100) / 100;
  const lastAmount = Math.round((payment.amount - installmentAmount * (installmentCount - 1)) * 100) / 100;
  const groupId = `installment-${paymentId}`;

  const newPayments = await prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });

    const created = [];
    for (let i = 0; i < installmentCount; i++) {
      const amount = i === installmentCount - 1 ? lastAmount : installmentAmount;
      const p = await tx.payment.create({
        data: {
          contractId: payment.contractId,
          amount,
          currency: payment.currency,
          period: payment.period,
          dueDate: parsedDates[i],
          status: 'PENDING',
          installmentGroupId: groupId,
          installmentNumber: i + 1,
          installmentCount,
        },
      });
      created.push(p);
    }
    return created;
  });

  return newPayments;
}
