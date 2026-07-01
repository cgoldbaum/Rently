# AGENTS.md — Mapa del repo

Guía rápida de Rently para agentes. Objetivo: encontrar todo sin búsquedas innecesarias. **Rently** es una app de gestión de alquileres (propietarios + inquilinos) para Argentina. Monorepo TypeScript dividido por runtime.

## Stack y puertos

| App | Stack | Dev URL |
|-----|-------|---------|
| `backend/` | Express 4 + Prisma 6 + PostgreSQL, JWT, Zod | `http://localhost:4001` |
| `frontend/` | Next.js 16 (App Router) + React 19, Tailwind 4, Zustand, React Query | `http://localhost:3001` |
| `mobile/` | Expo / React Native (Expo Router), React Query, expo-notifications | Expo |
| `shared/` | Tipos, helpers de API/format, schemas Zod, factory de auth store (workspace npm) | — |

API base URL: frontend usa `NEXT_PUBLIC_API_URL` (default `localhost:4001`); mobile usa `EXPO_PUBLIC_API_URL` (default `10.0.2.2:4001` para emulador Android).

## Comandos

```bash
make setup      # instala deps API/web, levanta Postgres, prisma generate+migrate, seed
make dev        # backend :4001 + web :3001  (dev-api / dev-web por separado)
make build      # build de backend y frontend
make db-up | db-migrate | db-seed | db-reset | db-studio   # workflow Postgres/Prisma
make db-normalize-periods [ARGS=--apply]   # normaliza Payment.period a YYYY-MM en datos viejos
make kill       # libera puertos

cd backend  && npm test                 # specs Jasmine  (spec/*.spec.mjs)
cd frontend && npm test | test:coverage # Jest + Testing Library (src/__tests__/*.test.tsx)
cd frontend && npm run lint             # ESLint
cd mobile   && npm start | android | ios | web   # Expo
```

## Backend (`backend/src/`)

**Punto de entrada:** [index.ts](backend/src/index.ts) — monta routers, sirve `/uploads` estático, arranca los jobs.

**Anatomía de un módulo** (`modules/<nombre>/`): patrón común →
`*.router.ts` (rutas + middleware) → `*.controller.ts` (req/res, sin lógica) → `*.service.ts` (lógica + Prisma). Algunos módulos agregan `*.schema.ts` (validación Zod).
Para tocar una feature, entrá directo al módulo: la lógica vive en el `.service.ts`.

**Mapa de rutas → módulo** (todas relativas a la raíz de la API):

| Ruta | Módulo |
|------|--------|
| `/auth/*` (register, login, refresh, logout, me, forgot/reset-password, push-token) | `auth` |
| `/dashboard` | `dashboard` |
| `/properties`, `/properties/:id/...` | `properties` (incluye `portal-listings.*`) |
| `/properties/:id/photos`, `/properties/:id/folders`, `/tags` | `photos`, `folders`, `tags` |
| `/properties/:id/payment-links` | `payment-links` |
| `/properties/:id/contract`, `/contracts/:contractId/document` | `contracts`, `contract-documents` |
| `/contracts/:contractId/tenant` | `tenants` (gestión por el owner) |
| `/payments`, `/contracts/:contractId/payments` | `payments` (cuotas: `POST /payments/:id/split` vive en `inspections`) |
| `/adjustments`, `/contracts/:contractId/adjustments` | `adjustments` |
| `/tenant/*` | `tenant` (portal del inquilino logueado) |
| `/owner/notifications`, `/owner/subscription` | `notifications`, `subscriptions` |
| `/owner/reports`, `/owner/reports/schedules*` | `reports` (los reportes programados los maneja `scheduled-reports`, montado dentro de `reports.router`) |
| `/inspections` | `inspections` |
| `/claims`, `/properties/:id/claims`, `/claims/:id/resolve`, `POST /public/claims/:linkToken` | `claims` |
| `/claims/:id/notes` | `claim-notes` |
| `/chat`, `/ai-chat` | `chat` (owner↔tenant), `ai-chat` (LLM, Groq llama-3.3-70b) |
| `/webhooks/mercadopago` | `webhooks` |

