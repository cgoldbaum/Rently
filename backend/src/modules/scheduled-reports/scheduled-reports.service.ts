import { AppError } from '../../lib/AppError';
import prisma from '../../lib/prisma';
import { sendEmail, buildBrandedEmail } from '../../lib/email';
import { generateIncomeExport, IncomeExportFormat } from '../reports/reports.service';
import { getT, languageOf } from '../../i18n';

const FORMATS: IncomeExportFormat[] = ['CSV', 'XLSX', 'PDF'];

function badRequest(key: string) {
  return new AppError(key, 400, 'VALIDATION_ERROR');
}

type ScheduleInput = {
  format?: unknown;
  dayOfMonth?: unknown;
  recipientEmail?: unknown;
  propertyId?: unknown;
  active?: unknown;
};

function normalizeFormat(value: unknown): IncomeExportFormat {
  const f = String(value ?? '').toUpperCase();
  if (!FORMATS.includes(f as IncomeExportFormat)) {
    throw badRequest('errors:scheduledReport.invalidFormat');
  }
  return f as IncomeExportFormat;
}

function normalizeDay(value: unknown): number {
  const day = parseInt(String(value ?? 1), 10);
  if (isNaN(day) || day < 1 || day > 28) {
    throw badRequest('errors:scheduledReport.invalidDay');
  }
  return day;
}

export async function listSchedules(userId: string) {
  return prisma.scheduledReport.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSchedule(userId: string, input: ScheduleInput) {
  const format = normalizeFormat(input.format);
  const dayOfMonth = normalizeDay(input.dayOfMonth);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  const recipientEmail = (typeof input.recipientEmail === 'string' && input.recipientEmail.trim())
    || user?.email
    || '';
  if (!recipientEmail) throw badRequest('errors:scheduledReport.missingEmail');

  return prisma.scheduledReport.create({
    data: {
      userId,
      reportType: 'INCOME',
      format,
      dayOfMonth,
      recipientEmail,
      propertyId: input.propertyId ? String(input.propertyId) : null,
      active: input.active === undefined ? true : Boolean(input.active),
    },
  });
}

export async function updateSchedule(userId: string, id: string, input: ScheduleInput) {
  const existing = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;

  const data: Record<string, unknown> = {};
  if (input.format !== undefined) data.format = normalizeFormat(input.format);
  if (input.dayOfMonth !== undefined) data.dayOfMonth = normalizeDay(input.dayOfMonth);
  if (typeof input.recipientEmail === 'string' && input.recipientEmail.trim()) {
    data.recipientEmail = input.recipientEmail.trim();
  }
  if (input.propertyId !== undefined) data.propertyId = input.propertyId ? String(input.propertyId) : null;
  if (input.active !== undefined) data.active = Boolean(input.active);

  return prisma.scheduledReport.update({ where: { id }, data });
}

export async function deleteSchedule(userId: string, id: string) {
  const existing = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) return null;
  await prisma.scheduledReport.delete({ where: { id } });
  return { ok: true };
}

type Schedule = {
  id: string;
  userId: string;
  format: string;
  recipientEmail: string;
  propertyId: string | null;
};

/** Genera el reporte del mes anterior y lo manda por email como adjunto. */
async function deliverSchedule(schedule: Schedule, now: Date) {
  const owner = await prisma.user.findUnique({ where: { id: schedule.userId }, select: { language: true } });
  const lng = languageOf(owner);
  const t = getT(lng);
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const monthLabel = from.toLocaleDateString(lng === 'es' ? 'es-AR' : 'en-US', { month: 'long', year: 'numeric' });
  const monthSlug = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;

  const { buffer, ext, contentType } = await generateIncomeExport(
    schedule.userId,
    schedule.format as IncomeExportFormat,
    from,
    to,
    schedule.propertyId ?? undefined
  );

  const filename = `rently-ingresos-${monthSlug}.${ext}`;
  const appUrl = process.env.APP_URL || 'http://localhost:3001';

  await sendEmail(
    schedule.recipientEmail,
    t('notify:report.subject', { month: monthLabel }),
    buildBrandedEmail(`
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">${t('notify:report.title')}</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
              ${t('notify:report.body', { month: monthLabel, format: ext.toUpperCase() })}
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
              ${t('notify:report.footer', { url: appUrl })}
            </p>`,
      t('notify:email.footer')),
    [{ filename, content: buffer, contentType }]
  );
}

/** Envío de prueba inmediato (no toca lastSentAt para no bloquear el envío automático del mes). */
export async function sendScheduleNow(userId: string, id: string) {
  const schedule = await prisma.scheduledReport.findUnique({ where: { id } });
  if (!schedule || schedule.userId !== userId) return null;
  await deliverSchedule(schedule, new Date());
  return { ok: true };
}

/** Recorrida del cron: envía los programados cuyo día coincide con hoy y no se enviaron este mes. */
export async function runDueSchedules(now = new Date()): Promise<number> {
  const day = now.getDate();
  const schedules = await prisma.scheduledReport.findMany({ where: { active: true } });
  let sent = 0;

  for (const s of schedules) {
    if (s.dayOfMonth !== day) continue;
    if (
      s.lastSentAt &&
      s.lastSentAt.getFullYear() === now.getFullYear() &&
      s.lastSentAt.getMonth() === now.getMonth()
    ) {
      continue;
    }
    try {
      await deliverSchedule(s, now);
      await prisma.scheduledReport.update({ where: { id: s.id }, data: { lastSentAt: now } });
      sent++;
    } catch (err) {
      console.error('[ScheduledReports] error enviando schedule', s.id, err);
    }
  }

  return sent;
}
