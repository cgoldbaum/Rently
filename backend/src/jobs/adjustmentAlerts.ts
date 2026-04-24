import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/email';

export function startAdjustmentAlertJob() {
  cron.schedule('0 9 * * *', async () => {
    const in15 = new Date();
    in15.setDate(in15.getDate() + 15);
    const dayStart = new Date(in15);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in15);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const contracts = await prisma.contract.findMany({
        where: { nextAdjustDate: { gte: dayStart, lte: dayEnd } },
        include: { property: { include: { user: true } } },
      });

      for (const contract of contracts) {
        const owner = contract.property.user;
        const propertyName = contract.property.name ?? contract.property.address;
        const message = `El ajuste de ${propertyName} se aplica en 15 días. Monto actual: USD ${contract.currentAmount.toLocaleString('es-AR')}`;

        await prisma.notification.create({
          data: { userId: owner.id, type: 'ADJUSTMENT', message, referenceId: contract.id },
        });

        await sendEmail(
          owner.email,
          `Próximo ajuste de alquiler — ${propertyName}`,
          `<p>Hola ${owner.name},</p><p>${message}</p><p>Accedé a <a href="${process.env.APP_URL}/adjustments">Rently</a> para gestionar el ajuste.</p>`
        );
      }
    } catch (err) {
      console.error('[AdjustmentAlert cron error]', err);
    }
  });

  console.log('[Jobs] Adjustment alert cron scheduled (daily at 9am)');
}
