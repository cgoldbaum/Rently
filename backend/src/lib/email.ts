import nodemailer from 'nodemailer';
import dns from 'dns';
import net from 'net';

export type EmailAttachment = {
  filename: string;
  content: Buffer;
  contentType?: string;
};

// Parsea "Rently <mail@dominio>" → { name, email } (reutilizado por los providers HTTP).
function parseFrom(raw: string): { name: string; email: string } {
  const m = raw.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || 'Rently', email: m[2] } : { name: 'Rently', email: raw };
}

// Mailjet manda por HTTP (puerto 443), así funciona en Railway, que bloquea SMTP.
// Usa dos claves (API key + secret) con autenticación Basic. Sin dominio entrega a
// cualquier destinatario; solo hay que verificar el email remitente en el panel.
async function sendViaMailjet(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const sender = parseFrom(process.env.SMTP_FROM || 'Rently <onboarding@resend.dev>');
  const auth = Buffer.from(`${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`).toString('base64');

  const res = await fetch('https://api.mailjet.com/v3.1/send', {
    method: 'POST',
    headers: { authorization: `Basic ${auth}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      Messages: [
        {
          From: { Email: sender.email, Name: sender.name },
          To: [{ Email: to }],
          Subject: subject,
          HTMLPart: html,
          ...(attachments && attachments.length > 0
            ? {
                Attachments: attachments.map((a) => ({
                  ContentType: a.contentType || 'application/octet-stream',
                  Filename: a.filename,
                  Base64Content: a.content.toString('base64'),
                })),
              }
            : {}),
        },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[EMAIL] Mailjet falló (${res.status}) al enviar a ${to}: ${body}`);
    throw new Error(`Mailjet: ${res.status} ${body}`);
  }
}

// Brevo manda por HTTP (puerto 443), así funciona en Railway, que bloquea SMTP.
// Sin dominio verificado entrega a cualquier destinatario, solo hay que verificar
// el email remitente en el panel de Brevo.
async function sendViaBrevo(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  const sender = parseFrom(process.env.BREVO_SENDER || process.env.SMTP_FROM || 'Rently <onboarding@resend.dev>');

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY as string,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
      ...(attachments && attachments.length > 0
        ? { attachment: attachments.map((a) => ({ name: a.filename, content: a.content.toString('base64') })) }
        : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[EMAIL] Brevo falló (${res.status}) al enviar a ${to}: ${body}`);
    throw new Error(`Brevo: ${res.status} ${body}`);
  }
}

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

/**
 * Envuelve contenido HTML en el template branded de Rently (header naranja + footer).
 * `footerNote` permite personalizar la nota del pie (p. ej. "no respondas a este
 * mensaje" o "Notificación automática."); si se omite, usa el texto genérico.
 */
export function buildBrandedEmail(bodyHtml: string, footerNote = 'Este email fue enviado automáticamente.'): string {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f5f0e8;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(43,29,16,0.08);">
        <tr><td style="background:#c4713a;padding:28px 40px;">
          <span style="color:#fff;font-size:22px;font-weight:700;letter-spacing:0.5px;">Rently</span>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 40px;background:#f5f0e8;border-top:1px solid #ede7dc;">
          <p style="margin:0;font-size:12px;color:#b09a87;text-align:center;">
            © ${new Date().getFullYear()} Rently — ${footerNote}
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
  </body></html>`;
}

export async function sendEmail(to: string, subject: string, html: string, attachments?: EmailAttachment[]) {
  if (process.env.MAILJET_API_KEY && process.env.MAILJET_SECRET_KEY) {
    await sendViaMailjet(to, subject, html, attachments);
    return;
  }

  if (process.env.BREVO_API_KEY) {
    await sendViaBrevo(to, subject, html, attachments);
    return;
  }

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
