import { NotificationType } from '@prisma/client';
import prisma from './prisma';
import { sendEmail, buildBrandedEmail } from './email';
import { getT, DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '../i18n';
import type { Language } from '../i18n';

const SUBJECT_KEYS: Record<string, string> = {
  PAYMENT: 'notify:subject.PAYMENT',
  ADJUSTMENT: 'notify:subject.ADJUSTMENT',
  CLAIM: 'notify:subject.CLAIM',
  PHOTO: 'notify:subject.PHOTO',
};

function userLanguage(user: { language?: string | null }): Language {
  const lang = user.language;
  if (lang && lang !== 'system' && (SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    return lang as Language;
  }
  return DEFAULT_LANGUAGE;
}

function notificationEmailHtml(name: string, message: string, appUrl: string, t: (key: string, opts?: any) => string) {
  return buildBrandedEmail(`
          <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">${t('notify:email.greeting', { name })}</h2>
          <p style="margin:0 0 24px;font-size:15px;color:#7a6757;line-height:1.6;">${message}</p>
          <a href="${appUrl}" style="display:inline-block;background:#c4713a;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:600;font-size:15px;">${t('notify:email.openRently')}</a>`,
    t('notify:email.footer'));
}

export async function emailUserNotification(userId: string, type: string, message: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true, language: true },
    });
    if (!user?.email) return;
    const lang = userLanguage(user);
    const t = getT(lang);
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const subject = t(SUBJECT_KEYS[type] ?? 'notify:subject.default');
    await sendEmail(user.email, subject, notificationEmailHtml(user.name, message, appUrl, t));
  } catch (err) {
    console.error('[emailUserNotification] error', err);
  }
}

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
