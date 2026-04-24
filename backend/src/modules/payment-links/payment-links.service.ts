import prisma from '../../lib/prisma';

async function assertPropertyOwnership(propertyId: string, userId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw Object.assign(new Error('Property not found'), { code: 'NOT_FOUND', status: 404 });
  if (property.userId !== userId) throw Object.assign(new Error('Access denied'), { code: 'FORBIDDEN', status: 403 });
  return property;
}

export async function createPaymentLink(propertyId: string, userId: string, input: {
  amount: number; period: string; description?: string;
}) {
  await assertPropertyOwnership(propertyId, userId);

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw Object.assign(
      new Error('Mercado Pago no está configurado. Agregá MERCADOPAGO_ACCESS_TOKEN al .env'),
      { code: 'MP_NOT_CONFIGURED', status: 503 }
    );
  }

  const body = {
    items: [{
      title: input.description || `Alquiler ${input.period}`,
      quantity: 1,
      unit_price: input.amount,
      currency_id: 'ARS',
    }],
    back_urls: {
      success: `${process.env.APP_URL}/payments?status=success`,
      failure: `${process.env.APP_URL}/payments?status=failure`,
      pending: `${process.env.APP_URL}/payments?status=pending`,
    },
    auto_return: 'approved',
    external_reference: propertyId,
    notification_url: `${process.env.API_URL}/webhooks/mercadopago`,
  };

  const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify(body),
  });

  if (!mpRes.ok) {
    const err = await mpRes.text();
    throw Object.assign(new Error(`Error de Mercado Pago: ${err}`), { code: 'MP_ERROR', status: 502 });
  }

  const mpData = await mpRes.json() as { id: string; init_point: string };

  const link = await prisma.paymentLink.create({
    data: {
      propertyId,
      mpPreferenceId: mpData.id,
      mpInitPoint: mpData.init_point,
      amount: input.amount,
      period: input.period,
      description: input.description,
    },
  });

  return { link, initPoint: mpData.init_point, preferenceId: mpData.id };
}

export async function listPaymentLinks(propertyId: string, userId: string) {
  await assertPropertyOwnership(propertyId, userId);
  return prisma.paymentLink.findMany({ where: { propertyId }, orderBy: { createdAt: 'desc' } });
}
