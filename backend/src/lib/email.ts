import nodemailer from 'nodemailer';

function createTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return null;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const transport = createTransport();
  if (!transport) {
    console.log(`[EMAIL DEV] To: ${to} | Subject: ${subject}\n${html}`);
    return;
  }
  await transport.sendMail({ from: process.env.SMTP_FROM || 'noreply@rently.com', to, subject, html });
}
