import prisma from '../../lib/prisma';
import { createNotification } from '../../lib/notify';
import {
  handleMercadoPagoSubscriptionPayment,
  markPastDue,
} from '../subscriptions/subscriptions.service';

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

function currencySymbol(currency: string) {
  return currency === 'USD' ? 'USD ' : '$';
}

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

async function handleSubscriptionPreapproval(accessToken: string, preapprovalId: string) {
  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return;
  const preapproval = await res.json() as {
    id: string; status: string; external_reference?: string;
  };

  const subscription = await prisma.ownerSubscription.findFirst({
    where: { providerSubscriptionId: preapproval.id },
  });
  if (!subscription) return;

  if (preapproval.status === 'authorized') {
    await handleMercadoPagoSubscriptionPayment({
      id: preapproval.id,
      status: 'approved',
      external_reference: `subscription:${subscription.id}`,
    });
  } else if (['cancelled', 'rejected'].includes(preapproval.status)) {
    await markPastDue(subscription.id, preapproval);
  }
}

async function handleSubscriptionAuthorizedPayment(accessToken: string, authPaymentId: string) {
  const res = await fetch(`https://api.mercadopago.com/authorized_payments/${authPaymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return;
  const authPayment = await res.json() as {
    id: string; preapproval_id: string; status: string;
    transaction_amount?: number; currency_id?: string; date_approved?: string;
  };

  const subscription = await prisma.ownerSubscription.findFirst({
    where: { providerSubscriptionId: authPayment.preapproval_id },
    include: { plan: true },
  });
  if (!subscription) return;

  await prisma.subscriptionPayment.create({
    data: {
      userId: subscription.userId,
      subscriptionId: subscription.id,
      providerPaymentId: authPayment.id,
      status: authPayment.status === 'approved' ? 'APPROVED' : 'PENDING',
      amount: authPayment.transaction_amount ?? subscription.plan.price,
      currency: (authPayment.currency_id as any) ?? subscription.plan.currency,
      rawPayload: authPayment as unknown as object,
      paidAt: authPayment.date_approved ? new Date(authPayment.date_approved) : new Date(),
    },
  });
}

export async function handleMercadoPagoWebhook(payload: Record<string, unknown>) {
  await prisma.mpWebhookEvent.create({ data: { eventType: String(payload.type ?? ''), payload: payload as any } });

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return;

  if (payload.type === 'subscription_preapproval' && payload.data) {
    try {
      await handleSubscriptionPreapproval(accessToken, String((payload.data as any).id));
    } catch {
      // log silently
    }
    return;
  }

  if (payload.type === 'subscription_authorized_payment' && payload.data) {
    try {
      await handleSubscriptionAuthorizedPayment(accessToken, String((payload.data as any).id));
    } catch {
      // log silently
    }
    return;
  }

  if (payload.type === 'payment' && payload.data) {
    const paymentId = (payload.data as any).id;
    if (!paymentId) return;

    try {
      const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const mpPayment = await res.json() as MercadoPagoPayment;

      if (await handleMercadoPagoSubscriptionPayment(mpPayment)) {
        return;
      }

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

          await createNotification({
            userId: existingPayment.contract.property.userId,
            type: 'PAYMENT',
            message: `Pago recibido por Mercado Pago: ${existingPayment.contract.property.name ?? existingPayment.contract.property.address} — ${currencySymbol(existingPayment.currency)}${existingPayment.amount.toLocaleString('es-AR')}`,
            referenceId: existingPayment.id,
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
              currency: link.currency,
              period: link.period,
              dueDate: new Date(),
              paidDate: new Date(),
              status: 'PAID',
              method: 'Mercado Pago',
            },
          });
          await upsertMercadoPagoReceipt(createdPayment.id, mpPayment);

          await createNotification({
            userId: link.property.userId,
            type: 'PAYMENT',
            message: `Pago recibido: ${link.property.name ?? link.property.address} — ${currencySymbol(link.currency)}${link.amount.toLocaleString('es-AR')}`,
            referenceId: link.id,
          });
        }
      }
    } catch {
      // log silently
    }
  }
}
