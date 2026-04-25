import prisma from '../../lib/prisma';

export async function handleMercadoPagoWebhook(payload: Record<string, unknown>) {
  await prisma.mpWebhookEvent.create({ data: { eventType: String(payload.type ?? ''), payload: payload as any } });

  if (payload.type === 'payment' && payload.data) {
    const paymentId = (payload.data as any).id;
    if (!paymentId) return;

    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) return;

    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const mpPayment = await res.json() as { status: string; external_reference?: string; transaction_amount?: number };

      if (mpPayment.status === 'approved' && mpPayment.external_reference) {
        const existingPayment = await prisma.payment.findUnique({
          where: { id: mpPayment.external_reference },
          include: { contract: { include: { property: true } } },
        });

        if (existingPayment) {
          await prisma.payment.update({
            where: { id: existingPayment.id },
            data: { status: 'PAID', paidDate: new Date(), method: 'Mercado Pago' },
          });

          await prisma.notification.create({
            data: {
              userId: existingPayment.contract.property.userId,
              type: 'PAYMENT',
              message: `Pago recibido por Mercado Pago: ${existingPayment.contract.property.name ?? existingPayment.contract.property.address} — $${existingPayment.amount.toLocaleString('es-AR')}`,
              referenceId: existingPayment.id,
            },
          });

          return;
        }

        const propertyId = mpPayment.external_reference;

        const link = await prisma.paymentLink.findFirst({
          where: { propertyId, status: 'ACTIVE' },
          include: { property: { include: { contract: { include: { tenant: true } } } } },
          orderBy: { createdAt: 'desc' },
        });

        if (link) {
          await prisma.paymentLink.update({ where: { id: link.id }, data: { status: 'PAID' } });

          await prisma.payment.create({
            data: {
              contractId: link.property.contract!.id,
              amount: link.amount,
              period: link.period,
              dueDate: new Date(),
              paidDate: new Date(),
              status: 'PAID',
              method: 'Mercado Pago',
            },
          });

          await prisma.notification.create({
            data: {
              userId: link.property.userId,
              type: 'PAYMENT',
              message: `Pago recibido: ${link.property.name ?? link.property.address} — $${link.amount.toLocaleString('es-AR')}`,
              referenceId: link.id,
            },
          });
        }
      }
    } catch {
      // log silently
    }
  }
}
