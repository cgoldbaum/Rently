import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail } from '../lib/email';

async function sendRenewalAlert(contract: Awaited<ReturnType<typeof prisma.contract.findMany>>[0] & {
  property: { user: { id: string; name: string; email: string }; name: string | null; address: string };
  tenant: { name: string } | null;
}) {
  const owner = contract.property.user;
  const propertyName = contract.property.name ?? contract.property.address;
  const endDateStr = new Date(contract.endDate).toLocaleDateString('es-AR');
  const tenantName = contract.tenant?.name ?? 'el inquilino';
  const daysLeft = Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const message = `El contrato de ${propertyName} con ${tenantName} vence el ${endDateStr} (en ${daysLeft} días). Revisá si vas a renovarlo o dar de baja la propiedad.`;

  await prisma.notification.create({
    data: { userId: owner.id, type: 'ADJUSTMENT', message, referenceId: contract.id },
  });

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  await sendEmail(
    owner.email,
    `Contrato por vencer — ${propertyName}`,
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(43,29,16,0.08);">
          <tr><td style="background:#c4713a;padding:28px 40px;">
            <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Rently</span>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">Hola, ${owner.name} 👋</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
              El contrato de la propiedad <strong style="color:#2b1d10;">${propertyName}</strong> con <strong style="color:#2b1d10;">${tenantName}</strong> vence en <strong>${daysLeft} días</strong>.
            </p>
            <div style="background:#fff8f3;border:1px solid #f0d5c0;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <div style="font-size:13px;color:#7a6757;margin-bottom:4px;">Fecha de vencimiento</div>
              <div style="font-size:20px;font-weight:700;color:#c4713a;">${endDateStr}</div>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
              Recordá coordinar con el inquilino si van a renovar el contrato o si la propiedad quedará vacante.
            </p>
            <a href="${appUrl}/properties" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
              Ver propiedad
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

export async function triggerRenewalAlertsForUser(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { property: { userId } },
    include: { property: { include: { user: true } }, tenant: true },
  });

  let sent = 0;
  for (const contract of contracts) {
    await sendRenewalAlert(contract);
    sent++;
  }
  return sent;
}

export function startContractRenewalAlertJob() {
  cron.schedule('0 9 * * *', async () => {
    const in60 = new Date();
    in60.setDate(in60.getDate() + 60);
    const dayStart = new Date(in60);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(in60);
    dayEnd.setHours(23, 59, 59, 999);

    try {
      const contracts = await prisma.contract.findMany({
        where: { endDate: { gte: dayStart, lte: dayEnd } },
        include: { property: { include: { user: true } }, tenant: true },
      });
      for (const contract of contracts) {
        await sendRenewalAlert(contract);
      }
    } catch (err) {
      console.error('[ContractRenewalAlert cron error]', err);
    }
  });

  console.log('[Jobs] Contract renewal alert cron scheduled (daily at 9am, 60-day window)');
}
