import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail, buildBrandedEmail } from '../lib/email';
import { sendPushToUser } from '../lib/pushNotifications';
import { formatDateShort } from '../lib/helpers';
import { getT, languageOf } from '../i18n';

async function sendRenewalAlert(contract: Awaited<ReturnType<typeof prisma.contract.findMany>>[0] & {
  property: { user: { id: string; name: string; email: string; language: string | null }; name: string | null; address: string };
  tenants: { name: string }[];
}) {
  const owner = contract.property.user;
  const t = getT(languageOf(owner));
  const propertyName = contract.property.name ?? contract.property.address;
  const endDateStr = formatDateShort(contract.endDate);
  const tenantName = contract.tenants.length
    ? contract.tenants.map((tn) => tn.name).join(', ')
    : t('notify:renewalAlert.defaultTenant');
  const daysLeft = Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const message = t('notify:renewalAlert.message', {
    property: propertyName,
    tenant: tenantName,
    date: endDateStr,
    days: daysLeft,
  });

  await prisma.notification.create({
    data: { userId: owner.id, type: 'ADJUSTMENT', message, referenceId: contract.id },
  });
  sendPushToUser(
    owner.id,
    t('notify:renewalAlert.pushTitle'),
    t('notify:renewalAlert.pushBody', { property: propertyName, days: daysLeft }),
    { type: 'contract' },
  );

  const appUrl = process.env.APP_URL || 'http://localhost:3001';
  await sendEmail(
    owner.email,
    t('notify:renewalAlert.subject', { property: propertyName }),
    buildBrandedEmail(`
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">${t('notify:email.greeting', { name: owner.name })}</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
              ${t('notify:renewalAlert.intro', { property: propertyName, tenant: tenantName, days: daysLeft })}
            </p>
            <div style="background:#fff8f3;border:1px solid #f0d5c0;border-radius:10px;padding:16px 20px;margin:20px 0;">
              <div style="font-size:13px;color:#7a6757;margin-bottom:4px;">${t('notify:renewalAlert.labelEndDate')}</div>
              <div style="font-size:20px;font-weight:700;color:#c4713a;">${endDateStr}</div>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
              ${t('notify:renewalAlert.reminder')}
            </p>
            <a href="${appUrl}/properties" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
              ${t('notify:renewalAlert.cta')}
            </a>`,
      t('notify:email.footer'))
  );
}

export async function triggerRenewalAlertsForUser(userId: string) {
  const contracts = await prisma.contract.findMany({
    where: { property: { userId } },
    include: { property: { include: { user: true } }, tenants: true },
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
        include: { property: { include: { user: true } }, tenants: true },
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
