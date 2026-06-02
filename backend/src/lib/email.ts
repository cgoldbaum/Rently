import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';

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

let cachedIPv4: { host: string; ip: string; expires: number } | null = null;

// Railway no tiene salida por IPv6. nodemailer resuelve IPv4 e IPv6 y elige una
// al AZAR (ver node_modules/nodemailer/lib/shared/index.js), así que a veces
// intenta una IPv6 y falla con ENETUNREACH. Resolvemos la IPv4 nosotros y se la
// pasamos ya resuelta; si host ya es una IP, nodemailer no resuelve DNS.
async function resolveIPv4(host: string): Promise<string | null> {
  if (net.isIP(host)) return host;
  if (cachedIPv4 && cachedIPv4.host === host && cachedIPv4.expires > Date.now()) return cachedIPv4.ip;
  try {
    const [ip] = await dns.promises.resolve4(host);
    if (!ip) return null;
    cachedIPv4 = { host, ip, expires: Date.now() + 5 * 60 * 1000 };
    return ip;
  } catch {
    return null;
  }
}

async function createSmtpTransport() {
  if (!process.env.SMTP_HOST) return null;
  const host = process.env.SMTP_HOST;
  // Pasamos la IPv4 como host y el hostname como servername para que el
  // certificado TLS siga validando contra smtp.gmail.com.
  const ipv4 = await resolveIPv4(host);
  return nodemailer.createTransport({
    host: ipv4 || host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    ...(ipv4 ? { tls: { servername: host } } : {}),
  });
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  if (process.env.RESEND_API_KEY) {
    await sendViaResend(to, subject, html, attachments);
    return;
  }

  const transport = await createSmtpTransport();
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
