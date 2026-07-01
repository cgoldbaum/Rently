import cron from 'node-cron';
import prisma from '../lib/prisma';
import { sendEmail, buildBrandedEmail } from '../lib/email';
import { formatDateShort } from '../lib/helpers';
import { getT, languageOf, type Language } from '../i18n';

const money = (amount: number, lng: Language) =>
  `$${amount.toLocaleString(lng === 'es' ? 'es-AR' : 'en-US')}`;

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
        include: { property: { include: { user: true } }, tenants: { include: { user: true } } },
      });

      for (const contract of contracts) {
        const owner = contract.property.user;
        const propertyName = contract.property.name ?? contract.property.address;
        const appUrl = process.env.APP_URL || 'http://localhost:3001';
        const adjustDateStr = contract.nextAdjustDate ? formatDateShort(contract.nextAdjustDate) : '—';
        const source = contract.indexType === 'IPC' ? 'INDEC' : 'BCRA';

        // ── Notificación al propietario ──────────────────────────────────────
        const ownerLng = languageOf(owner);
        const ot = getT(ownerLng);
        const ownerMessage = ot('notify:adjustmentAlert.ownerMessage', {
          property: propertyName,
          index: contract.indexType,
          amount: money(contract.currentAmount, ownerLng),
        });
        await prisma.notification.create({
          data: { userId: owner.id, type: 'ADJUSTMENT', message: ownerMessage, referenceId: contract.id },
        });
        await sendEmail(
          owner.email,
          ot('notify:adjustmentAlert.ownerSubject', { property: propertyName }),
          `<p>${ot('notify:adjustmentAlert.ownerGreeting', { name: owner.name })}</p><p>${ownerMessage}</p><p>${ot('notify:adjustmentAlert.ownerBody', { index: contract.indexType, source })}</p><p>${ot('notify:adjustmentAlert.ownerHistory', { url: appUrl })}</p>`
        );

        // ── Notificación a los inquilinos ────────────────────────────────────
        for (const tenant of contract.tenants) {
          if (!tenant.user) continue;
          const tLng = languageOf(tenant.user);
          const tt = getT(tLng);
          const tAmount = money(contract.currentAmount, tLng);
          const tenantMessage = tt('notify:adjustmentAlert.tenantMessage', {
            property: propertyName,
            date: adjustDateStr,
            index: contract.indexType,
            amount: tAmount,
          });
          await prisma.notification.create({
            data: { userId: tenant.user.id, type: 'ADJUSTMENT', message: tenantMessage, referenceId: contract.id },
          });
          await sendEmail(
            tenant.user.email,
            tt('notify:adjustmentAlert.tenantSubject', { property: propertyName }),
            buildBrandedEmail(`
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">${tt('notify:email.greeting', { name: tenant.name })}</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
              ${tt('notify:adjustmentAlert.tenantIntro', { property: propertyName })}
            </p>
            <div style="background:#fff8f3;border:1px solid #f0d5c0;border-radius:10px;padding:16px 20px;margin:20px 0;display:flex;gap:24px;">
              <div>
                <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">${tt('notify:adjustmentAlert.labelCurrentAmount')}</div>
                <div style="font-size:18px;font-weight:700;color:#2b1d10;">${tAmount}</div>
              </div>
              <div>
                <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">${tt('notify:adjustmentAlert.labelAdjustDate')}</div>
                <div style="font-size:18px;font-weight:700;color:#c4713a;">${adjustDateStr}</div>
              </div>
              <div>
                <div style="font-size:12px;color:#7a6757;margin-bottom:4px;">${tt('notify:adjustmentAlert.labelIndex')}</div>
                <div style="font-size:18px;font-weight:700;color:#2b1d10;">${contract.indexType}</div>
              </div>
            </div>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
              ${tt('notify:adjustmentAlert.tenantExplain', { index: contract.indexType, source })}
            </p>
            <a href="${appUrl}/tenant" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">
              ${tt('notify:adjustmentAlert.tenantCta')}
            </a>`,
            tt('notify:email.footer'))
          );
        }
      }
    } catch (err) {
      console.error('[AdjustmentAlert cron error]', err);
    }
  });

  console.log('[Jobs] Adjustment alert cron scheduled (daily at 9am)');
}
