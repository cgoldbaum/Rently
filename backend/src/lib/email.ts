import nodemailer from 'nodemailer';

async function sendViaResend(to: string, subject: string, html: string) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.SMTP_FROM || 'Rently <onboarding@resend.dev>',
    to,
    subject,
    html,
  });
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

export async function sendEmail(to: string, subject: string, html: string) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html);
    return;
  }

  const transport = createSmtpTransport();
  if (transport) {
    await transport.sendMail({ from: process.env.SMTP_FROM || 'noreply@rently.com', to, subject, html });
    return;
  }

  console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${html}`);
}
