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
make kill       # libera puertos

cd backend  && npm test                 # specs Jasmine  (spec/*.spec.mjs)
cd frontend && npm test | test:coverage # Jest + Testing Library (src/__tests__/*.test.tsx)
cd frontend && npm run lint             # ESLint
cd mobile   && npm start | android | ios | web   # Expo
```

## Backend (`backend/src/`)

**Punto de entrada:** [index.ts](backend/src/index.ts) — monta routers, sirve `/uploads` estático, arranca los jobs.

**Anatomía de un módulo** (`modules/<nombre>/`): siempre el mismo patrón →
`*.router.ts` (rutas + middleware) → `*.controller.ts` (req/res, sin lógica) → `*.service.ts` (lógica + Prisma) → `*.schema.ts` (validación Zod).
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
| `/payments`, `/contracts/:contractId/payments` | `payments` (+ cuotas via `inspections` router) |
| `/adjustments`, `/contracts/:contractId/adjustments` | `adjustments` |
| `/tenant/*` | `tenant` (portal del inquilino logueado) |
| `/owner/notifications`, `/owner/reports`, `/owner/subscription` | `notifications`, `reports`, `subscriptions` |
| `/inspections` | `inspections` |
| `/claims/:id/notes` | `claim-notes` (los claims se manejan dentro de properties/tenant) |
| `/chat`, `/ai-chat` | `chat` (owner↔tenant), `ai-chat` (LLM, Groq llama-3.3-70b) |
| `/webhooks/mercadopago` | `webhooks` |

**Infra compartida:**
- `lib/`: `prisma.ts` (cliente), `AppError.ts` (errores unificados, usar este), `email.ts` (Resend/SMTP), `notify.ts` (notificaciones in-app), `pushNotifications.ts` (Expo push), `indexFetcher.ts` (IPC/ICL), `multer.ts` (uploads), `helpers.ts`, `pdf/` (reportes y descripción de propiedad).
- `middleware/`: `authenticate` (JWT), `ownsProperty`, `requireTenant`, `validateBody` (Zod), `errorHandler`.
- `jobs/` (cron arrancados en index.ts): `adjustmentAlerts`, `autoAdjustment`, `contractRenewalAlerts`, `scheduledReports`, `subscriptionExpiration`.
- Prisma: [schema.prisma](backend/prisma/schema.prisma), migrations en `backend/prisma/migrations/`, seed en [seed.ts](backend/prisma/seed.ts).

## Frontend web (`frontend/src/`)

- `app/` — App Router con **route groups** por audiencia:
  - `(auth)/` → login, register, reset-password
  - `(dashboard)/` → vistas del **owner**: properties (`[id]` con tabs y modals, `new`), payments, adjustments, claims, photos, reports, performance, professionals, ai-chat, chat, settings
  - `(tenant)/tenant/` → vistas del **inquilino**: contract, payments, expensas, claims, photos, ai-chat, chat, settings
  - `public/` → portal público por token (`portal/[token]`), demo de Mercado Pago
- `components/` — UI reutilizable (`ui/` = primitivos), vistas compartidas (`AiChatView`, `ChatView`, `Modal`, badges, `NotificationDropdown`...).
- `lib/`: `api.ts` (axios + fallback de baseURL), `constants.ts`, `utils.ts`, `validations.ts`.
- `store/`: Zustand (`auth.ts`, `toast.ts`).
- Tests en `__tests__/`.

## Mobile (`mobile/`)

- `app/` — Expo Router con route groups: `(auth)/`, `(owner)/`, `(tenant)/`, más `chat/[contractId]`, `notifications`, `index`.
  - Owner top-level: index (dashboard), properties (`[id]`), payments, claims, chat, ai-chat, calendar, settings. **Ojo:** contrato, ajustes, fotos y documentos del owner viven **dentro** de `properties/[id]` (tabs en `src/components/property-detail/`), no como rutas propias.
  - Tenant: index, contract, payments, expensas, claims, chat, ai-chat, settings.
- `src/`: `components/` (incl. `property-detail/`, `owner-claims/`, `owner-payments/`), `lib/` (`api.ts`, `dates.ts`, `pushNotifications.ts`, `claimStatus.ts`, `widgetSync.ts`), `store/`, `styles/`, `storage.ts`.

## Shared (`shared/src/`)

`types.ts` (tipos cross-app), `lib/` (`api.ts`, `format.ts`, `validations.ts` — con tests), `store/createAuthStore.ts` (factory de auth store usada por web y mobile). **Si un cambio cruza apps (tipos, validación, formato, auth), va acá**, no duplicado.

## Convenciones

- TypeScript en todo. Indentación de 2 espacios, comillas simples donde ya se usan; archivos React/Next sin punto y coma.
- Componentes/pantallas en `PascalCase`; hooks/stores/helpers en `camelCase`; rutas según convención de Next.js / Expo Router.
- Preferir schemas Zod y tipos de `shared/src` cuando el comportamiento cruza apps.
- Errores de backend: usar `AppError` (`lib/AppError.ts`); los controllers no llevan lógica.
- Commits: Conventional Commits cortos (`feat:`, `fix:`, `chore:`), imperativos, un cambio por commit.
- Tests: agregar cobertura cerca de lo que se toca al cambiar validación, API, auth, pagos, contratos o estados visibles de UI. Correr el test del paquete afectado antes del PR.

## Env (`.env`)

`DATABASE_URL`, `JWT_SECRET` / `JWT_EXPIRES_IN`, `REFRESH_TOKEN_SECRET` / `REFRESH_TOKEN_EXPIRES_IN`, `GROQ_API_KEY` (ai-chat), `RESEND_API_KEY` / `SMTP_FROM` (emails, ver [EMAIL_SETUP.md](EMAIL_SETUP.md)), `APP_URL`, `API_URL`, `NODE_ENV`, `PORT`. No commitear secretos. Verificar que Prisma apunte a la DB correcta antes de un reset/seed.
</content>
