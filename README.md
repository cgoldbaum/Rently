# Rently

**Rently** es una plataforma de gestión de alquileres que reemplaza las planillas, los recordatorios manuales y los mensajes sueltos por una sola herramienta, disponible tanto en **web** como en **mobile**. Está pensada para el mercado de alquileres de **Argentina**: maneja montos en ARS y USD y aplica ajustes con los índices locales (IPC, ICL o manual), tal como funcionan los contratos en el país.

---

## ¿Para quién es?

Cada parte ve exactamente lo que necesita:

- El **propietario** controla su cartera de propiedades, contratos, cobros y ajustes desde un panel.
- El **inquilino** accede a su contrato, paga su alquiler, sube expensas y reporta problemas desde su propio espacio.
- Ambos se comunican por chat dentro de la app y reciben notificaciones de lo importante, sin perder el hilo de cada propiedad.

---

## Arquitectura

Es un **monorepo TypeScript** dividido por runtime:

| Carpeta     | Descripción |
|-------------|-------------|
| `backend/`  | API REST con **Express** + **Prisma** sobre **PostgreSQL**. Incluye migraciones, seeds, jobs programados y middleware de auth. |
| `frontend/` | App web con **Next.js 16** + **React 19**, **Tailwind CSS**, **Zustand** y **React Query**. |
| `mobile/`   | App móvil con **Expo / React Native** (Expo Router), notificaciones push y selección de archivos/imágenes. |
| `shared/`   | Tipos, helpers de API, esquemas de validación (**Zod**) y stores compartidos entre apps. |

Integraciones destacadas: **Mercado Pago** (cobros y suscripciones), **Nodemailer** (emails), un **asistente de IA** (chat conversacional) y **notificaciones push** en mobile.

---

## Roles de usuario

- **Propietario (Owner):** dueño de las propiedades. Gestiona contratos, cobros, ajustes, reclamos y reportes.
- **Inquilino (Tenant):** accede mediante invitación a su contrato. Paga, sube comprobantes y reporta reclamos.

---

## Características principales

### 🏠 Propietario

Disponible en **web** y **mobile**:

- **Gestión de propiedades:** alta/edición de inmuebles con tipo, superficie, estado (vacante, ocupada, en mora, por vencer), antigüedad y condición.
- **Contratos:** creación y administración de contratos con fechas, montos, moneda, día de pago, índice y frecuencia de ajuste. Carga del documento del contrato.
- **Pagos y cobranzas:** seguimiento de pagos por período, registro de pagos en efectivo con recibo, y cobros online vía **Mercado Pago**.
- **Ajustes de alquiler:** cálculo y aplicación de ajustes por IPC / ICL / manual, con historial de variaciones y ajuste automático programado.
- **Reclamos:** recepción y seguimiento de reclamos del inquilino con categoría, prioridad, estado, historial y notas internas.
- **Galería de fotos:** fotos de la propiedad organizadas en carpetas y con etiquetas.
- **Asistente de IA:** chat con IA para consultas sobre la operación.
- **Chat con inquilinos** y **notificaciones** (con push en mobile).
- **Links de pago:** generación de links de cobro vía Mercado Pago.
- **Suscripciones:** planes (Starter, Pro, Agency) con límite de propiedades y pago de suscripción vía Mercado Pago.

Solo en **web**:

- **Reportes:** generación de reportes de ingresos y rendimiento, y **reportes programados** enviados por email.
- **Panel de rendimiento (Performance):** métricas y estado general de la cartera de un vistazo.
- **Portal público de propiedades:** publicación de listados accesibles por link.

Solo en **mobile**:

- **Calendario / agenda:** vista de inspecciones y visitas programadas de las propiedades.

### 👤 Inquilino

Disponible en **web** y **mobile**:

- **Mi contrato:** consulta de los datos y documento del contrato vigente.
- **Pagos:** pago del alquiler online (Mercado Pago) y consulta del estado de cada período.
- **Expensas:** carga de comprobantes de expensas por período.
- **Reclamos:** creación y seguimiento de reclamos con foto y categoría.
- **Fotos:** acceso a las fotos de la propiedad.
- **Chat** con el propietario y **asistente de IA**.
- **Configuración** de la cuenta y notificaciones.

### 🔐 Comunes a ambos roles

- Registro, login y recuperación de contraseña.
- Notificaciones (pagos, ajustes, reclamos, fotos) — con **push** en mobile.
- Chat 1:1 vinculado al contrato.

---

## Puesta en marcha

Requisitos: Node.js, PostgreSQL (o Docker) y, para mobile, Expo.

```bash
# Instalar dependencias, levantar PostgreSQL, generar/migrar Prisma y cargar datos demo
make setup

# Levantar backend (http://localhost:4001) y web (http://localhost:3001)
make dev
```

### Comandos útiles

```bash
make build         # build de backend y frontend para producción
make db-up         # levantar PostgreSQL local
make db-migrate    # aplicar migraciones de Prisma
make db-seed       # cargar datos demo
make db-reset      # resetear + re-sembrar la DB desde cero
make db-studio     # abrir Prisma Studio
```

> **¿Venís de una DB local vieja?** A partir del cambio que estandariza `Payment.period`
> al formato `YYYY-MM`, una base creada antes puede tener períodos en texto
> ("junio de 2026") y cobros duplicados. Si tenés datos que no te importa perder,
> corré `make db-reset` y listo. Si querés conservarlos, normalizá en el lugar:
>
> ```bash
> make db-normalize-periods              # dry-run: muestra qué haría, no escribe
> make db-normalize-periods ARGS=--apply # aplica (deja casos ambiguos para revisión manual)
> ```
>
> Una instalación desde cero NO necesita nada de esto: el seed ya genera datos limpios.

```bash
# Mobile
cd mobile && npm start          # iniciar Expo
cd mobile && npm run android    # o ios / web
```

### Tests

```bash
cd backend && npm test          # specs de la API (Jasmine)
cd frontend && npm test         # tests de componentes (Jest + Testing Library)
cd frontend && npm run lint     # ESLint del web
```

---

## Documentación adicional

- [AGENTS.md](AGENTS.md) — guía de estructura, estilo y convenciones del repo.
- [EMAIL_SETUP.md](EMAIL_SETUP.md) — configuración del envío de emails.
</content>
</invoke>
