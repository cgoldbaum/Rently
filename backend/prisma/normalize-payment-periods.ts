/**
 * Normaliza `Payment.period` al formato canónico `YYYY-MM` y deduplica de forma
 * CONSERVADORA los cobros que quedaron cargados con períodos en texto
 * ("junio de 2026") y en ISO ("2026-06") para el mismo contrato+mes.
 *
 * Contexto: el scheduler, el seed y el registro de pago del inquilino escribían
 * `period` en español, mientras que la API manual / payment-links usan `YYYY-MM`.
 * Como el índice único `@@unique([contractId, period])` compara el STRING, los
 * dos formatos no colisionaban y se duplicaban cobros del mismo mes.
 *
 * Reglas (pensadas para una pantalla contable: NUNCA borrar a ciegas):
 *  - Texto sin colisión        → UPDATE a YYYY-MM.
 *  - Colisión, mismo monto+moneda, sin comprobante en los perdedores
 *                              → duplicado real: se conserva 1 y se borran los otros.
 *  - Colisión con monto/moneda distintos, o con comprobante en juego
 *                              → NO se toca: se reporta para REVISIÓN MANUAL.
 *  - Texto no parseable        → NO se toca: se reporta para REVISIÓN MANUAL.
 *
 * Uso:
 *   ts-node prisma/normalize-payment-periods.ts           # dry-run (no escribe)
 *   ts-node prisma/normalize-payment-periods.ts --apply   # aplica los cambios
 *
 * Es idempotente: tras aplicar, una segunda corrida no encuentra nada que migrar
 * (los casos de revisión manual permanecen hasta que se resuelvan a mano).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const ISO_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

const MONTHS: Record<string, number> = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12,
};

/** Convierte "junio de 2026" → "2026-06". Devuelve null si no se puede parsear. */
function textToIso(period: string): string | null {
  const m = period.trim().toLowerCase().match(/^(\p{L}+)\s+(?:de\s+)?(\d{4})$/u);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (!month) return null;
  return `${m[2]}-${String(month).padStart(2, '0')}`;
}

const STATUS_RANK: Record<string, number> = {
  PAID: 0, PENDING_CONFIRMATION: 1, PENDING: 2, LATE: 3,
};

type Pay = {
  id: string;
  contractId: string;
  period: string;
  amount: number;
  currency: string;
  status: string;
  paidDate: Date | null;
  method: string | null;
  createdAt: Date;
  hasReceipt: boolean;
};

/** Mejor candidato a sobrevivir un grupo de duplicados (menor = mejor). */
function survivorScore(p: Pay): [number, number, number, number, string] {
  return [
    STATUS_RANK[p.status] ?? 9,
    p.hasReceipt ? 0 : 1,
    p.paidDate ? 0 : 1,
    p.createdAt.getTime(),
    p.id,
  ];
}
function pickSurvivor(group: Pay[]): Pay {
  return [...group].sort((a, b) => {
    const sa = survivorScore(a);
    const sb = survivorScore(b);
    for (let i = 0; i < sa.length; i++) {
      if (sa[i] < sb[i]) return -1;
      if (sa[i] > sb[i]) return 1;
    }
    return 0;
  })[0];
}

