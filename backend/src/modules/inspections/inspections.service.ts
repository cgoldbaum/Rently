import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { formatDateShort } from '../../lib/helpers';

function validateScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    throw new AppError('Fecha inválida', 400, 'VALIDATION_ERROR');
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
    include: { contract: { include: { tenant: true } } },
  });
  if (!property) {
    throw new AppError('Propiedad no encontrada', 404, 'NOT_FOUND');
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

  // Notificar al inquilino por email si hay contrato activo
  const tenant = property.contract?.tenant;
  if (tenant?.email) {
    const propertyLabel = property.name ?? property.address;
    const dateStr = formatDateShort(scheduledAt);
    const timeStr = scheduledAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
    const typeLabel = input.type === 'INSPECTION' ? 'inspección' : 'visita';
    await sendEmail(
      tenant.email,
      `Rently – ${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} programada`,
      `<p>Hola ${tenant.name},</p>
       <p>Se programó una <strong>${typeLabel}</strong> para la propiedad <strong>${propertyLabel}</strong>.</p>
       <p><strong>Fecha:</strong> ${dateStr} a las ${timeStr}</p>
       ${input.notes ? `<p><strong>Notas:</strong> ${input.notes}</p>` : ''}
       <p>Si tenés alguna pregunta, contactá a tu propietario.</p>
       <p>— Rently</p>`
    );

    // Notificación in-app si el inquilino tiene cuenta
    if (tenant.userId) {
      await prisma.notification.create({
        data: {
          userId: tenant.userId,
          type: 'CLAIM',
          message: `Visita/inspección programada para el ${dateStr} en ${propertyLabel}`,
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
    throw new AppError('Inspección no encontrada', 404, 'NOT_FOUND');
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
    throw new AppError('Inspección no encontrada', 404, 'NOT_FOUND');
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
    throw new AppError('Las cuotas deben ser entre 2 y 6', 400, 'VALIDATION_ERROR');
  }
  if (dueDates.length !== installmentCount) {
    throw new AppError('Debe proporcionar una fecha por cuota', 400, 'VALIDATION_ERROR');
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
    throw new AppError('Pago no encontrado', 404, 'NOT_FOUND');
  }
  if (payment.contract.property.userId !== userId) {
    throw new AppError('Acceso denegado', 403, 'FORBIDDEN');
  }
  if (payment.status === 'PAID') {
    throw new AppError('No se puede dividir un pago ya confirmado', 400, 'VALIDATION_ERROR');
  }
  if (payment.installmentCount > 1) {
    throw new AppError('Este pago ya está dividido en cuotas', 400, 'VALIDATION_ERROR');
  }

  // Validar coherencia de fechas
  const parsedDates = dueDates.map((d, i) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      throw new AppError(`Fecha ${i + 1} inválida`, 400, 'VALIDATION_ERROR');
    }
    if (date < new Date(payment.contract.startDate ?? 0)) {
      throw new AppError(`La fecha ${i + 1} es anterior al inicio del contrato`, 400, 'VALIDATION_ERROR');
    }
    return date;
  });

  // Verificar que las fechas están en orden ascendente
  for (let i = 1; i < parsedDates.length; i++) {
    if (parsedDates[i] <= parsedDates[i - 1]) {
      throw new AppError('Las fechas de cuotas deben estar en orden ascendente', 400, 'VALIDATION_ERROR');
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