**Infra compartida:**
- `lib/`: `prisma.ts` (cliente), `AppError.ts` (errores unificados, usar este), `email.ts` (Resend/SMTP), `notify.ts` (notificaciones in-app), `pushNotifications.ts` (Expo push), `indexFetcher.ts` (IPC/ICL), `multer.ts` (uploads), `helpers.ts`, `pdf/` (reportes y descripción de propiedad).
- `middleware/`: `i18n` (idioma), `authenticate` (JWT), `ownsProperty`, `requireTenant`, `validateBody` (Zod), `errorHandler`.
- `jobs/` (cron arrancados en index.ts): `adjustmentAlerts`, `autoAdjustment`, `contractRenewalAlerts`, `scheduledReports`, `subscriptionExpiration`.
- Prisma: [schema.prisma](backend/prisma/schema.prisma), migrations en `backend/prisma/migrations/`, seed en [seed.ts](backend/prisma/seed.ts).
- **`Payment.period` siempre `YYYY-MM`** (helper `periodKey` en `lib/helpers.ts`), garantizado por `@@unique([contractId, period])`. Nunca escribir el período en texto ("junio de 2026"). Si trabajás sobre una **DB local vieja** con períodos en texto o cobros duplicados, corré `make db-reset` (la borra y re-siembra limpia) o `make db-normalize-periods` para migrar en el lugar. Una instalación desde cero ya genera datos limpios.

## Frontend web (`frontend/src/`)

- `app/` — App Router con **route groups** por audiencia:
  - `(auth)/` → login, register, reset-password
  - `(dashboard)/` → vistas del **owner**: properties (`[id]` con tabs y modals, `new`), payments, adjustments, claims, photos, reports, performance, professionals, ai-chat, chat, settings
  - `(tenant)/tenant/` → vistas del **inquilino**: contract, payments, expensas, claims, photos, ai-chat, chat, settings
  - `public/` → portal público por token (`portal/[token]`), demo de Mercado Pago
- `components/` — UI reutilizable (`ui/` = primitivos), vistas compartidas (`AiChatView`, `ChatView`, `Modal`, badges, `NotificationDropdown`...).
- `lib/`: `api.ts` (axios + fallback de baseURL, `getLanguage: () => i18n.language` envía `Accept-Language`), `constants.ts`, `utils.ts`, `validations.ts`.
- `store/`: Zustand (`auth.ts`, `toast.ts`, `locale.ts`).
- Tests en `__tests__/`.

## Mobile (`mobile/`)

- `app/` — Expo Router con route groups: `(auth)/`, `(owner)/`, `(tenant)/`, más `chat/[contractId]`, `notifications`, `index`.
  - Owner top-level: index (dashboard), properties (`[id]`), payments, claims, chat, ai-chat, calendar, settings. **Ojo:** contrato, ajustes, fotos y documentos del owner viven **dentro** de `properties/[id]` (tabs en `src/components/property-detail/`), no como rutas propias.
  - Tenant: index, contract, payments, expensas, claims, chat, ai-chat, settings.
- `src/`: `components/` (incl. `property-detail/`, `owner-claims/`, `owner-payments/`), `lib/` (`api.ts`, `dates.ts`, `pushNotifications.ts`, `claimStatus.ts`, `widgetSync.ts`), `store/`, `styles/`, `storage.ts`.

## Shared (`shared/src/`)

`types.ts` (tipos cross-app), `lib/` (`api.ts`, `format.ts`, `validations.ts` — con tests), `store/createAuthStore.ts` (factory de auth store usada por web y mobile). **Si un cambio cruza apps (tipos, validación, formato, auth), va acá**, no duplicado.

## i18n — Internacionalización (ES/EN)

### Frontend + Mobile (shared i18n)

