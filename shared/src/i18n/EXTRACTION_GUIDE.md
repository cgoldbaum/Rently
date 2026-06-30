# Guía de extracción de strings i18n (Rently)

Estás traduciendo texto hardcodeado (español) a i18n con **i18next + react-i18next**, en web (Next.js) y mobile (React Native/Expo). La infraestructura YA existe. Seguí esta guía al pie de la letra.

## Cómo funciona
- En cada componente: `import { useTranslation } from 'react-i18next';` y dentro: `const { t } = useTranslation('<namespace>');`.
- Reemplazá CADA string visible al usuario por `t('clave')`. Texto de otro namespace: `t('otroNs:clave')`.
- Interpolación: `t('clave', { count, name })` con `{{count}}`/`{{name}}` en el JSON.
- Los diccionarios viven en `shared/src/i18n/locales/es/<namespace>.json` y `.../en/<namespace>.json`.

## Reglas DURAS
1. **NO toques `shared/src/i18n/resources.ts`** — lo registra otra persona. Solo creá/editá los JSON de tu(s) namespace(s) asignado(s).
2. **NO toques** archivos fuera de tu lista asignada.
3. Para CADA clave nueva, agregá la entrada en **ES y EN** (ambos archivos), con EXACTAMENTE las mismas claves (el test de paridad falla si no).
4. Reusá namespaces existentes en vez de duplicar:
   - `common`: loading, save, cancel, delete, edit, close, confirm, back, retry, search, error, required, yes, no.
   - `domain`: `propertyType.{APARTMENT,HOUSE,COMMERCIAL,PH,GARAGE,DUPLEX}`, `paymentStatus.{PENDING,PAID,LATE,PENDING_CONFIRMATION}`, `claimStatus.{OPEN,IN_PROGRESS,RESOLVED}`, `claimPriority.{HIGH,MEDIUM,LOW}`, `claimCategory.{PLUMBING,ELECTRICITY,STRUCTURE,OTHER}`, `notification.{paymentReceived,paymentLate,newClaim,adjustmentApplied,contractExpiry}`.
   - Mensajes de validación de formularios (Zod) YA se traducen solos — no toques los schemas ni `getFieldErrors`.
5. **Label-maps locales** (objetos tipo `{ OPEN: { label:'Abierto', color:'#..', bg:'#..' } }`): NO traduzcas el archivo de constantes. En el componente, mantené `color`/`bg` del map y reemplazá el `label` por `t('domain:claimStatus.OPEN')` (o el dominio que corresponda).
6. NO traduzcas: claves de objetos, nombres de variables, `console.log`, rutas, claves de analytics, valores de enums que van al backend (OWNER/TENANT/PENDING/etc.), `aria` solo si es texto visible.
7. Mantené el código compilando: no rompas tipos. Si un componente NO tiene texto visible (ej. `ui/button.tsx`), dejalo igual.

## Convención de claves
- Namespace por feature (te asignan cuál). Subobjetos por sección: `t('payments.filters.all')`, `t('payments.modal.title')`.
- camelCase para claves. Nada de espacios.

## Glosario canónico ES → EN (respetar SIEMPRE)
- Propiedad → Property · Inquilino → Tenant · Propietario → Owner · Contrato → Contract
- Pago/Cobro → Payment · Reclamo → Claim · Ajuste → Adjustment · Expensas → Expenses
- Vencimiento → Due date · En mora → Overdue · Período → Period · Monto → Amount
- Superficie → Area · Antigüedad → Age · Índice de ajuste → Adjustment index
- Suscripción → Subscription · Recibo/Comprobante → Receipt · Mensaje → Message
- Notificación → Notification · Foto → Photo · Carpeta → Folder · Etiqueta → Tag
- Portal → Portal · Profesionales → Professionals · Desempeño/Rendimiento → Performance
- Día de pago → Payment day · Transferencia → Transfer · Efectivo → Cash · Cuotas → Installments
- Guardar → Save · Cancelar → Cancel · Eliminar → Delete · Editar → Edit · Cerrar → Close
- Agregar → Add · Crear → Create · Buscar → Search · Cargando → Loading · Próximos → Upcoming
- Dirección → Address · Departamento → Apartment · Casa → House · Cochera → Garage

Tono: ES usa voseo (vos/ingresá/elegí), como el resto de la app. EN neutro/US.

## Archivo de ejemplo (patrón ya aplicado)
Mirá `frontend/src/app/(dashboard)/settings/SettingsClient.tsx` y `frontend/src/app/(auth)/login/page.tsx`: ya están migrados y muestran el patrón exacto (hook, t(), placeholders, toasts, interpolación, uso de `domain:`).

## Al terminar, reportá:
- Lista de namespaces que creaste/editaste (nombres de archivo).
- Lista de archivos de componentes que editaste.
- Cualquier string ambiguo donde dudaste la traducción.
