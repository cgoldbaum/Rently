import cron from 'node-cron';
import prisma from '../lib/prisma';

export function startSubscriptionExpirationJob() {
  cron.schedule('0 2 * * *', async () => {
    const now = new Date();

    try {
      const pastDue = await prisma.ownerSubscription.updateMany({
        where: {
          status: 'ACTIVE',
          currentPeriodEnd: { lt: now },
        },
        data: {
          status: 'PAST_DUE',
          graceUntil: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      if (pastDue.count > 0) {
        console.log(`[SubscriptionExpiration] Marked ${pastDue.count} subscriptions as PAST_DUE`);
      }

      const expired = await prisma.ownerSubscription.updateMany({
        where: {
          status: 'PAST_DUE',
          graceUntil: { lt: now },
        },
        data: {
          status: 'EXPIRED',
          canceledAt: now,
        },
      });

      if (expired.count > 0) {
        console.log(`[SubscriptionExpiration] Marked ${expired.count} subscriptions as EXPIRED`);
      }
    } catch (err) {
      console.error('[SubscriptionExpiration cron error]', err);
    }
  });

  console.log('[Jobs] Subscription expiration cron scheduled (daily at 2am)');
}
