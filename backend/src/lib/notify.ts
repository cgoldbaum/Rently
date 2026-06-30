import { NotificationType } from '@prisma/client';
import prisma from './prisma';
import { sendEmail, buildBrandedEmail } from './email';

const SUBJECTS: Record<string, string> = {
  PAYMENT: 'Novedad de pago — Rently',
  ADJUSTMENT: 'Ajuste de alquiler — Rently',
  CLAIM: 'Novedad de reclamo — Rently',
  PHOTO: 'Nuevo registro fotográfico — Rently',
};

function notificationEmailHtml(name: string, message: string, appUrl: string) {
  return buildBrandedEmail(`
          <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">Hola, ${name} 👋</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#7a6757;line-height:1.6;">${message}</p>
          <a href="${appUrl}" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">Abrir Rently</a>`, 'Notificación automática.');
}

/**
 * Envía por email una notificación al usuario. No bloquea el flujo: traga sus
 * propios errores para que un fallo de email nunca rompa la operación principal.
 */
export async function emailUserNotification(userId: string, type: string, message: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });
    if (!user?.email) return;
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const subject = SUBJECTS[type] ?? 'Notificación — Rently';
    await sendEmail(user.email, subject, notificationEmailHtml(user.name, message, appUrl));
  } catch (err) {
    console.error('[emailUserNotification] error', err);
  }
}

/**
 * Crea la notificación in-app y dispara el email correspondiente (fire-and-forget).
 * Reemplazo directo de `prisma.notification.create({ data })`.
 */
export async function createNotification(data: {
  userId: string;
  type: NotificationType;
  message: string;
  referenceId?: string | null;
}) {
  const notification = await prisma.notification.create({ data });
  void emailUserNotification(data.userId, data.type, data.message);
  return notification;
}
