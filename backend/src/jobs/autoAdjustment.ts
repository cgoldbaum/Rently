import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/email';
import { IndexType, Country } from '@prisma/client';
import { fetchIndexVariation } from '../lib/indexFetcher';

const INDEX_SOURCE_LABELS: Record<Country, Record<IndexType, string>> = {
  AR: { IPC: 'INDEC', ICL: 'BCRA', MANUAL: 'Manual' },
  CL: { IPC: 'Banco Central de Chile', ICL: 'Banco Central de Chile', MANUAL: 'Manual' },
  CO: { IPC: 'DANE', ICL: 'DANE', MANUAL: 'Manual' },
  UY: { IPC: 'INE', ICL: 'INE', MANUAL: 'Manual' },
};

function getIndexSource(country: Country, indexType: IndexType): string {
  return INDEX_SOURCE_LABELS[country]?.[indexType] || indexType;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function startAutoAdjustmentJob() {
  // Runs daily at 6:00 AM — applies adjustments whose nextAdjustDate is today or in the past
  cron.schedule('0 6 * * *', async () => {
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    try {
      const contracts = await prisma.contract.findMany({
        where: {
          nextAdjustDate: { lte: todayEnd },
          indexType: { not: 'MANUAL' },
        },
        include: { property: { include: { user: true } } },
      });

      for (const contract of contracts) {
        const variation = await fetchIndexVariation(contract.property.country, contract.indexType);

        if (variation === null) {
          console.error(
            `[AutoAdjustment] No se pudo obtener el índice ${contract.indexType} para el país ${contract.property.country} en el contrato ${contract.id}. Se omite este ajuste.`
          );
          continue;
        }

        const previousAmount = contract.currentAmount;
        const newAmount = Math.round(previousAmount * (1 + variation / 100) * 100) / 100;
        const nextAdjustDate = addMonths(contract.nextAdjustDate!, contract.adjustFrequency);

        await prisma.$transaction([
          prisma.adjustmentHistory.create({
            data: {
              contractId: contract.id,
              indexType: contract.indexType,
              previousAmount,
              newAmount,
              variation,
              notified: true,
            },
          }),
          prisma.contract.update({
            where: { id: contract.id },
            data: { currentAmount: newAmount, nextAdjustDate },
          }),
        ]);

        const owner = contract.property.user;
        const propertyName = contract.property.name ?? contract.property.address;
        const indexSource = getIndexSource(contract.property.country, contract.indexType);
        const message = `Ajuste automático aplicado en ${propertyName}: ${contract.indexType} (${indexSource}) +${variation.toFixed(2)}% — nuevo monto $${newAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;

        await prisma.notification.create({
          data: {
            userId: owner.id,
            type: 'ADJUSTMENT',
            message,
            referenceId: contract.id,
          },
        });

        await sendEmail(
          owner.email,
          `Ajuste automático de alquiler — ${propertyName}`,
          `<p>Hola ${owner.name},</p>
          <p>Se aplicó automáticamente el ajuste de alquiler según el índice establecido en el contrato:</p>
          <table style="border-collapse:collapse; width:100%; font-size:14px; margin:16px 0;">
            <tr><td style="padding:6px 12px; color:#666">Propiedad</td><td style="padding:6px 12px; font-weight:600">${propertyName}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:6px 12px; color:#666">Índice aplicado</td><td style="padding:6px 12px; font-weight:600">${contract.indexType} (${indexSource})</td></tr>
            <tr><td style="padding:6px 12px; color:#666">País</td><td style="padding:6px 12px; font-weight:600">${contract.property.country}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:6px 12px; color:#666">Variación</td><td style="padding:6px 12px; font-weight:600; color:#16a34a">+${variation.toFixed(2)}%</td></tr>
            <tr><td style="padding:6px 12px; color:#666">Monto anterior</td><td style="padding:6px 12px">$${previousAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td></tr>
            <tr style="background:#f9f9f9"><td style="padding:6px 12px; color:#666">Nuevo monto</td><td style="padding:6px 12px; font-weight:700; font-size:16px">$${newAmount.toLocaleString('es-AR', { maximumFractionDigits: 2 })}</td></tr>
            <tr><td style="padding:6px 12px; color:#666">Próximo ajuste</td><td style="padding:6px 12px">${nextAdjustDate.toLocaleDateString('es-AR')}</td></tr>
          </table>
          <p>Podés ver el historial completo en <a href="${process.env.APP_URL}/adjustments">Rently</a>.</p>`
        );

        console.log(
          `[AutoAdjustment] Contrato ${contract.id} (${propertyName}) [${contract.property.country}]: ${contract.indexType} (${indexSource}) +${variation.toFixed(2)}% → $${newAmount}`
        );
      }
    } catch (err) {
      console.error('[AutoAdjustment cron error]', err);
    }
  });

  console.log('[Jobs] Auto adjustment cron scheduled (daily at 6am)');
}