async function main() {
  const apply = process.argv.includes('--apply');

  const raw = await prisma.payment.findMany({
    select: {
      id: true, contractId: true, period: true, amount: true, currency: true,
      status: true, paidDate: true, method: true, createdAt: true,
      cashReceipt: { select: { id: true } },
      mpReceipt: { select: { id: true } },
    },
  });

  const payments: Pay[] = raw.map((p) => ({
    id: p.id, contractId: p.contractId, period: p.period, amount: p.amount,
    currency: p.currency, status: p.status, paidDate: p.paidDate,
    method: p.method, createdAt: p.createdAt,
    hasReceipt: Boolean(p.cashReceipt || p.mpReceipt),
  }));

  // targetPeriod por pago: ISO se queda igual; texto se intenta convertir.
  const unparseable: Pay[] = [];
  const groups = new Map<string, { target: string; members: Pay[] }>();

  for (const p of payments) {
    let target: string | null;
    if (ISO_RE.test(p.period)) {
      target = p.period;
    } else {
      target = textToIso(p.period);
      if (!target) { unparseable.push(p); continue; }
    }
    const key = `${p.contractId}|${target}`;
    if (!groups.has(key)) groups.set(key, { target, members: [] });
    groups.get(key)!.members.push(p);
  }

  const toUpdate: { id: string; from: string; to: string }[] = [];
  const toDelete: { id: string; period: string; reason: string }[] = [];
  const review: { reason: string; key: string; members: Pay[] }[] = [];

  for (const [key, { target, members }] of groups) {
    const needsRename = members.filter((m) => m.period !== target);

    if (members.length === 1) {
      if (needsRename.length === 1) toUpdate.push({ id: members[0].id, from: members[0].period, to: target });
      continue;
    }

    // Colisión: más de un pago para el mismo contrato+mes canónico.
    const amounts = new Set(members.map((m) => m.amount));
    const currencies = new Set(members.map((m) => m.currency));

    if (amounts.size > 1 || currencies.size > 1) {
      review.push({ reason: 'Montos o monedas distintos — posibles cobros reales diferentes', key, members });
      continue;
    }

    // Mismo monto y moneda → duplicado real.
    const survivor = pickSurvivor(members);
    const losers = members.filter((m) => m.id !== survivor.id);
    if (losers.some((m) => m.hasReceipt)) {
      review.push({ reason: 'Un duplicado a borrar tiene comprobante asociado', key, members });
      continue;
    }

    for (const m of losers) {
      toDelete.push({ id: m.id, period: m.period, reason: `duplicado de ${survivor.id}` });
    }
    if (survivor.period !== target) toUpdate.push({ id: survivor.id, from: survivor.period, to: target });
  }

  // ── Reporte ────────────────────────────────────────────────────────────────
  console.log(`\n📋 Normalización de períodos de Payment  ${apply ? '(APPLY)' : '(DRY-RUN)'}`);
  console.log(`   Pagos analizados: ${payments.length}`);
  console.log(`   A renombrar a YYYY-MM: ${toUpdate.length}`);
  console.log(`   Duplicados a borrar:   ${toDelete.length}`);
  console.log(`   Para REVISIÓN MANUAL:  ${review.length + unparseable.length}`);

  if (toUpdate.length) {
    console.log('\n— Renombres —');
    for (const u of toUpdate) console.log(`   ${u.id}: "${u.from}" → "${u.to}"`);
  }
  if (toDelete.length) {
    console.log('\n— Borrados (duplicado exacto) —');
    for (const d of toDelete) console.log(`   ${d.id} ("${d.period}") — ${d.reason}`);
  }
  if (review.length) {
    console.log('\n⚠️  REVISIÓN MANUAL (no se tocan) —');
    for (const r of review) {
      console.log(`   [${r.key}] ${r.reason}`);
      for (const m of r.members) {
        console.log(`      · ${m.id}  period="${m.period}"  ${m.currency} ${m.amount}  ${m.status}${m.hasReceipt ? '  (con comprobante)' : ''}`);
      }
    }
  }
  if (unparseable.length) {
    console.log('\n⚠️  PERÍODO NO PARSEABLE (no se tocan) —');
    for (const p of unparseable) console.log(`   ${p.id}  period="${p.period}"  contrato=${p.contractId}`);
  }

  if (!apply) {
    console.log('\nDry-run: no se escribió nada. Volvé a correr con --apply para aplicar.\n');
    return;
  }

  // ── Aplicar: borrados primero, luego renombres, en una transacción ──────────
  await prisma.$transaction([
    ...toDelete.map((d) => prisma.payment.delete({ where: { id: d.id } })),
    ...toUpdate.map((u) => prisma.payment.update({ where: { id: u.id }, data: { period: u.to } })),
  ]);

  console.log(`\n✅ Aplicado: ${toDelete.length} borrados, ${toUpdate.length} renombrados.`);
  if (review.length + unparseable.length > 0) {
    console.log(`   Quedan ${review.length + unparseable.length} casos para resolver a mano.\n`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
