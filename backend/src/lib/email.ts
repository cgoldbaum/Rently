import nodemailer from 'nodemailer';

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

async function sendViaResend(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.SMTP_FROM || 'Rently <onboarding@resend.dev>',
    to,
    subject,
    html,
    ...(attachments && attachments.length > 0
      ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content })) }
      : {}),
  });
  // El SDK de Resend NO lanza en errores de API: devuelve { error }. Si no lo
  // chequeamos, los fallos (dominio sin verificar, 403, etc.) pasan en silencio.
  if (error) {
    console.error(`[EMAIL] Resend falló al enviar a ${to}: ${error.name} — ${error.message}`);
    throw new Error(`Resend: ${error.message}`);
  }
}

function createSmtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html, attachments);
    return;
  }

  const transport = createSmtpTransport();
  if (transport) {
    await transport.sendMail({
      from: process.env.SMTP_FROM || 'noreply@rently.com',
      to,
      subject,
      html,
      ...(attachments && attachments.length > 0
        ? { attachments: attachments.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })) }
        : {}),
    });
    return;
  }

  const attachNote = attachments && attachments.length > 0 ? ` | Adjuntos: ${attachments.map((a) => a.filename).join(', ')}` : '';
  console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}${attachNote}\n${html}`);
}
