# Configurar notificaciones por email

## Opción A — Resend (recomendado)

Gratis hasta 3.000 emails/mes.

1. Creá cuenta en https://resend.com
2. Verificá tu dominio o usá el dominio de prueba que te dan
3. Andá a **API Keys** → **Create API Key**
4. Pegá la key en `backend/.env`:

```env
RESEND_API_KEY="re_xxxxxxxxxxxx"
SMTP_FROM="Rently <notificaciones@tudominio.com>"
```

5. Reiniciá el backend — los emails salen automáticamente

---

## Opción B — Gmail SMTP

1. En tu cuenta de Google: **Seguridad** → **Verificación en 2 pasos** (debe estar activa)
2. Buscá **Contraseñas de aplicación** → creá una para "Correo"
3. Completá el `backend/.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="tu@gmail.com"
SMTP_PASS="xxxx xxxx xxxx xxxx"
SMTP_FROM="Rently <tu@gmail.com>"
```

4. Reiniciá el backend

---

## Emails que se envían automáticamente

| Evento | Destinatario |
|--------|-------------|
| Pago pasa a mora | Inquilino + Propietario |
| Propietario confirma pago | Inquilino |
| Propietario registra pago directamente | Inquilino |
| Visita o inspección agendada | Inquilino |
