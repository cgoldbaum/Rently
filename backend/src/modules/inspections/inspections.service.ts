import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';

function validateScheduledAt(scheduledAt: string) {
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    throw Object.assign(new Error('Fecha inválida'), { code: 'VALIDATION_ERROR', status: 400 });
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
    throw Object.assign(new Error('Propiedad no encontrada'), { code: 'NOT_FOUND', status: 404 });
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
    const dateStr = scheduledAt.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
    throw Object.assign(new Error('Inspección no encontrada'), { code: 'NOT_FOUND', status: 404 });
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
    throw Object.assign(new Error('Inspección no encontrada'), { code: 'NOT_FOUND', status: 404 });
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
    throw Object.assign(new Error('Las cuotas deben ser entre 2 y 6'), { code: 'VALIDATION_ERROR', status: 400 });
  }
  if (dueDates.length !== installmentCount) {
    throw Object.assign(new Error('Debe proporcionar una fecha por cuota'), { code: 'VALIDATION_ERROR', status: 400 });
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
    throw Object.assign(new Error('Pago no encontrado'), { code: 'NOT_FOUND', status: 404 });
  }
  if (payment.contract.property.userId !== userId) {
    throw Object.assign(new Error('Acceso denegado'), { code: 'FORBIDDEN', status: 403 });
  }
  if (payment.status === 'PAID') {
    throw Object.assign(new Error('No se puede dividir un pago ya confirmado'), { code: 'VALIDATION_ERROR', status: 400 });
  }
  if (payment.installmentCount > 1) {
    throw Object.assign(new Error('Este pago ya está dividido en cuotas'), { code: 'VALIDATION_ERROR', status: 400 });
  }

  // Validar coherencia de fechas
  const parsedDates = dueDates.map((d, i) => {
    const date = new Date(d);
    if (isNaN(date.getTime())) {
      throw Object.assign(new Error(`Fecha ${i + 1} inválida`), { code: 'VALIDATION_ERROR', status: 400 });
    }
    if (date < new Date(payment.contract.startDate ?? 0)) {
      throw Object.assign(new Error(`La fecha ${i + 1} es anterior al inicio del contrato`), { code: 'VALIDATION_ERROR', status: 400 });
    }
    return date;
  });

  // Verificar que las fechas están en orden ascendente
  for (let i = 1; i < parsedDates.length; i++) {
    if (parsedDates[i] <= parsedDates[i - 1]) {
      throw Object.assign(new Error('Las fechas de cuotas deben estar en orden ascendente'), { code: 'VALIDATION_ERROR', status: 400 });
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
