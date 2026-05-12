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
        include: { property: { include: { user: true } }, tenant: { include: { user: true } } },
      });

      for (const contract of contracts) {
        const owner = contract.property.user;
        const propertyName = contract.property.name ?? contract.property.address;
        const appUrl = process.env.APP_URL || 'http://localhost:3001';
        const adjustDateStr = contract.nextAdjustDate ? new Date(contract.nextAdjustDate).toLocaleDateString('es-AR') : '—';
        const source = contract.indexType === 'IPC' ? 'INDEC' : 'BCRA';

        // ── Notificación al propietario ──────────────────────────────────────
        const ownerMessage = `El ajuste automático de ${propertyName} se aplicará en 15 días (índice ${contract.indexType}). Monto actual: $${contract.currentAmount.toLocaleString('es-AR')}`;
        await prisma.notification.create({
          data: { userId: owner.id, type: 'ADJUSTMENT', message: ownerMessage, referenceId: contract.id },
        });
        await sendEmail(
          owner.email,
          `Próximo ajuste automático de alquiler — ${propertyName}`,
          `<p>Hola ${owner.name},</p><p>${ownerMessage}</p><p>El ajuste se aplicará automáticamente según el índice <strong>${contract.indexType}</strong> publicado por ${source}.</p><p>Podés ver el historial en <a href="${appUrl}/adjustments">Rently</a>.</p>`
        );

        // ── Notificación al inquilino ────────────────────────────────────────
        const tenant = contract.tenant;
        if (tenant?.user) {
          const tenantMessage = `Tu alquiler de ${propertyName} se ajustará el ${adjustDateStr} según el índice ${contract.indexType}. Monto actual: $${contract.currentAmount.toLocaleString('es-AR')}`;
          await prisma.notification.create({
            data: { userId: tenant.user.id, type: 'ADJUSTMENT', message: tenantMessage, referenceId: contract.id },
          });
          await sendEmail(
            tenant.user.email,
            `Próximo ajuste de tu alquiler — ${propertyName}`,
            `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
            <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
              <tr><td align="center">
                <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(43,29,16,0.08);">
                  <tr><td style="background:#c4713a;padding:28px 40px;">
                    <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Rently</span>
                  </td></tr>
                  <tr><td style="padding:36px 40px;">
                    <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">Hola, ${tenant.name} 👋</h2>
                    <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
                      Tu alquiler de <strong style="color:#2b1d10;">${propertyName}</strong> tendrá un ajuste en <strong>15 días</strong>.
                    </p>
                    <div style="background:#fff8f3;border:1px solid #f0d5c0;border-radius:10px;padding:16px 20px;margin:20px 0;display:flex;gap:24px;">
                      <div>
                        <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">Monto actual</div>
                        <div style="font-size:18px;font-weight:700;color:#2b1d10;">$${contract.currentAmount.toLocaleString('es-AR')}</div>
                      </div>
                      <div>
                        <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">Fecha de ajuste</div>
                        <div style="font-size:18px;font-weight:700;color:#c4713a;">${adjustDateStr}</div>
                      </div>
                      <div>
                        <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">Índice</div>
                        <div style="font-size:18px;font-weight:700;color:#2b1d10;">${contract.indexType}</div>
                      </div>
                    </div>
                    <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
                      El nuevo monto se calculará automáticamente usando el índice <strong>${contract.indexType}</strong> publicado por <strong>${source}</strong>. Podés consultar el detalle en tu portal de inquilino.
                    </p>
                    <a href="${appUrl}/tenant" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
                      Ver mi contrato
                    </a>
                  </td></tr>
                  <tr><td style="padding:20px 40px;background:#f5f0e8;border-top:1px solid #ede7dc;">
                    <p style="margin:0;font-size:12px;color:#b09a87;text-align:center;">
                      © ${new Date().getFullYear()} Rently — Este email fue enviado automáticamente.
                    </p>
                  </td></tr>
                </table>
              </td></tr>
            </table>
            </body></html>`
          );
        }
      }
    } catch (err) {
      console.error('[AdjustmentAlert cron error]', err);
    }
  });

  console.log('[Jobs] Adjustment alert cron scheduled (daily at 9am)');
}