Usan **i18next + react-i18next** a través de `@rently/shared`.
**Todas las claves de traducción viven en `shared/src/i18n/locales/{es,en}/`** (18 namespaces: `common`, `properties`, `contracts`, `payments`, `claims`, etc.). **No duplicar keys en frontend ni mobile.**

```tsx
'use client';
import { useTranslation } from 'react-i18next';

function Component() {
  const { t } = useTranslation('properties'); // namespace = filename sin .json
  return <button>{t('contract.importPdf')}</button>;
  // cross-namespace: t('common:close')
  // interpolación:   t('importSuccessWithTenant', { confidence: 85, name: 'Juan' })
}
```

- Namespace default: `common`. Siempre especificar namespace salvo para keys de `common`.
- La instancia i18n se inyecta via `<I18nextProvider>` en `ClientRoot.tsx` (`frontend/src/lib/i18n.ts`).
- Language switch: Settings → `localeStore` → `i18n.changeLanguage()` → React re-render automático.
- Zod en frontend/mobile comparte los schemas de `shared/src/i18n/validations.ts`, que ya usan keys de `zod.json`.
- **No hardcodees español en JSX/strings.** Siempre usar `t('namespace:key')` o `t('key')` si estás en el namespace correcto.

### Backend (standalone i18n)

El backend **no importa `@rently/shared`** (compila aislado para Railway). Tiene sus propios diccionarios en `backend/src/i18n/locales/{es,en}/`:

| Archivo | Contenido |
|---------|-----------|
| `errors.json` | Mensajes de error de negocio (usados por `AppError`) |
| `notify.json` | Subjects de email y notificaciones in-app/push |
| `zod.json` | Validaciones Zod (usado por `zodErrorMap.ts`) |

**Cómo agregar un error nuevo:**

1. Agregar la clave en `backend/src/i18n/locales/es/errors.json` (estructura anidada, ej: `"contractImport": { "fileRequired": "..." }`)
2. Agregar la misma clave en `en/errors.json`
3. En el código, lanzar `throw new AppError('contractImport.fileRequired', 400)` — el `errorHandler` traduce automáticamente con `req.t()`
4. Para emails/notificaciones, usar `req.t('notify:subject.key')` o `t` del helper `languageOf(user)`.

**Middlewares clave:**
- `i18n.ts` — resuelve `Accept-Language`, adjunta `req.language` y `req.t`
- `authenticate.ts` — extrae userId del JWT (req.language viene de i18n.ts vía Accept-Language)
- `validateBody.ts` — pasa Zod error map traducido a `safeParse`
- `errorHandler.ts` — traduce `err.i18nKey` con `req.t()` antes de responder

**Verificación:**
- `npm run check:i18n` — chequea paridad ES/EN y que toda clave AppError usada exista en los diccionarios
- `spec/i18n-key-parity.spec.mjs` — test Jasmine que verifica paridad ES/EN de todos los namespaces

### Reglas generales

- **Texto visible al usuario** (UI, errores, notificaciones, emails) → siempre traducido, nunca hardcodeado.
- **Claves nuevas en shared** cuando el texto aparece en frontend/mobile; **claves nuevas en backend** cuando el texto lo emite el backend (errores API, emails, notificaciones).
- Backend emite códigos de error (`errors:` + key), traducidos por errorHandler antes de responder.
  Excepción: dashboard notifications llevan `message` traducido (computado on-the-fly con `t()`).
  Datos crudos (tipos, estados, montos) se emiten sin traducir; el frontend los traduce si necesita.
- `domain.json` en shared tiene etiquetas de dominio (tipos de propiedad, estados de reclamo). No existe en backend — el backend emite códigos crudos.

## Env (`.env`)

`DATABASE_URL`, `JWT_SECRET` / `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN`, `GROQ_API_KEY` (ai-chat), `RESEND_API_KEY` / `SMTP_FROM` (emails, ver [EMAIL_SETUP.md](EMAIL_SETUP.md)), `APP_URL`, `API_URL`, `NODE_ENV`, `PORT`. No commitear secretos. Verificar que Prisma apunte a la DB correcta antes de un reset/seed.
</content>
