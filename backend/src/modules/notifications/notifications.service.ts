import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';

export async function listOwnerNotifications(userId: string) {
  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);
  return { notifications, unreadCount };
}

export async function markRead(notificationId: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== userId) {
    throw new AppError('errors:notification.notFound', 404, 'NOT_FOUND');
  }
  return prisma.notification.update({ where: { id: notificationId }, data: { read: true } });
}

export async function markUnread(notificationId: string, userId: string) {
  const notif = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!notif || notif.userId !== userId) {
    throw new AppError('errors:notification.notFound', 404, 'NOT_FOUND');
  }
  return prisma.notification.update({ where: { id: notificationId }, data: { read: false } });
}

export async function markAllRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
}
