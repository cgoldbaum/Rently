import prisma from '../../lib/prisma';

type MercadoPagoPayment = {
  id: string | number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  payment_method_id?: string;
  payment_type_id?: string;
  date_approved?: string;
  payer?: { email?: string };
};

async function upsertMercadoPagoReceipt(paymentId: string, mpPayment: MercadoPagoPayment) {
  await prisma.mercadoPagoReceipt.upsert({
    where: { paymentId },
    create: {
      paymentId,
      mpPaymentId: String(mpPayment.id),
      mpStatus: mpPayment.status,
      mpStatusDetail: mpPayment.status_detail,
      paymentMethodId: mpPayment.payment_method_id,
      paymentTypeId: mpPayment.payment_type_id,
      externalReference: mpPayment.external_reference,
      payerEmail: mpPayment.payer?.email,
      transactionAmount: mpPayment.transaction_amount,
      currencyId: mpPayment.currency_id,
      dateApproved: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
      rawPayload: mpPayment as unknown as object,
    },
    update: {
      mpPaymentId: String(mpPayment.id),
      mpStatus: mpPayment.status,
      mpStatusDetail: mpPayment.status_detail,
      paymentMethodId: mpPayment.payment_method_id,
      paymentTypeId: mpPayment.payment_type_id,
      externalReference: mpPayment.external_reference,
      payerEmail: mpPayment.payer?.email,
      transactionAmount: mpPayment.transaction_amount,
      currencyId: mpPayment.currency_id,
      dateApproved: mpPayment.date_approved ? new Date(mpPayment.date_approved) : null,
      rawPayload: mpPayment as unknown as object,
    },
  });
}

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
      const mpPayment = await res.json() as MercadoPagoPayment;

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
          await upsertMercadoPagoReceipt(existingPayment.id, mpPayment);

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

          const createdPayment = await prisma.payment.create({
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
          await upsertMercadoPagoReceipt(createdPayment.id, mpPayment);

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
