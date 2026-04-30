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
        const message = `El ajuste automático de ${propertyName} se aplicará en 15 días (índice ${contract.indexType}). Monto actual: $${contract.currentAmount.toLocaleString('es-AR')}`;

        await prisma.notification.create({
          data: { userId: owner.id, type: 'ADJUSTMENT', message, referenceId: contract.id },
        });

        await sendEmail(
          owner.email,
          `Próximo ajuste automático de alquiler — ${propertyName}`,
          `<p>Hola ${owner.name},</p><p>${message}</p><p>El ajuste se aplicará automáticamente según el índice <strong>${contract.indexType}</strong> publicado por ${contract.indexType === 'IPC' ? 'INDEC' : 'BCRA'}.</p><p>Podés ver el historial en <a href="${process.env.APP_URL}/adjustments">Rently</a>.</p>`
        );
      }
    } catch (err) {
      console.error('[AdjustmentAlert cron error]', err);
    }
  });

  console.log('[Jobs] Adjustment alert cron scheduled (daily at 9am)');
}
