import prisma from '../../lib/prisma';
import { sendEmail } from '../../lib/email';
import { generateIncomeExport, IncomeExportFormat } from '../reports/reports.service';

const FORMATS: IncomeExportFormat[] = ['CSV', 'XLSX', 'PDF'];

function badRequest(message: string) {
  return Object.assign(new Error(message), { status: 400, code: 'VALIDATION_ERROR' });
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
    throw badRequest('Formato inválido (usá CSV, XLSX o PDF)');
  }
  return f as IncomeExportFormat;
}

function normalizeDay(value: unknown): number {
  const day = parseInt(String(value ?? 1), 10);
  if (isNaN(day) || day < 1 || day > 28) {
    throw badRequest('El día debe estar entre 1 y 28');
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
  if (!recipientEmail) throw badRequest('Falta el email de destino');

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
  const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  const monthLabel = from.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
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
    `Reporte de ingresos — ${monthLabel}`,
    `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
      <tr><td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(43,29,16,0.08);">
          <tr><td style="background:#c4713a;padding:28px 40px;">
            <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Rently</span>
          </td></tr>
          <tr><td style="padding:36px 40px;">
            <h2 style="margin:0 0 16px;font-size:20px;color:#2b1d10;">Tu reporte de ingresos</h2>
            <p style="margin:0 0 12px;font-size:15px;color:#7a6757;line-height:1.6;">
              Adjuntamos tu reporte programado de ingresos correspondiente a <strong style="color:#2b1d10;">${monthLabel}</strong>, en formato <strong>${ext.toUpperCase()}</strong>.
            </p>
            <p style="margin:0 0 24px;font-size:14px;color:#7a6757;line-height:1.6;">
              Este envío es automático. Podés cambiar la frecuencia, el formato o cancelarlo desde la sección Reportes en <a href="${appUrl}/reports" style="color:#c4713a;">Rently</a>.
            </p>
          </td></tr>
          <tr><td style="padding:20px 40px;background:#f5f0e8;border-top:1px solid #ede7dc;">
            <p style="margin:0;font-size:12px;color:#b09a87;text-align:center;">
              © ${new Date().getFullYear()} Rently — Reporte enviado automáticamente.
            </p>
          </td></tr>
        </table>
      </td></tr>
    </table>
    </body></html>`,
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
